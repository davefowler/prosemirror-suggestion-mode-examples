import { EditorState, Selection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, Mark } from 'prosemirror-model';
import { suggestionModePlugin } from '../../src/plugin';
import { suggestionPluginKey, suggestionTransactionKey } from '../../src/key';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { addSuggestionMarks } from '../../src/schema';

describe('suggestionsPlugin integration', () => {
  let view: EditorView;
  let state: EditorState;
  let container: HTMLElement;

  // Create a schema with suggestion marks
  const schema = new Schema({
    nodes: basicSchema.spec.nodes,
    marks: addSuggestionMarks(basicSchema.spec.marks),
  });

  // Helper to create a basic editor with our plugin
  function createEditor(
    content: string = '<p>Hello world</p>',
    pluginState = {}
  ) {
    // Create container for the editor
    container = document.createElement('div');
    document.body.appendChild(container);

    // Parse the content
    const domNode = document.createElement('div');
    domNode.innerHTML = content;
    const doc = DOMParser.fromSchema(schema).parse(domNode);

    // Create the state with our plugin
    state = EditorState.create({
      doc,
      schema,
      plugins: [
        keymap(baseKeymap),
        suggestionModePlugin({ username: 'integration test user' }),
      ],
    });

    // Create the editor view
    view = new EditorView(container, { state });

    // Configure the plugin with the desired state
    view.dispatch(
      view.state.tr.setMeta(suggestionPluginKey, {
        inSuggestionMode: true,
        username: 'testUser',
        data: { 'example-attr': 'test value' },
        ...pluginState,
      })
    );

    return view;
  }

  afterEach(() => {
    if (view) {
      view.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('suggestion mode', () => {
    test('should initialize with suggestion mode enabled', () => {
      createEditor();
      const pluginState = suggestionPluginKey.getState(view.state);

      expect(pluginState).toBeDefined();
      expect(pluginState!.inSuggestionMode).toBe(true);
      expect(pluginState!.username).toBe('testUser');
    });

    test('should toggle suggestion mode', () => {
      createEditor();

      // Get initial state
      let pluginState = suggestionPluginKey.getState(view.state);
      expect(pluginState).toBeDefined();
      expect(pluginState!.inSuggestionMode).toBe(true);

      // Toggle suggestion mode off
      view.dispatch(
        view.state.tr.setMeta(suggestionPluginKey, {
          inSuggestionMode: false,
        })
      );

      // Turn the transaction suggestion mode on
      view.dispatch(
        view.state.tr.setMeta(suggestionTransactionKey, {
          inSuggestionMode: true,
        })
      );

      // Check that the plugin suggestion mode it's off
      pluginState = suggestionPluginKey.getState(view.state);
      expect(pluginState).toBeDefined();
      expect(pluginState!.inSuggestionMode).toBe(false);

      // Toggle it back on
      view.dispatch(
        view.state.tr.setMeta(suggestionPluginKey, {
          inSuggestionMode: true,
        })
      );

      // Check that it's on again
      pluginState = suggestionPluginKey.getState(view.state);
      expect(pluginState).toBeDefined();
      expect(pluginState!.inSuggestionMode).toBe(true);
    });
  });

  describe('text operations', () => {
    test('should mark inserted text with suggestion_add', () => {
      createEditor('<p>Hello world</p>');

      // Position cursor after "Hello "
      const position = 7;
      const tr = view.state.tr.setSelection(
        Selection.near(view.state.doc.resolve(position))
      );
      view.dispatch(tr);

      // Insert text with a space
      view.dispatch(view.state.tr.insertText(' awesome '));

      // Check that the document now contains the text
      expect(view.state.doc.textContent).toBe('Hello  awesome world');

      // Check that there's a suggestion_add mark
      let foundMark = false;
      view.state.doc.nodesBetween(position, position + 8, (node) => {
        if (node.marks.some((mark) => mark.type.name === 'suggestion_add')) {
          foundMark = true;
        }
      });

      expect(foundMark).toBe(true);
    });

    test('should mark deleted text with suggestion_delete', () => {
      createEditor('<p>Hello awesome world</p>');

      // Select " awesome "
      const from = 7;
      const to = 16;
      const tr = view.state.tr.setSelection(
        TextSelection.create(view.state.doc, from, to)
      );
      view.dispatch(tr);

      // Delete the selected text
      view.dispatch(view.state.tr.deleteSelection());

      // Check that the document still contains"Hello  awesome world"
      expect(view.state.doc.textContent).toBe('Hello awesome world');

      // Check that there's a suggestion_delete mark
      let foundMark = false;
      view.state.doc.nodesBetween(from, from + 8, (node) => {
        if (node.marks.some((mark) => mark.type.name === 'suggestion_delete')) {
          foundMark = true;
        }
      });

      expect(foundMark).toBe(true);
    });
  });

  describe('custom data', () => {
    test('should pass custom data to suggestion marks', () => {
      createEditor('<p>Hello world</p>', {
        data: { exampleattr: 'test value' },
      });

      // Position cursor after "Hello "
      const position = 7;
      const tr = view.state.tr.setSelection(
        Selection.near(view.state.doc.resolve(position))
      );
      view.dispatch(tr);

      // Insert text with a space
      view.dispatch(view.state.tr.insertText(' awesome '));

      // Check that the document now contains the text
      expect(view.state.doc.textContent).toBe('Hello  awesome world');

      // Check that there's a suggestion_add mark with our custom data
      let markWithData: Mark | null = null;
      view.state.doc.nodesBetween(position, position + 8, (node) => {
        node.marks.forEach((mark) => {
          if (mark.type.name === 'suggestion_add') {
            markWithData = mark;
          }
        });
      });

      expect(markWithData).not.toBeNull();
      expect(markWithData!.attrs.data).toEqual({ exampleattr: 'test value' });
    });
  });

  describe('decorations', () => {
    test('should add decorations for suggestion marks', () => {
      createEditor('<p>Hello world</p>');

      // Position cursor after "Hello "
      const position = 6;
      const tr = view.state.tr.setSelection(
        Selection.near(view.state.doc.resolve(position))
      );
      view.dispatch(tr);

      // Insert text
      view.dispatch(view.state.tr.insertText('awesome '));

      // Force a DOM update
      view.updateState(view.state);

      // Check that there's a decoration with the suggestion-add class
      const decorations = container.querySelectorAll('.suggestion-add');
      expect(decorations.length).toBeGreaterThan(0);

      // Check that there's a tooltip
      const hoverMenu = container.querySelectorAll('.suggestion-hover-menu');
      expect(hoverMenu.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    test('should handle deleting adjacent to suggestion marks', () => {
      createEditor('<p>Hello world</p>');

      // First, add text to create a suggestion_add mark
      const position = 7;
      const len = 'awesome '.length;
      const to = position + len;
      view.dispatch(
        view.state.tr.setSelection(
          Selection.near(view.state.doc.resolve(position))
        )
      );
      view.dispatch(view.state.tr.insertText('awesome '));

      // The document now has "Hello awesome world" with "awesome " as a suggestion_add

      // Position cursor one character to the right of the suggestion mark (after "awesome ")
      view.dispatch(
        view.state.tr.setSelection(Selection.near(view.state.doc.resolve(to)))
      );

      // Delete the character at cursor (should be 'w' from "world")
      view.dispatch(view.state.tr.delete(to, to + 1));

      // Document should now have "Hello awesome world" with the deleted 'w' marked as suggestion_delete
      expect(view.state.doc.textContent).toBe('Hello awesome world');

      // Check that the deleted 'w' has a suggestion_delete mark
      let hasDeleteMark = false;
      view.state.doc.nodesBetween(to, to + 1, (node) => {
        if (node.marks.some((mark) => mark.type.name === 'suggestion_delete')) {
          hasDeleteMark = true;
        }
      });

      expect(hasDeleteMark).toBe(true);

      // Ensure we have two separate suggestion marks (one for add, one for delete)
      const allMarks: Mark[] = [];
      view.state.doc.nodesBetween(0, view.state.doc.content.size, (node) => {
        node.marks.forEach((mark) => {
          if (
            mark.type.name === 'suggestion_add' ||
            mark.type.name === 'suggestion_delete'
          ) {
            allMarks.push(mark);
          }
        });
      });

      const uniqueMarks = new Set(allMarks.map((m) => m.type.name));
      expect(uniqueMarks.size).toBe(2); // Should have both add and delete marks
    });

    test('should handle deleting character right after adding text', () => {
      createEditor('<p>Hello world</p>');

      // Add text to create a suggestion mark
      const position = 7;
      view.dispatch(
        view.state.tr.setSelection(
          Selection.near(view.state.doc.resolve(position))
        )
      );
      view.dispatch(view.state.tr.insertText('new '));

      let initialMarkRange;
      view.state.doc.nodesBetween(
        0,
        view.state.doc.content.size,
        (node, pos) => {
          node.marks.forEach((mark) => {
            if (mark.type.name === 'suggestion_add') {
              initialMarkRange = { from: pos, to: pos + node.nodeSize };
            }
          });
        }
      );
      // Move cursor one character to the left (inside the suggestion mark)
      const positionInsideMark = position + 'new'.length;

      view.dispatch(
        view.state.tr.setSelection(
          Selection.near(view.state.doc.resolve(positionInsideMark))
        )
      );

      // Delete the space character inside the suggestion mark
      view.dispatch(
        view.state.tr.delete(positionInsideMark, positionInsideMark + 1)
      );
      // The content after deletion should have no space between "new" and "world"
      expect(view.state.doc.textContent).toBe('Hello newworld');

      // Check what suggestion marks we have after the operation
      const suggestionMarkNames: ('suggestion_add' | 'suggestion_delete')[] =
        [];
      view.state.doc.nodesBetween(
        0,
        view.state.doc.content.size,
        (node, pos) => {
          node.marks.forEach((mark) => {
            if (
              mark.type.name === 'suggestion_add' ||
              mark.type.name === 'suggestion_delete'
            ) {
              suggestionMarkNames.push(
                mark.type.name as 'suggestion_add' | 'suggestion_delete'
              );
            }
          });
        }
      );

      // We should have suggestion marks
      expect(suggestionMarkNames.length).toBeGreaterThan(0);

      // The plugin appears to add a suggestion_delete mark when deleting the space
      // This behavior makes sense as it tracks both additions and deletions
      const hasAddMarks = suggestionMarkNames.includes('suggestion_add');
      expect(hasAddMarks).toBe(true);
    });
  });
});
