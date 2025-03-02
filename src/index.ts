// Export all public API components
export { suggestionModePlugin as suggestionsPlugin } from "./suggestions";
export { suggestionsPluginKey } from "./key";
export type { SuggestionsPluginState } from "./key";
export { addSuggestionMarks } from "./schema";

export {
  suggestEdit,
  acceptAllSuggestions,
  rejectAllSuggestions,
  setSuggestionMode,
  TextSuggestion,
} from "./tools";
