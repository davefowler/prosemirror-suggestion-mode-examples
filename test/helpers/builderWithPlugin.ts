import {
  eq,
  builders,
  schema as defaultSchema,
} from 'prosemirror-test-builder';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
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

const builderResults = builders(suggestionSchema);
export const schema = builderResults.schema;
export const doc = builderResults.doc;
export const p = builderResults.paragraph;
export const blockquote = builderResults.blockquote;
export const h1 = builderResults.heading;
export const ul = builderResults.bullet_list;
export const li = builderResults.list_item;
export const sdel = builderResults.suggestion_delete;
export const sadd = builderResults.suggestion_insert;

export function createEditorState(
  editorDoc: Node,
  inSuggestionMode: boolean = true
): EditorState {
  return EditorState.create({
    doc: editorDoc,
    schema,
    plugins: [suggestionModePlugin({ inSuggestionMode: inSuggestionMode })],
  });
}

export function createEditorView(
  editorDoc: Node,
  inSuggestionMode: boolean = true
): EditorView {
  return new EditorView(document.createElement('div'), {
    state: createEditorState(editorDoc, inSuggestionMode),
  });
}

function node2HTML(node: Node) {
  const serializer = DOMSerializer.fromSchema(schema);
  const resultDiv = document.createElement('div');
  resultDiv.appendChild(serializer.serializeFragment(node.content));
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
  action: (tr: Transaction) => void,
  eqInHTML: boolean = false
) {
  const state = createEditorState(input);
  const tr = state.tr;
  action(tr);
  const result = state.apply(tr).doc;

  if (eqInHTML) {
    // Sometimes its nice to see the HTML output in the comparison
    expect(node2HTML(result)).toEqual(node2HTML(expected));
  } else {
    // expect(result).toEqual(expected);
    ist(result, expected, eq);
  }
}

export { eq };
