import { EditorView } from "prosemirror-view";
import { suggestionModePlugin } from "../suggestions";
import { suggestionModePluginKey } from "../key";

export const setSuggestionMode = (
  view: EditorView,
  isSuggestionMode: boolean
) => {
  const state = suggestionModePluginKey.getState(view.state);
  if (!state) return;
  view.dispatch(
    view.state.tr.setMeta(suggestionModePlugin, {
      ...state,
      inSuggestionMode: isSuggestionMode,
    })
  );
};
