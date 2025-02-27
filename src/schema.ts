import { Schema } from "prosemirror-model";

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
        },
        0,
      ] as any;
    },
  },
  suggestion_delete: {
    attrs: {
      createdAt: { default: null },
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
        },
        0,
      ] as any;
    },
  },
};

// Helper function to add suggestion marks to an existing schema
export function addSuggestionMarks(marks: Schema["spec"]["marks"]) {
  return Object.assign({}, marks, {
    suggestion_add: suggestionMarks.suggestion_add,
    suggestion_delete: suggestionMarks.suggestion_delete,
  });
}

// Only for demonstration purposes - users should create their own schema
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

export const exampleSchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
  marks: addSuggestionMarks(schema.spec.marks),
});
