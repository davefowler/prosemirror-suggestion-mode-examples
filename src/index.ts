// Export all public API components
export { suggestionsPlugin } from "./suggestions";
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
