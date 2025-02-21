import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {Schema, DOMParser} from "prosemirror-model"
import {schema} from "./schema"
import {suggestionsPlugin} from "./suggestions"

// Initialize the editor with the suggestions plugin
window.addEventListener("load", () => {
    // Create the initial editor state
    const state = EditorState.create({
        schema,
        plugins: [suggestionsPlugin]
    })

    // Create the editor view
    const view = new EditorView(document.querySelector("#editor"), {
        state,
        dispatchTransaction(transaction) {
            let newState = view.state.apply(transaction)
            view.updateState(newState)
        }
    })
})
