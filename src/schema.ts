import { Schema } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

// Define suggestion marks
export const suggestionMarks = {
  suggestion_add: {
    attrs: {
      createdAt: { default: null },
      username: { default: "Anonymous" },
      data: { default: null },
    },
    inclusive: true,
    parseDOM: [{ tag: "span[data-suggestion-add]" }],
    toDOM() {
      return [
        "span",
        {
          "data-suggestion-add": "true",
          class: "suggestion-add",
          style: "background-color: #e6ffe6;",
        },
        0,
      ] as any;
    },
  },
  suggestion_delete: {
    attrs: {
      createdAt: { default: null },
      hiddenText: { default: "" },
      username: { default: "Anonymous" },
      data: { default: null },
    },
    inclusive: true,
    parseDOM: [{ tag: "span[data-suggestion-delete]" }],
    toDOM(node) {
      return [
        "span",
        {
          "data-suggestion-delete": "true",
          class: "suggestion-delete",
          "data-hidden-text": node.attrs.hiddenText,
        },
        0,
      ] as any;
    },
  },
};

// Mix the nodes from prosemirror-schema-list into the basic schema to
// support lists and paragraphs
export const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
  marks: Object.assign({}, schema.spec.marks, {
    suggestion_add: suggestionMarks.suggestion_add,
    suggestion_delete: suggestionMarks.suggestion_delete,
  }),
});
