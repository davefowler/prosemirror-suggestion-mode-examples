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
                activeMarkFrom: null,
                activeMarkTo: null,
                activeMarkCreatedAt: null
            }
        },
        
        apply(tr, value) {
            const meta = tr.getMeta(suggestionsPlugin)
            if (meta && meta.hasOwnProperty('suggestionMode')) {
                return {
                    ...value,
                    suggestionMode: meta.suggestionMode,
                    activeMarkFrom: null,
                    activeMarkTo: null,
                    activeMarkCreatedAt: null
                }
            }
            
            // Update mark positions based on document changes
            if (tr.docChanged && value.activeMarkFrom !== null) {
                return {
                    ...value,
                    activeMarkFrom: tr.mapping.map(value.activeMarkFrom),
                    activeMarkTo: tr.mapping.map(value.activeMarkTo)
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


            const pluginState = this.getState(view.state)
            
            // Insert the text
            tr.insertText(text, from, to)
            
            let markFrom, markTo, createdAt
            
            if (pluginState.activeMarkFrom === null) {
                // Start a new mark
                markFrom = from
                markTo = from + text.length
                createdAt = Date.now()
                
                // Store the new mark position
                tr.setMeta(suggestionsPlugin, {
                    ...pluginState,
                    activeMarkFrom: markFrom,
                    activeMarkTo: markTo,
                    activeMarkCreatedAt: createdAt
                })
            } else {
                // Extend existing mark
                markFrom = pluginState.activeMarkFrom
                markTo = from + text.length
                createdAt = pluginState.activeMarkCreatedAt
                
                // Update the mark position
                tr.setMeta(suggestionsPlugin, {
                    ...pluginState,
                    activeMarkTo: markTo
                })
            }
            
            const addMark = view.state.schema.marks.suggestion_add.create({
                createdAt: createdAt,
                username: pluginState.username
            })
            
            // Apply or extend the mark
            tr.addMark(markFrom, markTo, addMark)
            
            console.log('Suggestion addition:', {
                text,
                markFrom,
                markTo,
                createdAt
            })
            
            view.dispatch(tr)
            return true
        }
    }
})
