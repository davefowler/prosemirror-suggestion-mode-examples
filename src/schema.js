import {Schema} from "prosemirror-model"

// Define suggestion marks
const suggestion_add = {
    attrs: {createdAt: {default: null}},
    parseDOM: [{tag: "span[data-suggestion-add]"}],
    toDOM() {
        return ["span", {
            "data-suggestion-add": "false",
            "class": "suggestion-add"
        }, 0]
    }
}

const suggestion_delete = {
    attrs: {
        createdAt: {default: null},
        hiddenText: {default: ""}
    },
    parseDOM: [{tag: "span[data-suggestion-delete]"}],
    toDOM(node) {
        return ["span", {
            "data-suggestion-delete": "false",
            "class": "suggestion-delete",
            "data-hidden-text": node.attrs.hiddenText
        }, 0]
    }
}

// Create the schema
export const schema = new Schema({
    nodes: {
        doc: {content: "block+"},
        paragraph: {
            group: "block",
            content: "inline*",
            parseDOM: [{tag: "p"}],
            toDOM() { return ["p", 0] }
        },
        text: {group: "inline"}
    },
    marks: {
        suggestion_add,
        suggestion_delete
    }
})
