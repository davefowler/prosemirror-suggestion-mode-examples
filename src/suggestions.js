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
            if (meta && meta.hasOwnProperty('suggestionMode')) {
                return {
                    ...value,
                    suggestionMode: meta.suggestionMode,
                    activeMarkRange: null
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
        handleTextInput(view, from, to, text) {
            const state = this.getState(view.state)
            if (!state.suggestionMode) return false

            const tr = view.state.tr
            tr.insertText(text, from, to)

            // Check if we should extend existing mark or create new one
            let markRange = state.activeMarkRange
            
            // If no active mark, or cursor is not at the end of current mark
            if (!markRange || from !== markRange.to) {
                // Start new mark
                markRange = {
                    from: from,
                    to: from + text.length,
                    createdAt: Date.now()
                }
            } else {
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

            // Update plugin state with new mark range
            tr.setMeta(suggestionsPlugin, {
                ...state,
                activeMarkRange: markRange
            })

            view.dispatch(tr)
            return true
        }
    }
})
