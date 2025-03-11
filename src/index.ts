// Export all public API components

// Plugin core
export { suggestionModePlugin } from './plugin';
export { suggestionModePluginKey } from './key';
export type { SuggestionModePluginState } from './key';

// Commands
export {
  acceptAllSuggestions,
  rejectAllSuggestions,
  setSuggestionMode,
  toggleSuggestionMode,
  createApplySuggestionCommand,
  applySuggestion,
} from './commands';
export type { TextSuggestion } from './commands';

// Schema
export { addSuggestionMarks } from './schema';

// UI components
export { getSuggestionMenuItems } from './menus/menuBar';
