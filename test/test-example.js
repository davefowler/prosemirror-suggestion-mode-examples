import ist from 'ist';
import { doc, p, eq } from 'prosemirror-test-builder';
describe('Basic document tests', () => {
    it('creates a simple document', () => {
        const d = doc(p('hello'));
        ist(d.textContent, 'hello');
    });
    it('compares two documents', () => {
        const d1 = doc(p('hello'));
        const d2 = doc(p('hello'));
        ist(d1, d2, eq);
    });
});
