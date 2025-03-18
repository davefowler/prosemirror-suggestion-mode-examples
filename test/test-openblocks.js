import ist from 'ist';
import { doc, p, blockquote, h1, li, ul, schema, eq, } from 'prosemirror-test-builder';
import { EditorState } from 'prosemirror-state';
import { suggestionModePlugin, addSuggestionMarks, } from 'prosemirror-suggestion-mode';
import { Schema } from 'prosemirror-model';
function docWithPlugins(content, plugins) {
    return EditorState.create({
        doc: content,
        schema,
        plugins,
    });
}
// Same as doc, but with the suggestion mode plugin
function docS(content, options = { inSuggestionMode: true }) {
    return docWithPlugins(content, [suggestionModePlugin(options)]);
}
// Create a new schema using the test-builder schema and our suggestion marks
const testSchema = new Schema({
    nodes: schema.spec.nodes,
    marks: addSuggestionMarks(schema.spec.marks),
});
describe('Open Block Deletion Tests', () => {
    // Helper function scoped to these tests
    function testSuggestionTransform(doc, expected, action) {
        const state = EditorState.create({
            doc,
            plugins: [suggestionModePlugin({ inSuggestionMode: true })],
        });
        const tr = state.tr;
        action(tr);
        const newState = state.apply(tr);
        ist(newState.doc, expected, eq);
    }
    it('adds pilcrow when deleting between paragraphs', () => testSuggestionTransform(doc(p('First paragraph<a>'), p('<b>Second paragraph')), doc(p('First paragraph¶Second paragraph')), (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b)));
    it('handles backspace at start of paragraph', () => testSuggestionTransform(doc(p('First paragraph<a>'), p('<b>Second paragraph')), doc(p('First paragraph¶Second paragraph')), (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b)));
    it('should handle multiple block deletions', () => {
        testSuggestionTransform(doc(p('One<a>'), p('Two'), p('<b>Three')), doc(p('One¶¶Three')), (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b));
    });
    it('should handle deletion across list items', () => {
        testSuggestionTransform(doc(ul(li(p('First<a>')), li(p('<b>Second')))), doc(ul(li(p('First¶Second')))), (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b));
    });
    it('should handle deletion across different block types', () => {
        testSuggestionTransform(doc(h1('Heading<a>'), blockquote(p('<b>Quote'))), doc(h1('Heading¶Quote')), (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b));
    });
    it('should handle addition of new content', () => {
        testSuggestionTransform(doc(p('Hello<a>'), p('<b>world')), doc(p('Hello there world')), (tr) => tr.insert(tr.doc.tag.a, schema.text(' there ')));
    });
});
