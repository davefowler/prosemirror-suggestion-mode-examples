import {
  eq,
  builders,
  schema as defaultSchema,
} from 'prosemirror-test-builder';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Transform } from 'prosemirror-transform';
import { DOMSerializer } from 'prosemirror-model';
import ist from 'ist';

import { addSuggestionMarks, suggestionModePlugin } from '../../src';
import { Schema, Node } from 'prosemirror-model';

// Extend Node type to include tag property - something the test-builder adds
declare module 'prosemirror-model' {
  interface Node {
    tag: { [key: string]: number };
  }
}

const suggestionSchema = new Schema({
  nodes: defaultSchema.spec.nodes,
  marks: addSuggestionMarks(defaultSchema.spec.marks),
});

// Create builders using our testSchema instead of the default schema
export const { schema, ...b } = builders(suggestionSchema);
export const {
  doc,
  paragraph: p,
  blockquote,
  heading: h1,
  bullet_list: ul,
  list_item: li,
  suggestion_delete: sdel,
  suggestion_add: sadd,
} = b;

export function createEditorState(
  doc: Node,
  inSuggestionMode: boolean = true
): EditorState {
  return EditorState.create({
    doc,
    schema,
    plugins: [suggestionModePlugin({ inSuggestionMode: inSuggestionMode })],
  });
}

export function createEditorView(
  doc: Node,
  inSuggestionMode: boolean = true
): EditorView {
  return new EditorView(document.createElement('div'), {
    state: createEditorState(doc, inSuggestionMode),
  });
}

function doc2HTML(doc: Node) {
  const serializer = DOMSerializer.fromSchema(schema);
  const resultDiv = document.createElement('div');
  resultDiv.appendChild(serializer.serializeFragment(doc.content));
  return resultDiv.innerHTML;
}

/**
 * Test a suggestion transform
 * @param input - The input document
 * @param expected - The expected document
 * @param action - The action to perform on the document
 * @param eqInHTML - Whether to compare the documents as HTML
 * @default false
 */
export function testSuggestionTransform(
  input: Node,
  expected: Node,
  action: (tr: Transform) => void,
  eqInHTML: boolean = false
) {
  const state = createEditorState(input);
  const tr = state.tr;
  action(tr);
  const result = state.apply(tr).doc;

  if (eqInHTML) {
    // Sometimes its nice to see the HTML output in the comparison
    expect(doc2HTML(result)).toEqual(doc2HTML(expected));
  } else {
    // expect(result).toEqual(expected);
    ist(result, expected, eq);
  }
}

export { eq };
