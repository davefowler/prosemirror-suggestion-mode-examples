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
                activeMarkRange: null // Will store {from, to, createdAt}
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

                    // Check if cursor is inside or adjacent to a delete mark
                    const $delPos = view.state.doc.resolve(delFrom)
                    const existingMark = $delPos.marks().find(m => m.type === view.state.schema.marks.suggestion_delete)
                    console.log('existing del Mark?', existingMark)
                    // Remove any existing suggestion marks in this range
                    tr.removeMark(
                        delFrom,
                        delTo,
                        view.state.schema.marks.suggestion_delete
                    )

                    // Apply the suggestion_delete mark
                    const deleteMark = existingMark || view.state.schema.marks.suggestion_delete.create({
                        createdAt: Date.now(),
                        username: state.username
                    })
                    tr.addMark(delFrom, delTo, deleteMark)

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
