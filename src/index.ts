// Export all public API components

// Plugin core
export { suggestionModePlugin } from './plugin.js';
export type { SuggestionModePluginOptions } from './plugin.js';
export { suggestionPluginKey, suggestionTransactionKey } from './key.js';
export type { SuggestionModePluginState } from './key.js';

export * from './commands/accept-reject.js';
export * from './commands/setMode.js';
export * from './commands/applySuggestion.js';
export * from './menus/hoverMenu.js';
export { getSuggestionMenuItems } from './menus/menuBar.js';

// Schema
export { addSuggestionMarks } from './schema.js';
