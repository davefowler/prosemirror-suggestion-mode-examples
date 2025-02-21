import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Schema, DOMParser } from "prosemirror-model"
import { schema } from "prosemirror-schema-basic"
import { addListNodes } from "prosemirror-schema-list"
import { baseKeymap } from "prosemirror-commands"
import { keymap } from "prosemirror-keymap"
import { history } from "prosemirror-history"
import { suggestionsPlugin, suggestionsPluginKey } from "./suggestions"

// Mix the nodes from prosemirror-schema-list into the basic schema to
// support lists and paragraphs
const mySchema = new Schema({
    nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
    marks: schema.spec.marks
})

// Initialize the editor with the suggestions plugin
window.addEventListener("load", () => {
    // Create the initial editor state
    const state = EditorState.create({
        schema: mySchema,
        plugins: [
            history(),
            keymap(baseKeymap),
            suggestionsPlugin
        ]
    })

    // Create the editor view
    window.view = new EditorView(document.querySelector("#editor"), {
        state,
        dispatchTransaction(transaction) {
            let newState = view.state.apply(transaction)
            view.updateState(newState)
            
            // Update the mode indicator when suggestion mode changes
            const suggestionState = suggestionsPluginKey.getState(newState)
            const modeIndicator = document.querySelector("#modeIndicator")
            modeIndicator.textContent = suggestionState.suggestionMode ? 
                "(Suggestion Mode ON)" : 
                "(Suggestion Mode OFF)"
            
            const toggleButton = document.querySelector("#toggleSuggestionMode")
            toggleButton.style.backgroundColor = suggestionState.suggestionMode ? 
                "#e6ffe6" : 
                "#fff"
        }
    })

    // Add event listener for the toggle button
    document.querySelector("#toggleSuggestionMode").addEventListener("click", () => {
        const state = suggestionsPluginKey.getState(view.state)
        view.dispatch(view.state.tr.setMeta(suggestionsPlugin, {
            suggestionMode: !state.suggestionMode
        }))
    })
})
