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


            // Then handle the new text input
            tr.insertText(text, from, to)

            // Check if there's an existing suggestion_add mark right before this position
            let markFrom = from
            let existingAddMark = null
            
            if (from > 0) {
                const beforeMarks = view.state.doc.resolve(from - 1).marks()
                existingAddMark = beforeMarks.find(mark => 
                    mark.type.name === 'suggestion_add' &&
                    mark.attrs.username === this.getState(view.state).username
                )
                
                if (existingAddMark) {
                    // Find the start of the existing mark
                    let pos = from - 1
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

            const addMark = view.state.schema.marks.suggestion_add.create({
                createdAt: existingAddMark ? existingAddMark.attrs.createdAt : Date.now(),
                username: this.getState(view.state).username
            })
            tr.addMark(markFrom, from + text.length, addMark)
            
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
