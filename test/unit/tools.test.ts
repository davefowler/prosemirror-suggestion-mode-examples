import { applySuggestion, TextSuggestion } from '../../src';
import { EditorView } from 'prosemirror-view';
import { EditorState, Plugin, Transaction } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import { PluginKey } from 'prosemirror-state';

// Create a real plugin key instead of mocking
const suggestionsKey = new PluginKey('suggestions');

// No mocks at all - use the real thing
describe('suggestEdit', () => {
  let view: EditorView;
  let schema: Schema;
  let state: EditorState;

  beforeEach(() => {
    // Create a simple schema with proper toDOM methods
    schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
          toDOM: () => ['div', 0],
        },
        paragraph: {
          group: 'block',
          content: 'inline*',
          toDOM: () => ['p', 0],
        },
        text: {
          group: 'inline',
          toDOM: (node) => node.text || '',
        },
      },
      marks: {
        strong: {
          toDOM: () => ['strong', 0],
        },
        em: {
          toDOM: () => ['em', 0],
        },
      },
    });

    // Create a document
    const doc = schema.node('doc', {}, [
      schema.node('paragraph', {}, [
        schema.text('This is a test document with some text to replace.'),
      ]),
    ]);

    // Create a real plugin with our suggestion state
    const suggestionsPlugin = new Plugin({
      key: suggestionsKey,
      state: {
        init: () => ({
          username: 'user',
          inSuggestionMode: false,
          data: {},
        }),
        apply: (tr, value) => {
          const meta = tr.getMeta(suggestionsKey);
          if (meta) {
            return { ...value, ...meta };
          }
          return value;
        },
      },
    });

    // Create a real state with the document
    state = EditorState.create({
      doc,
      plugins: [suggestionsPlugin],
    });

    // Create a real view with proper DOM element
    const place = document.createElement('div');
    document.body.appendChild(place);

    view = new EditorView(place, {
      state,
      dispatchTransaction: (tr: Transaction) => {
        const newState = view.state.apply(tr);
        view.updateState(newState);
      },
    });
  });

  afterEach(() => {
    // Clean up the view to prevent memory leaks
    if (view) {
      view.destroy();
    }
  });

  test('should handle suggestions with empty textToReplace', () => {
    const suggestion: TextSuggestion = {
      textToReplace: '',
      textReplacement: 'new text',
      reason: 'test reason',
    };
    // should return false if the doc has text but there is no good matching string
    const result = applySuggestion(view, suggestion, 'testUser');
    expect(result).toBe(false);

    // Delete the text and try again
    const tr = view.state.tr.delete(0, view.state.doc.textContent.length + 1);
    view.dispatch(tr);
    expect(view.state.doc.textContent).toBe('');
    const result2 = applySuggestion(view, suggestion, 'testUser');
    expect(result2).toBe(true);
    expect(view.state.doc.textContent).toBe('new text');
  });
});
