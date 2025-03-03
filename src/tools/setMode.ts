import { EditorView } from "prosemirror-view";
import { suggestionModePluginKey } from "../key";

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
