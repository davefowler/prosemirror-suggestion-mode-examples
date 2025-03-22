import {
  doc,
  p,
  createEditorState,
  createEditorView,
} from '../helpers/builderWithPlugin';

import { EditorView } from 'prosemirror-view';
import { setSuggestionModeCommand } from '../../src/commands/setMode';
import { suggestionPluginKey } from '../../src/key';
import { applySuggestion } from '../../src/commands/applySuggestion';

describe('Suggestion Mode State Tests', () => {
  it('should maintain suggestion mode state after a transaction with meta', () => {
    // Create an editor with suggestion mode off initially
    const startDoc = doc(p('hello world'));
    const editorState = createEditorState(startDoc, false);
    const view = new EditorView(document.createElement('div'), {
      state: editorState,
    });

    // Verify initial state is off
    let pluginState = suggestionPluginKey.getState(view.state);
    expect(pluginState?.inSuggestionMode).toBe(false);

    // Turn suggestion mode on
    setSuggestionModeCommand(true)(view.state, view.dispatch);

    // Verify state is now on
    pluginState = suggestionPluginKey.getState(view.state);
    expect(pluginState?.inSuggestionMode).toBe(true);

    // Make a regular transaction that doesn't mention suggestion mode
    view.dispatch(view.state.tr.insertText(' test'));

    // Verify suggestion mode is still on after regular transaction
    pluginState = suggestionPluginKey.getState(view.state);
    expect(pluginState?.inSuggestionMode).toBe(true);
  });

  it('should should properly merge metadata', () => {
    // Create an editor with suggestion mode off initially
    const startDoc = doc(p('hello world'));
    const editorState = createEditorState(startDoc, false);
    const view = new EditorView(document.createElement('div'), {
      state: editorState,
    });
    view.state.tr.setMeta(suggestionPluginKey, {
      username: 'plugin level user',
      data: {
        reason: 'plugin level reason',
        pluginOnlyVar: true,
      },
    });

    // Apply a suggestion with temporary suggestion mode on
    applySuggestion(
      view,
      {
        textToReplace: 'world',
        textReplacement: 'everyone',
        textBefore: 'hello ',
        reason: 'transaction level reason',
      },
      'transaction level user'
    );

    // Grab the document content to verify it was applied correctly
    // In suggestion mode, the text isn't actually replaced - it's marked as a suggestion
    const d = view.state.doc;
    const docContent = d.textContent;
    expect(docContent).toContain('hello worldeveryone');

    // get the mark at pos 15
    const pos$ = d.resolve(15);
    console.log('marks at 15', pos$.marks);
    const mark = pos$.marks[0];
    // check the mark at pos 15
    expect(mark.attrs.dataReason).toBe('transaction level reason');
    expect(mark.attrs.dataPluginOnlyVar).toBe('true');
    expect(mark.attrs.dataUsername).toBe('transaction level user');

    // Check if suggestion mode returned to its initial state (false)
    const pluginState = suggestionPluginKey.getState(view.state);
    expect(pluginState?.inSuggestionMode).toBe(false);
  });
});
