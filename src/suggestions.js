import {Plugin, PluginKey} from "prosemirror-state"

// Plugin key for accessing the plugin state
export const suggestionsPluginKey = new PluginKey("suggestions")

// Create the suggestions plugin
export const suggestionsPlugin = new Plugin({
    key: suggestionsPluginKey,

    state: {
        init() {
            return {
                suggestionMode: false
            }
        },
        
        apply(tr, value) {
            // Handle suggestion mode changes here
            return value
        }
    },

    props: {
        // Add plugin props here
    }
})
