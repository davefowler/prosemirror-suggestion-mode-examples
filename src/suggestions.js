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
                username: 'Anonymous'
            }
        },
        
        apply(tr, value) {
            const meta = tr.getMeta(suggestionsPlugin)
            if (meta && meta.hasOwnProperty('suggestionMode')) {
                return {
                    suggestionMode: meta.suggestionMode
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


            // Insert the new text first
            tr.insertText(text, from, to)

            // Find if there's an immediately adjacent suggestion_add mark
            let markFrom = from
            let markTo = from + text.length
            let existingCreatedAt = Date.now()
            
            if (from > 0) {
                const beforePos = from - 1
                const beforeMarks = view.state.doc.resolve(beforePos).marks()
                const existingAddMark = beforeMarks.find(mark => 
                    mark.type.name === 'suggestion_add' &&
                    mark.attrs.username === this.getState(view.state).username
                )
                
                // Only extend the mark if we're immediately adjacent to it
                if (existingAddMark) {
                    const beforeText = view.state.doc.textBetween(beforePos, from)
                    if (beforeText.length === 1) { // We're directly next to the mark
                        existingCreatedAt = existingAddMark.attrs.createdAt
                        // Find the start of the existing mark
                        let pos = beforePos
                        while (pos > 0) {
                            const marks = view.state.doc.resolve(pos - 1).marks()
                            const hasSameMark = marks.some(m => 
                                m.type.name === 'suggestion_add' &&
                                m.attrs.username === existingAddMark.attrs.username
                            )
                            if (!hasSameMark) break
                            pos--
                        }
                        markFrom = pos
                    }
                }
            }

            // Apply the suggestion mark only to the new text
            const addMark = view.state.schema.marks.suggestion_add.create({
                createdAt: existingCreatedAt,
                username: this.getState(view.state).username
            })
            tr.addMark(markFrom, markTo, addMark)
            
            console.log('Suggestion addition:', {
                text,
                from: markFrom,
                to: from + text.length
            })
            
            view.dispatch(tr)
            return true
        }
    }
})
