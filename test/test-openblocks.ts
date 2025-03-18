import ist from 'ist';
import { eq, builders, schema } from 'prosemirror-test-builder';
import { EditorState, Plugin } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { DOMSerializer } from 'prosemirror-model';

import {
  suggestionModePlugin,
  SuggestionModePluginOptions,
  addSuggestionMarks,
} from 'prosemirror-suggestion-mode';
import { Schema, Node } from 'prosemirror-model';

// Extend Node type to include tag property - something the test-builder adds
declare module 'prosemirror-model' {
  interface Node {
    tag: { [key: string]: number };
  }
}

const suggestionSchema = new Schema({
  nodes: schema.spec.nodes,
  marks: addSuggestionMarks(schema.spec.marks),
});

// Create builders using our testSchema instead of the default schema
const { schema: testSchema, ...rest } = builders(suggestionSchema);
const {
  doc,
  paragraph: p,
  blockquote,
  heading: h1,
  bullet_list: ul,
  list_item: li,
  suggestion_delete: sdel,
  suggestion_add: sadd,
} = rest;

console.log('rest of builders', rest);

function createEditor(doc: Node) {
  return EditorState.create({
    doc,
    schema: testSchema,
    plugins: [suggestionModePlugin({ inSuggestionMode: true })],
  });
}

describe('Open Block Deletion Tests', () => {
  function testSuggestionTransform(
    input: Node,
    expected: Node,
    action: (tr: Transform) => void
  ) {
    const state = createEditor(input);
    const tr = state.tr;
    action(tr);
    const result = state.apply(tr).doc;
    expect(result).toEqual(expected);
  }

  // helpful for debugging, compare output as html
  function testSuggestionTransformHTML(
    input: Node,
    expected: Node,
    action: (tr: Transform) => void
  ) {
    const state = createEditor(input);
    const tr = state.tr;
    action(tr);
    const result = state.apply(tr).doc;

    // Create temporary DOM elements to hold the HTML
    const resultDiv = document.createElement('div');
    const expectedDiv = document.createElement('div');

    // Use DOMSerializer to convert to HTML
    const serializer = DOMSerializer.fromSchema(testSchema);
    resultDiv.appendChild(serializer.serializeFragment(result.content));
    expectedDiv.appendChild(serializer.serializeFragment(expected.content));

    console.log('result', resultDiv.innerHTML);
    console.log('expected', expectedDiv.innerHTML);
    expect(resultDiv.innerHTML).toEqual(expectedDiv.innerHTML);
  }

  it('adds pilcrow when deleting between paragraphs', () =>
    testSuggestionTransformHTML(
      doc(p('First paragraph<a>'), p('<b>Second paragraph')),
      doc(
        p('First paragraph', sdel('¶')),
        p(sdel('\u200B'), 'Second paragraph')
      ),
      (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b)
    ));

  it('should handle multiple block deletions', () =>
    testSuggestionTransformHTML(
      doc(p('One<a>'), p('Two'), p('<b>Three')),
      doc(p('One', sdel('¶¶'), 'Three')),
      (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b)
    ));

  // Commented tests can be uncommented once we figure out the expected behavior
  // it('should handle deletion across list items', () => {
  //   const result = testSuggestionTransform(
  //     doc(ul(li(p('First<a>')), li(p('<b>Second')))),
  //     (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b)
  //   );
  //
  //   expect(result).toEqual(
  //     doc(ul(li(p('First', sdel('¶'), 'Second'))))
  //   );
  // });
});
