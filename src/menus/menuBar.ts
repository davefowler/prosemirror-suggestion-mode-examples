import { MenuItem } from 'prosemirror-menu';
import { EditorState } from 'prosemirror-state';
import {
  acceptAllSuggestions,
  rejectAllSuggestions,
  toggleSuggestionMode,
} from '../commands';
import { suggestionModePluginKey } from '../key';

const hasSuggestions = (state: EditorState): boolean => {
  let found = false;
  state.doc.descendants((node) => {
    if (node.marks.some((mark) => mark.type.name === 'suggestion')) {
      found = true;
      return false;
    }
    return true;
  });
  return found;
};

export const getSuggestionMenuItems = () => [
  new MenuItem({
    title: 'Toggle Suggestion Mode',
    label: '✏️ Suggestion Mode',
    enable: () => true,
    active(state) {
      const pluginState = suggestionModePluginKey.getState(state);
      return pluginState?.inSuggestionMode || false;
    },
    run: toggleSuggestionMode,
  }),
  new MenuItem({
    title: 'Accept All',
    label: '✅ All',
    enable: hasSuggestions,
    run: acceptAllSuggestions,
  }),
  new MenuItem({
    title: 'Reject All',
    label: '❌ All',
    enable: hasSuggestions,
    run: rejectAllSuggestions,
  }),
];
