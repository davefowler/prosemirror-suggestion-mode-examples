import { EditorState, Selection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, DOMParser, Mark } from 'prosemirror-model';
import { suggestionModePlugin } from '../../src/suggestions';
import { suggestionModePluginKey } from '../../src/key';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { addSuggestionMarks } from '../../src/schema';
import { acceptAllSuggestions } from '../../src/commands/accept-reject';
import { ReplaceStep } from 'prosemirror-transform';
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
      view.dispatch(view.state.tr.insertText('PASTED'));

      // Check the content
      expect(view.state.doc.textContent).toBe('Hello awePASTEDsome world');

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
      const from = 7;
      const to = from + 'awesome'.length; // Deletes "awesome"
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, from, to)
        )
      );
      view.dispatch(view.state.tr.deleteSelection());

      // awesome is still there but should be marked as deleted
      expect(view.state.doc.textContent).toBe('Hello awesome world');
      // Now paste text at the deletion point
      view.dispatch(
        view.state.tr.setSelection(Selection.near(view.state.doc.resolve(from)))
      );
      view.dispatch(view.state.tr.insertText('PASTED'));

      // Check content and marks
      expect(view.state.doc.textContent).toBe('Hello PASTEDawesome world');

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
      const from = 7;
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
      view.dispatch(view.state.tr.insertText('wonderful '));

      // Check content
      expect(view.state.doc.textContent).toBe('Hello wonderful awesome world');

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
      const from = 7;
      const to = 7 + 'world'.length;
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, from, to)
        )
      );

      // Apply bold mark
      const boldMark = schema.marks.strong.create();
      view.dispatch(view.state.tr.addMark(from, to, boldMark));

      // confirm the text is listed twice
      expect(view.state.doc.textContent).toBe('Hello worldworld');

      // Check content and marks in the appropriate ranges
      let hasDeleteMark = false;
      let hasAddMark = false;
      let hasStrongMark = false;
      let newHasStrongMark = false;

      // Check for original text with delete mark
      view.state.doc.nodesBetween(from, to, (node) => {
        node.marks.forEach((mark) => {
          if (mark.type.name === 'suggestion_delete') hasDeleteMark = true;
          if (mark.type.name === 'strong') hasStrongMark = true;
        });
      });

      // Check for added bold text in the appropriate range
      view.state.doc.nodesBetween(from, to + 'world'.length, (node) => {
        node.marks.forEach((mark) => {
          if (mark.type.name === 'suggestion_add') hasAddMark = true;
          if (mark.type.name === 'strong') newHasStrongMark = true;
        });
      });

      expect(hasDeleteMark).toBe(true); // Original text should be marked as deleted
      expect(hasAddMark).toBe(true); // New bold text should be marked as added
      expect(hasStrongMark).toBe(false); // Old text should not have bold mark
      expect(newHasStrongMark).toBe(true); // New text should have bold mark
    });
  });

  describe('copying and pasting formatted text', () => {
    test('should handle pasting pre-formatted text', () => {
      createEditor('<p>Hello <strong>formatted</strong> world</p>');

      // Position cursor after "Hello "
      const position = 7;
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
      expect(view.state.doc.textContent).toBe('Hello pastedformatted world');

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
      const from = 7;
      const len = 'styled'.length;
      const to = from + len;
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(view.state.doc, from, to)
        )
      );

      // Remove strong mark
      view.dispatch(view.state.tr.removeMark(from, to, schema.marks.strong));

      // Verify marks
      let hasDeleteMark = false;
      let hasAddMark = false;
      let hasEmMark = false;
      let hasStrongMark = false;

      // should have both delete and add marks and bold and em
      view.state.doc.nodesBetween(from, to + len, (node) => {
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
      expect(hasStrongMark).toBe(true);
      expect(view.state.doc.textContent).toBe('Hello styledstyled world');

      // now accept the suggestion and check the marks again
      acceptAllSuggestions(view.state, view.dispatch);
      expect(view.state.doc.textContent).toBe('Hello styled world');
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

  describe('pasting with different openStart/openEnd scenarios', () => {
    test('should handle pasting multi-paragraph content', () => {
      createEditor('<p>Hello world</p>');

      // Position cursor after "Hello "
      const position = 6;
      view.dispatch(
        view.state.tr.setSelection(
          Selection.near(view.state.doc.resolve(position))
        )
      );

      // Spy on the step creation to check openStart/openEnd values
      const originalDispatch = view.dispatch;
      const mockDispatch = jest.fn((tr) => {
        // Check for ReplaceStep before dispatching
        tr.steps.forEach((step) => {
          if (step instanceof ReplaceStep) {
            // Verify openStart and openEnd on the slice
            expect(step.slice.openStart).toBeGreaterThanOrEqual(0);
            expect(step.slice.openEnd).toBeGreaterThanOrEqual(0);
            console.log('Slice properties:', {
              openStart: step.slice.openStart,
              openEnd: step.slice.openEnd,
              content: step.slice.content.toString(),
            });
          }
        });
        return originalDispatch.call(view, tr);
      });
      view.dispatch = mockDispatch;

      // Simulate pasting multi-paragraph content
      const pastedText = '<p>first</p><p>second</p>';
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = pastedText;
      const pastedFragment =
        DOMParser.fromSchema(schema).parse(tempDiv).content;

      view.dispatch(
        view.state.tr.replaceWith(position, position, pastedFragment)
      );

      // Fix: Adjust expected content to match actual behavior
      // ProseMirror doesn't add spaces between pasted content
      expect(view.state.doc.textContent).toBe('Hellofirstsecond world');

      // Verify the suggestion_add mark is correctly applied to both paragraphs
      let hasAddMarkOnFirst = false;
      let hasAddMarkOnSecond = false;

      // Check "first" - should have suggestion_add mark
      view.state.doc.nodesBetween(
        position,
        position + 'first'.length,
        (node) => {
          if (node.marks.some((mark) => mark.type.name === 'suggestion_add')) {
            hasAddMarkOnFirst = true;
          }
        }
      );

      // Check "second" - should have suggestion_add mark
      const secondPos = position + 'first'.length;
      view.state.doc.nodesBetween(
        secondPos,
        secondPos + 'second'.length,
        (node) => {
          if (node.marks.some((mark) => mark.type.name === 'suggestion_add')) {
            hasAddMarkOnSecond = true;
          }
        }
      );

      expect(hasAddMarkOnFirst).toBe(true);
      expect(hasAddMarkOnSecond).toBe(true);

      // Restore original dispatch
      view.dispatch = originalDispatch;
    });

    test('should handle pasting into a list item', () => {
      createEditor('<ul><li>First item</li><li>Second item</li></ul>');

      // Select position in the first list item after "First "
      const position = 7;

      // Spy on the step creation to check openStart/openEnd values
      const originalDispatch = view.dispatch;
      const mockDispatch = jest.fn((tr) => {
        // Check for ReplaceStep before dispatching
        tr.steps.forEach((step) => {
          if (step instanceof ReplaceStep) {
            // Verify openStart and openEnd on the slice
            expect(step.slice.openStart).toBeGreaterThanOrEqual(0);
            expect(step.slice.openEnd).toBeGreaterThanOrEqual(0);
            console.log('List item paste slice:', {
              openStart: step.slice.openStart,
              openEnd: step.slice.openEnd,
              content: step.slice.content.toString(),
            });
          }
        });
        return originalDispatch.call(view, tr);
      });
      view.dispatch = mockDispatch;

      view.dispatch(
        view.state.tr.setSelection(
          Selection.near(view.state.doc.resolve(position))
        )
      );

      // Paste text
      view.dispatch(view.state.tr.insertText('inserted '));

      // Check content
      expect(view.state.doc.textContent).toBe('First inserted itemSecond item');

      // Verify the suggestion_add mark is correctly applied
      let hasAddMark = false;
      view.state.doc.nodesBetween(
        position,
        position + 'inserted '.length,
        (node) => {
          if (node.marks.some((mark) => mark.type.name === 'suggestion_add')) {
            hasAddMark = true;
          }
        }
      );

      expect(hasAddMark).toBe(true);

      // Restore original dispatch
      view.dispatch = originalDispatch;
    });

    test('should handle pasting text with different openStart/openEnd values', () => {
      createEditor('<p>Start</p><p>Middle</p><p>End</p>');

      // We'll create a slice with specific openStart/openEnd values
      const startDoc = view.state.doc;

      // Select from middle of "Start" to middle of "Middle" paragraph
      const from = 3; // middle of "Start"
      const to = 10; // middle of "Middle" paragraph

      // Create the slice
      const slice = startDoc.slice(from, to);

      // Update our expectations to match what ProseMirror actually creates
      // When slicing between paragraphs, ProseMirror sets both openStart and openEnd
      expect(slice.openStart).toBe(1); // Starting in middle of paragraph
      expect(slice.openEnd).toBe(1); // Ending in middle of paragraph

      // Position cursor at the end of first paragraph
      const position = 6; // After "Start"
      view.dispatch(
        view.state.tr.setSelection(
          Selection.near(view.state.doc.resolve(position))
        )
      );

      // Monitor the step creation
      const originalDispatch = view.dispatch;
      const mockDispatch = jest.fn((tr) => {
        tr.steps.forEach((step) => {
          if (step instanceof ReplaceStep) {
            console.log('Step slice:', {
              openStart: step.slice.openStart,
              openEnd: step.slice.openEnd,
              content: step.slice.content.toString(),
              size: step.slice.content.size,
            });
          }
        });
        return originalDispatch.call(view, tr);
      });
      view.dispatch = mockDispatch;

      // Insert the slice
      view.dispatch(
        view.state.tr.replaceWith(position, position, slice.content)
      );

      // Check how the suggestion mark was applied
      let markedText = '';
      view.state.doc.nodesBetween(
        position,
        view.state.doc.nodeSize - 2,
        (node, pos) => {
          if (
            node.isText &&
            node.marks.some((mark) => mark.type.name === 'suggestion_add')
          ) {
            markedText += node.text;
          }
        }
      );

      // Verify we have the expected text with suggestion marks
      expect(markedText).toContain('art');
      expect(markedText).toContain('Midd');

      // Restore original dispatch
      view.dispatch = originalDispatch;
    });

    test('should handle complex nested structure pasting', () => {
      createEditor('<p>Hello world</p>');

      // Position cursor after "Hello "
      const position = 6;

      // Spy on the step creation to check openStart/openEnd values
      const originalDispatch = view.dispatch;
      const mockDispatch = jest.fn((tr) => {
        // Check for ReplaceStep before dispatching
        tr.steps.forEach((step) => {
          if (step instanceof ReplaceStep) {
            console.log('Complex structure slice:', {
              openStart: step.slice.openStart,
              openEnd: step.slice.openEnd,
              content: step.slice.content.toString(),
              size: step.slice.content.size,
            });
          }
        });
        return originalDispatch.call(view, tr);
      });
      view.dispatch = mockDispatch;

      view.dispatch(
        view.state.tr.setSelection(
          Selection.near(view.state.doc.resolve(position))
        )
      );

      // Simulate pasting a table with content
      const pastedHTML = `
        <table>
          <tr>
            <td>Cell 1</td>
            <td>Cell 2</td>
          </tr>
        </table>
      `;

      // Since we're using basic schema, table won't be rendered as a table
      // but the text content will still be pasted
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = pastedHTML;
      const pastedFragment =
        DOMParser.fromSchema(schema).parse(tempDiv).content;

      view.dispatch(
        view.state.tr.replaceWith(position, position, pastedFragment)
      );

      // Check that Cell text has been inserted
      expect(view.state.doc.textContent).toContain('Cell 1');
      expect(view.state.doc.textContent).toContain('Cell 2');

      // Check that all pasted text has suggestion_add mark
      let allCellTextMarked = true;
      view.state.doc.nodesBetween(
        position,
        view.state.doc.nodeSize - 2,
        (node, pos) => {
          if (node.isText && node.text?.includes('Cell')) {
            const hasAddMark = node.marks.some(
              (mark) => mark.type.name === 'suggestion_add'
            );
            if (!hasAddMark) allCellTextMarked = false;
          }
        }
      );

      expect(allCellTextMarked).toBe(true);

      // Restore original dispatch
      view.dispatch = originalDispatch;
    });
  });
});
