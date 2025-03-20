import { doc, p, sdel, testSuggestionTransform } from './builderWithPlugin';

describe('Open Block Deletion Tests', () => {
  it('adds pilcrow when deleting between paragraphs', () =>
    testSuggestionTransform(
      doc(p('First paragraph<a>'), p('<b>Second paragraph')),
      doc(
        p('First paragraph', sdel('¶')),
        p(sdel('\u200B'), 'Second paragraph')
      ),
      (tr) => tr.delete(tr.doc.tag.a, tr.doc.tag.b)
    ));

  it('should handle multiple block deletions', () =>
    testSuggestionTransform(
      doc(p('One<a>'), p('Two'), p('<b>Three')),
      doc(
        p('One', sdel('¶')),
        p(sdel(''), 'Two', sdel('¶')),
        p(sdel(''), 'Three')
      ),
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
