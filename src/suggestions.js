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
                    // If no selection, delete one character
                    const delFrom = event.key === "Backspace" ? $from.pos - 1 : $from.pos
                    const delTo = event.key === "Backspace" ? $from.pos : $from.pos + 1
                    
                    if (delFrom < 0 || delTo > view.state.doc.content.size) return false
                    
                    tr.delete(delFrom, delTo)

                    // Update mark range
                    let markRange = state.activeMarkRange
                    if (markRange) {
                        if (event.key === "Backspace") {
                            markRange = {
                                ...markRange,
                                from: Math.min(markRange.from, delFrom),
                                to: Math.max(delFrom, markRange.to - 1)
                            }
                        } else {
                            markRange = {
                                ...markRange,
                                from: Math.min(markRange.from, delFrom),
                                to: Math.max(delTo, markRange.to - 1)
                            }
                        }

                        // Only keep mark if there's still content
                        if (markRange.from < markRange.to) {
                            tr.setMeta(suggestionsPlugin, {
                                activeMarkRange: markRange
                            })
                        } else {
                            tr.setMeta(suggestionsPlugin, {
                                activeMarkRange: null
                            })
                        }
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

            // Check if we should extend existing mark or create new one
            let markRange = state.activeMarkRange
            
            // If no active mark, or cursor is not at the end of current mark
            if (!markRange || from !== markRange.to) {
                console.log('starting new mark as cursor is not at the end of current mark or no active mark', markRange, from, to, text)
                // Start new mark
                markRange = {
                    from: from,
                    to: from + text.length,
                    createdAt: Date.now()
                }
            } else {
                console.log('extending existing mark', markRange, from, to, text)
                // Extend existing mark
                markRange = {
                    ...markRange,
                    to: from + text.length
                }
            }

            // Remove any existing suggestion marks in this range
            tr.removeMark(
                markRange.from,
                markRange.to,
                view.state.schema.marks.suggestion_add
            )

            // Apply a single suggestion mark for the entire range
            const addMark = view.state.schema.marks.suggestion_add.create({
                createdAt: markRange.createdAt,
                username: state.username
            })
            tr.addMark(markRange.from, markRange.to, addMark)

            // Update plugin state with new mark range - only set the activeMarkRange in meta
            tr.setMeta(suggestionsPlugin, {
                activeMarkRange: markRange
            })

            view.dispatch(tr)
            return true
        }
    }
})
