import { EditorState, Selection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, Mark } from 'prosemirror-model';
import { suggestionModePlugin } from '../../src/suggestions';
import { suggestionModePluginKey } from '../../src/key';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { addSuggestionMarks } from '../../src/schema';
import { toggleMark } from 'prosemirror-commands';

describe('suggestion mode edge cases', () => {
  let view: EditorView;
  let state: EditorState;
  let container: HTMLElement;

  // Create a schema with suggestion marks and basic marks like bold
  const schema = new Schema({
    nodes: basicSchema.spec.nodes,
    marks: addSuggestionMarks(basicSchema.spec.marks),
  });

  // Helper to create a basic editor with our plugin
  function createEditor(
    content: string = '<p>Hello world</p>',
    pluginState = {}
  ) {
    container = document.createElement('div');
    document.body.appendChild(container);

    const domNode = document.createElement('div');
    domNode.innerHTML = content;
    const doc = DOMParser.fromSchema(schema).parse(domNode);

    state = EditorState.create({
      doc,
      schema,
      plugins: [
        keymap(baseKeymap),
        suggestionModePlugin({ username: 'test user' }),
      ],
    });

    view = new EditorView(container, { state });

    view.dispatch(
      view.state.tr.setMeta(suggestionModePluginKey, {
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

  describe('pasting into suggestion range', () => {
    test('should handle pasting text into an existing suggestion_add range', () => {
      createEditor('<p>Hello world</p>');

      // First create a suggestion by adding text
      const position = 7;
      view.dispatch(
        view.state.tr.setSelection(
          Selection.near(view.state.doc.resolve(position))
        )
      );
      view.dispatch(view.state.tr.insertText('awesome '));

      expect(view.state.doc.textContent).toBe('Hello awesome world');

      // Now paste text into the middle of "awesome"
      const pastePosition = position + 3; // After "awe"
      view.dispatch(
        view.state.tr.setSelection(
          Selection.near(view.state.doc.resolve(pastePosition))
        )
      );
      // check what's selected
      expect(view.state.selection.content()).toBe('awesome ');
      view.dispatch(view.state.tr.insertText('PASTED'));

      // Check the content
      expect(view.state.doc.textContent).toBe('HelloawePASTEDsome world');

      // Verify that the entire new content is marked as suggestion_add
      let hasAddMark = false;
      view.state.doc.nodesBetween(
        position,
        position + 'awePASTEDsome'.length,
        (node) => {
          if (node.marks.some((mark) => mark.type.name === 'suggestion_add')) {
            hasAddMark = true;
          }
        }
      );
      expect(hasAddMark).toBe(true);
    });

    test('should handle pasting text into an existing suggestion_delete range', () => {
      createEditor('<p>Hello awesome world</p>');

      // First create a deletion
      const from = 6;
      const to = from + 'awesome'.length; // Deletes "awesome"
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, from, to)
        )
      );
      view.dispatch(view.state.tr.deleteSelection());

      // Now paste text at the deletion point
      view.dispatch(
        view.state.tr.setSelection(Selection.near(view.state.doc.resolve(from)))
      );
      view.dispatch(view.state.tr.insertText('PASTED'));

      // Check content and marks
      expect(view.state.doc.textContent).toBe('Hello awesome PASTED world');

      // Verify we have both delete and add marks
      let hasDeleteMark = false;
      let hasAddMark = false;
      view.state.doc.nodesBetween(
        from,
        from + 'awesome PASTED'.length,
        (node) => {
          node.marks.forEach((mark) => {
            if (mark.type.name === 'suggestion_delete') hasDeleteMark = true;
            if (mark.type.name === 'suggestion_add') hasAddMark = true;
          });
        }
      );
      expect(hasDeleteMark).toBe(true);
      expect(hasAddMark).toBe(true);
    });
  });

  describe('deletion followed by typing', () => {
    test('should handle backspace followed by typing', () => {
      createEditor('<p>Hello awesome world</p>');

      // Delete "awesome "
      const from = 6;
      const to = 13;
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, from, to)
        )
      );
      view.dispatch(view.state.tr.deleteSelection());

      // Type new text at the same position
      view.dispatch(
        view.state.tr.setSelection(Selection.near(view.state.doc.resolve(from)))
      );
      view.dispatch(view.state.tr.insertText('wonderful'));

      // Check content
      expect(view.state.doc.textContent).toBe('Hello awesome wonderful world');

      // Verify we have both marks
      let hasDeleteMark = false;
      let hasAddMark = false;
      view.state.doc.nodesBetween(
        from,
        from + 'awesome wonderful'.length,
        (node) => {
          node.marks.forEach((mark) => {
            if (mark.type.name === 'suggestion_delete') hasDeleteMark = true;
            if (mark.type.name === 'suggestion_add') hasAddMark = true;
          });
        }
      );
      expect(hasDeleteMark).toBe(true);
      expect(hasAddMark).toBe(true);
    });
  });

  describe('formatting changes', () => {
    test('should handle applying bold formatting', () => {
      createEditor('<p>Hello world</p>');

      // Select "world"
      const from = 6;
      const to = 11;
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, from, to)
        )
      );

      // Apply bold mark
      const boldMark = schema.marks.strong.create();
      view.dispatch(view.state.tr.addMark(from, to, boldMark));

      // Check content and marks
      let hasDeleteMark = false;
      let hasAddMark = false;
      let hasStrongMark = false;

      view.state.doc.nodesBetween(from, to, (node) => {
        node.marks.forEach((mark) => {
          if (mark.type.name === 'suggestion_delete') hasDeleteMark = true;
          if (mark.type.name === 'suggestion_add') hasAddMark = true;
          if (mark.type.name === 'strong') hasStrongMark = true;
        });
      });

      expect(hasDeleteMark).toBe(true); // Original text should be marked as deleted
      expect(hasAddMark).toBe(true); // New bold text should be marked as added
      expect(hasStrongMark).toBe(true); // New text should have bold mark
    });
  });

  describe('copying and pasting formatted text', () => {
    test('should handle pasting pre-formatted text', () => {
      createEditor('<p>Hello <strong>formatted</strong> world</p>');

      // Position cursor after "Hello "
      const position = 6;
      view.dispatch(
        view.state.tr.setSelection(
          Selection.near(view.state.doc.resolve(position))
        )
      );

      // Simulate pasting formatted text
      const pastedText = '<strong>pasted</strong>';
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = pastedText;
      const pastedFragment =
        DOMParser.fromSchema(schema).parse(tempDiv).content;

      view.dispatch(
        view.state.tr.replaceWith(position, position, pastedFragment)
      );

      // Check content
      expect(view.state.doc.textContent).toBe('Hello pasted formatted world');

      // Verify the pasted text has both strong and suggestion_add marks
      let hasAddMark = false;
      let hasStrongMark = false;
      view.state.doc.nodesBetween(
        position,
        position + 'pasted'.length,
        (node) => {
          node.marks.forEach((mark) => {
            if (mark.type.name === 'suggestion_add') hasAddMark = true;
            if (mark.type.name === 'strong') hasStrongMark = true;
          });
        }
      );
      expect(hasAddMark).toBe(true);
      expect(hasStrongMark).toBe(true);
    });
  });

  describe('complex mark operations', () => {
    test('should handle removing and adding marks in sequence', () => {
      createEditor('<p>Hello <strong><em>styled</em></strong> world</p>');

      // Select "styled"
      const from = 6;
      const to = 12;
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, from, to)
        )
      );

      // Remove strong mark
      view.dispatch(view.state.tr.removeMark(from, to, schema.marks.strong));

      // Add underline mark
      const underlineMark = schema.marks.em.create();
      view.dispatch(view.state.tr.addMark(from, to, underlineMark));

      // Verify marks
      let hasDeleteMark = false;
      let hasAddMark = false;
      let hasEmMark = false;
      let hasStrongMark = false;

      view.state.doc.nodesBetween(from, to, (node) => {
        node.marks.forEach((mark) => {
          if (mark.type.name === 'suggestion_delete') hasDeleteMark = true;
          if (mark.type.name === 'suggestion_add') hasAddMark = true;
          if (mark.type.name === 'em') hasEmMark = true;
          if (mark.type.name === 'strong') hasStrongMark = true;
        });
      });

      expect(hasDeleteMark).toBe(true);
      expect(hasAddMark).toBe(true);
      expect(hasEmMark).toBe(true);
      expect(hasStrongMark).toBe(false);
    });
  });

  describe('ReplaceAround operations', () => {
    test('should handle wrapping text in a blockquote', () => {
      createEditor('<p>Hello world</p>');

      // Select the paragraph
      const from = 1;
      const to = 11;
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, from, to)
        )
      );

      // Wrap in blockquote
      const content = view.state.doc.textBetween(from, to);
      const paragraph = schema.nodes.paragraph.create(
        null,
        schema.text(content)
      );
      const blockquote = schema.nodes.blockquote.create(null, [paragraph]);

      view.dispatch(view.state.tr.replaceWith(from - 1, to + 1, blockquote));

      // Verify structure and marks
      let hasAddMark = false;
      let hasDeleteMark = false;
      let foundBlockquote = false;

      view.state.doc.nodesBetween(0, view.state.doc.content.size, (node) => {
        if (node.type.name === 'blockquote') {
          foundBlockquote = true;
        }
        node.marks.forEach((mark) => {
          if (mark.type.name === 'suggestion_add') hasAddMark = true;
          if (mark.type.name === 'suggestion_delete') hasDeleteMark = true;
        });
      });

      expect(foundBlockquote).toBe(true);
      expect(hasAddMark).toBe(true);
      expect(hasDeleteMark).toBe(true);
    });
  });
});
