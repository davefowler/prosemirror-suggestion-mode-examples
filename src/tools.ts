import { EditorView } from "prosemirror-view";
import { suggestionsPluginKey } from "./suggestions";

export type TextSuggestion = {
  textToReplace: string;
  textReplacement: string;
  reason?: string;
  prefix?: string;
  suffix?: string;
};

/**
 * Apply text based search replace helpful for AI suggestions
 * @param view The editor view
 * @param suggestions Array of suggested edits with context
 * @param username Name to attribute suggestions to
 * @returns Number of applied suggestions
 *
 * See examples/suggestEdit/ for an example
 */
export const suggestEdit = (
  view: EditorView,
  suggestions: Array<TextSuggestion>,
  username: string
) => {
  // Store current state
  const startingState = suggestionsPluginKey.getState(view.state);
  if (!startingState) return 0;

  view.dispatch(
    view.state.tr.setMeta(suggestionsPluginKey, {
      ...startingState,
      username,
      inSuggestionMode: true,
    })
  );

  const docText = view.state.doc.textContent;
  let replacementCount = 0;

  // Apply each suggestion with context matching
  suggestions.forEach((suggestion) => {
    try {
      let targetPositions: { from: number; to: number }[] = [];

      // Find matches with or without context
      const prefix = suggestion.prefix || "";
      const suffix = suggestion.suffix || "";
      const pattern =
        escapeRegExp(prefix) +
        escapeRegExp(suggestion.textToReplace) +
        escapeRegExp(suffix);
      const regex = new RegExp(pattern, "g");

      // Find matches
      let match;
      while ((match = regex.exec(docText)) !== null) {
        // Calculate the position of just the 'textToReplace' part
        const matchStart = match.index + prefix.length;
        const matchEnd = matchStart + suggestion.textToReplace.length;

        targetPositions.push({ from: matchStart, to: matchEnd });
      }

      // Apply replacements in reverse order to avoid position shifts
      targetPositions.reverse().forEach(({ from, to }) => {
        const tr = view.state.tr;

        // Store reason in metadata if available
        if (suggestion.reason) {
          tr.setMeta(suggestionsPluginKey, {
            data: { reason: suggestion.reason },
          });
        }

        // Replace the text
        tr.replaceWith(
          from,
          to,
          view.state.schema.text(suggestion.textReplacement)
        );
        view.dispatch(tr);
        replacementCount++;
      });
    } catch (error) {
      console.error("Error applying edit suggestion:", error);
    }
  });

  // Restore original username
  view.dispatch(
    view.state.tr.setMeta(suggestionsPluginKey, {
      ...suggestionsPluginKey.getState(view.state),
      username: startingState.username,
      data: startingState.data,
      inSuggestionMode: startingState.inSuggestionMode,
    })
  );

  return replacementCount;
};

/**
 * Helper to escape special characters in a string for use in a regex
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
