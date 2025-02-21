import {Plugin, PluginKey} from "prosemirror-state"

// Plugin key for accessing the plugin state
export const suggestionsPluginKey = new PluginKey("suggestions")

// Create the suggestions plugin
export const suggestionsPlugin = new Plugin({
    key: suggestionsPluginKey,

    state: {
        init() {
            return {
                suggestionMode: true,
                username: 'Anonymous',
                activeMarkRange: null, // Will store {from, to, createdAt}
                showDeletedText: false // New setting to control deletion display
            }
        },
        
        apply(tr, value) {
            const meta = tr.getMeta(suggestionsPlugin)
            if (meta) {
                // Handle all meta updates, not just suggestionMode
                return {
                    ...value,
                    ...meta
                }
            }
            
            // Update mark positions based on document changes
            if (tr.docChanged && value.activeMarkRange) {
                return {
                    ...value,
                    activeMarkRange: {
                        from: tr.mapping.map(value.activeMarkRange.from),
                        to: tr.mapping.map(value.activeMarkRange.to),
                        createdAt: value.activeMarkRange.createdAt
                    }
                }
            }
            return value
        }
    },

    props: {
        handleKeyDown(view, event) {
            const state = this.getState(view.state)
            if (!state.suggestionMode) return false

            // Handle delete and backspace
            if (event.key === "Delete" || event.key === "Backspace") {
                const tr = view.state.tr
                const {$from, $to} = view.state.selection
                
                if ($from.pos === $to.pos) {
                    const delFrom = event.key === "Backspace" ? $from.pos - 1 : $from.pos
                    const delTo = event.key === "Backspace" ? $from.pos : $from.pos + 1
                    
                    if (delFrom < 0 || delTo > view.state.doc.content.size) return false

                    // Resolve the position just behind the cursor for backspace
                    const $delPos = view.state.doc.resolve(delTo)
                    const node = $delPos.nodeAfter;
                    const marks = node ? node.marks : [];
                    const existingMark = marks.find(m => m.type === view.state.schema.marks.suggestion_delete);
                    
                    // Additional debugging output
                    console.log('Marks at position', $delPos.pos, ':', marks);
                    console.log('Existing suggestion_delete mark:', existingMark);
                    console.log('the letter at position', $delPos.pos, 'is', node ? node.text : 'N/A', node ? node.type : 'N/A');
                    
                    if (existingMark) {
                        console.log('existing mark found', existingMark)
                        // Expand the existing mark
                        tr.removeMark(
                            existingMark.attrs.from,
                            existingMark.attrs.to,
                            view.state.schema.marks.suggestion_delete
                        )
                        console.log('removed mark from', existingMark.attrs.from, 'to', existingMark.attrs.to)

                        const newFrom = Math.min(existingMark.attrs.from, delFrom)
                        const newTo = Math.max(existingMark.attrs.to, delTo)
                        tr.addMark(
                            newFrom,
                            newTo,
                            view.state.schema.marks.suggestion_delete.create({
                                createdAt: existingMark.attrs.createdAt,
                                username: state.username
                            })
                        )
                        console.log('extended mark to', newFrom, newTo)
                    } else {
                        // Apply a new suggestion_delete mark
                        const deleteMark = view.state.schema.marks.suggestion_delete.create({
                            createdAt: Date.now(),
                            username: state.username
                        })
                        console.log('adding new mark from', delFrom, 'to', delTo)
                        tr.addMark(delFrom, delTo, deleteMark)
                    }

                    // Move cursor appropriately
                    if (event.key === "Backspace") {
                        tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(delFrom)))
                    } else {
                        tr.setSelection(view.state.selection.constructor.near(tr.doc.resolve(delTo)))
                    }

                    view.dispatch(tr)
                    return true
                }
            }
            return false
        },

        handleTextInput(view, from, to, text) {
            const state = this.getState(view.state)
            if (!state.suggestionMode) return false

            const tr = view.state.tr
            tr.insertText(text, from, to)

            // Check if cursor is inside or adjacent to an add mark
            const $from = view.state.doc.resolve(from)
            const existingMark = $from.marks().find(m => m.type === view.state.schema.marks.suggestion_add)

            // Remove any existing suggestion marks in this range
            tr.removeMark(
                from,
                from + text.length,
                view.state.schema.marks.suggestion_add
            )

            // Apply the suggestion mark
            const addMark = existingMark || view.state.schema.marks.suggestion_add.create({
                createdAt: Date.now(),
                username: state.username
            })
            tr.addMark(from, from + text.length, addMark)

            view.dispatch(tr)
            return true
        }
    }
})
