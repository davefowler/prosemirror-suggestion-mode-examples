import { Command, EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { suggestionModePluginKey } from '../key';

export const toggleSuggestionMode: Command = (state: EditorState, dispatch) => {
  const pluginState = suggestionModePluginKey.getState(state);
  if (!pluginState) return false;

  if (dispatch) {
    dispatch(
      state.tr.setMeta(suggestionModePluginKey, {
        ...pluginState,
        inSuggestionMode: !pluginState.inSuggestionMode,
      })
    );
  }
  return true;
};

// Keep the old function for backward compatibility
export const setSuggestionMode = (
  view: EditorView,
  isSuggestionMode: boolean
) => {
  const state = suggestionModePluginKey.getState(view.state);
  if (!state) return;
  view.dispatch(
    view.state.tr.setMeta(suggestionModePluginKey, {
      ...state,
      inSuggestionMode: isSuggestionMode,
    })
  );
};
