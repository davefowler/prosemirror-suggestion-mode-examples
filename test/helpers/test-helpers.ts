import { EditorState, Plugin, Selection, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser } from "prosemirror-model";
import { suggestionsPlugin } from "../../src/suggestions";
import { suggestionsPluginKey } from "../../src/key";

// Define a basic schema for testing
export const testSchema = new Schema({
  nodes: {
    doc: {
      content: "paragraph+"
    },
    paragraph: {
      content: "text*",
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }]
    },
    text: {
      group: "inline"
    }
  },
  marks: {
    suggestion_add: {
      attrs: { username: { default: "" }, createdAt: { default: 0 }, data: { default: null } },
      toDOM() { return ["span", { class: "suggestion-add" }, 0]; },
      parseDOM: [{ tag: "span.suggestion-add" }]
    },
    suggestion_delete: {
      attrs: { username: { default: "" }, createdAt: { default: 0 }, data: { default: null } },
      toDOM() { return ["span", { class: "suggestion-delete" }, 0]; },
      parseDOM: [{ tag: "span.suggestion-delete" }]
    }
  }
});

// Helper to create an editor state with our plugin
export function createEditorState(doc: string, plugins: Plugin[] = []) {
  const element = document.createElement("div");
  element.innerHTML = doc;
  
  return EditorState.create({
    doc: DOMParser.fromSchema(testSchema).parse(element),
    plugins: [suggestionsPlugin, ...plugins]
  });
}

// Helper to create an editor view
export function createEditorView(state: EditorState) {
  const element = document.createElement("div");
  return new EditorView(element, { state });
}

// Helper to set cursor position
export function setCursor(view: EditorView, pos: number) {
  const tr = view.state.tr.setSelection(
    TextSelection.create(view.state.doc, pos)
  );
  view.dispatch(tr);
  return view;
}

// Helper to insert text at current cursor position
export function insertText(view: EditorView, text: string) {
  const tr = view.state.tr.insertText(text);
  view.dispatch(tr);
  return view;
}

// Helper to delete text between positions
export function deleteText(view: EditorView, from: number, to: number) {
  const tr = view.state.tr.delete(from, to);
  view.dispatch(tr);
  return view;
}

// Setup DOM environment for tests
export function setupDOMEnvironment() {
  if (typeof document === 'undefined') {
    (global as any).document = {
      createElement: jest.fn().mockImplementation((tag) => {
        return {
          innerHTML: '',
          appendChild: jest.fn(),
          classList: {
            add: jest.fn()
          },
          addEventListener: jest.fn(),
          setAttribute: jest.fn(),
          style: {}
        };
      }),
      createTextNode: jest.fn().mockImplementation((text) => ({ textContent: text }))
    };
  }
}
