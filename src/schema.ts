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
export const addSuggestionMarks = (marks: Schema["spec"]["marks"]): Record<string, any> => {
  // Create a new object to store our marks
  const result: Record<string, any> = {};
  
  // If marks has a forEach method (like OrderedMap), use it to build our object
  if (typeof marks.forEach === 'function') {
    marks.forEach((key: string, value: any) => {
      result[key] = value;
    });
  } else {
    // Otherwise, assume it can be treated as a regular object
    Object.assign(result, marks);
  }
  
  // Add our suggestion marks
  result.suggestion_add = suggestionMarks.suggestion_add;
  result.suggestion_delete = suggestionMarks.suggestion_delete;
  
  return result;
}

// Here's how to add the marks to your schema
// import { schema } from "prosemirror-schema-basic";
// import { addListNodes } from "prosemirror-schema-list";

// export const exampleSchema = new Schema({
//   nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
//   marks: addSuggestionMarks(schema.spec.marks),
// });
