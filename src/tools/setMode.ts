import { EditorView } from "prosemirror-view";
import { suggestionsPluginKey } from "../key";

export const setSuggestionMode = (
  view: EditorView,
  isSuggestionMode: boolean
) => {
  const state = suggestionsPluginKey.getState(view.state);
  if (!state) return;
  view.dispatch(
    view.state.tr.setMeta(suggestionsPluginKey, {
      ...state,
      inSuggestionMode: isSuggestionMode,
    })
  );
};
