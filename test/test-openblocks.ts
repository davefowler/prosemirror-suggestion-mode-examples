import ist from 'ist';
import {
  doc,
  p,
  blockquote,
  h1,
  h2,
  h3,
  li,
  ul,
  ol,
  br,
  hr,
  schema,
  eq,
} from 'prosemirror-test-builder';
import { EditorState, Plugin } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
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

function docWithPlugins(content, plugins: Plugin[]) {
  return EditorState.create({
    doc: content,
    schema,
    plugins,
  });
}

// Same as doc, but with the suggestion mode plugin
function docS(
  content,
  options: SuggestionModePluginOptions = { inSuggestionMode: true }
) {
  return docWithPlugins(content, [suggestionModePlugin(options)]);
}

// Create a new schema using the test-builder schema and our suggestion marks
const testSchema = new Schema({
  nodes: schema.spec.nodes,
  marks: addSuggestionMarks(schema.spec.marks),
});

describe('Open Block Deletion Tests', () => {
  // Helper function scoped to these tests
  function testSuggestionTransform(
    doc: Node,
    expected: Node,
    action: (tr: Transform) => void
  ) {
    const state = EditorState.create({
      doc,
      plugins: [suggestionModePlugin({ inSuggestionMode: true })],
    });
    const tr = state.tr;
    action(tr);
    const newState = state.apply(tr);
    ist(newState.doc, expected, eq);
  }

  it('adds pilcrow when deleting between paragraphs', () =>
    testSuggestionTransform(
      doc(p('First paragraph<a>'), p('<b>Second paragraph')),
      doc(p('First paragraph¶Second paragraph')),
      (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b)
    ));

  it('handles backspace at start of paragraph', () =>
    testSuggestionTransform(
      doc(p('First paragraph<a>'), p('<b>Second paragraph')),
      doc(p('First paragraph¶Second paragraph')),
      (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b)
    ));

  it('should handle multiple block deletions', () => {
    testSuggestionTransform(
      doc(p('One<a>'), p('Two'), p('<b>Three')),
      doc(p('One¶¶Three')),
      (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b)
    );
  });

  it('should handle deletion across list items', () => {
    testSuggestionTransform(
      doc(ul(li(p('First<a>')), li(p('<b>Second')))),
      doc(ul(li(p('First¶Second')))),
      (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b)
    );
  });

  it('should handle deletion across different block types', () => {
    testSuggestionTransform(
      doc(h1('Heading<a>'), blockquote(p('<b>Quote'))),
      doc(h1('Heading¶Quote')),
      (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b)
    );
  });

  it('should handle addition of new content', () => {
    testSuggestionTransform(
      doc(p('Hello<a>'), p('<b>world')),
      doc(p('Hello there world')),
      (tr) => tr.insert(tr.doc.tag.a, schema.text(' there '))
    );
  });
});
