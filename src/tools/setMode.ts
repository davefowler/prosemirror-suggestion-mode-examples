import { EditorView } from "prosemirror-view";
import { suggestionModePlugin } from "../suggestions";
import { suggestionsPluginKey } from "../key";

export const setSuggestionMode = (
  view: EditorView,
  isSuggestionMode: boolean
) => {
  const state = suggestionsPluginKey.getState(view.state);
  if (!state) return;
  view.dispatch(
    view.state.tr.setMeta(suggestionModePlugin, {
      ...state,
      inSuggestionMode: isSuggestionMode,
    })
  );
};
