import { EditorState, Plugin, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser } from 'prosemirror-model';
import { suggestionModePlugin } from '../../src/plugin';

// Define a basic schema for testing
export const testSchema = new Schema({
  nodes: {
    doc: {
      content: 'paragraph+',
    },
    paragraph: {
      content: 'text*',
      toDOM() {
        return ['p', 0];
      },
      parseDOM: [{ tag: 'p' }],
    },
    text: {
      group: 'inline',
    },
  },
  marks: {
    suggestion_add: {
      attrs: {
        username: { default: '' },
        data: { default: null },
      },
      toDOM() {
        return ['span', { class: 'suggestion-add' }, 0];
      },
      parseDOM: [{ tag: 'span.suggestion-add' }],
    },
    suggestion_delete: {
      attrs: {
        username: { default: '' },
        data: { default: null },
      },
      toDOM() {
        return ['span', { class: 'suggestion-delete' }, 0];
      },
      parseDOM: [{ tag: 'span.suggestion-delete' }],
    },
  },
});

// Helper to create an editor state with our plugin
export function createEditorState(doc: string, plugins: Plugin[] = []) {
  const element = document.createElement('div');
  element.innerHTML = doc;

  return EditorState.create({
    doc: DOMParser.fromSchema(testSchema).parse(element),
    plugins: [
      suggestionModePlugin({ username: 'test', inSuggestionMode: true }),
      ...plugins,
    ],
  });
}

// Helper to create an editor view
export function createEditorView(state: EditorState) {
  const element = document.createElement('div');
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

  // Give time for the appendTransaction to run
  return new Promise<EditorView>((resolve) => {
    setTimeout(() => resolve(view), 0);
  });
}

// Helper to delete text between positions
export function deleteText(view: EditorView, from: number, to: number) {
  const tr = view.state.tr.delete(from, to);
  view.dispatch(tr);

  // Give time for the appendTransaction to run
  return new Promise<EditorView>((resolve) => {
    setTimeout(() => resolve(view), 0);
  });
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
            add: jest.fn(),
          },
          addEventListener: jest.fn(),
          setAttribute: jest.fn(),
          style: {},
        };
      }),
      createTextNode: jest
        .fn()
        .mockImplementation((text) => ({ textContent: text })),
    };
  }
}

// Helper function to check if a mark exists at an exact position
function hasMarkAtPosition(doc, position, markName) {
  const node = doc.nodeAt(position);
  if (!node) return false;
  return node.marks.some((mark) => mark.type.name === markName);
}

// Return a string with all the letters of a document,
// but characters with a delete mark are replaced with a '-' and characters with an add mark are replaced with a '+'
function getMarkString(doc) {
  let result = '';

  // Use nodesBetween to properly traverse the document
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.isText) {
      // Process each character in the text node
      for (let i = 0; i < node.text.length; i++) {
        const absPos = pos + i;
        const marks = node.marks;

        if (marks.some((mark) => mark.type.name === 'suggestion_delete')) {
          result += '-';
        } else if (marks.some((mark) => mark.type.name === 'suggestion_add')) {
          result += '+';
        } else {
          result += node.text[i];
        }
      }
    }
    // Return true to continue traversal
    return true;
  });

  return result;
}
