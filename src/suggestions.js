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


            // Insert the text and create a new mark for just this insertion
            tr.insertText(text, from, to)

            const addMark = view.state.schema.marks.suggestion_add.create({
                createdAt: Date.now(),
                username: this.getState(view.state).username
            })
            
            // Apply mark only to the newly inserted text
            tr.addMark(from, from + text.length, addMark)
            
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
