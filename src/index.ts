// Export all public API components
export { suggestionModePlugin } from './suggestions';
export { acceptAllSuggestions, rejectAllSuggestions } from './commands';
export { setSuggestionMode, toggleSuggestionMode } from './commands';
export { suggestionModePluginKey } from './key';
export type { SuggestionModePluginState } from './key';
export { addSuggestionMarks } from './schema';

export { suggestEdit, TextSuggestion } from './commands';
