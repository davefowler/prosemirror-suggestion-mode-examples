// Export all public API components
export { suggestionModePlugin, findMarkRange } from "./suggestions";
export { suggestionModePluginKey } from "./key";
export type { SuggestionModePluginState } from "./key";
export { addSuggestionMarks } from "./schema";

export {
  suggestEdit,
  acceptAllSuggestions,
  rejectAllSuggestions,
  setSuggestionMode,
  TextSuggestion,
} from "./tools";
