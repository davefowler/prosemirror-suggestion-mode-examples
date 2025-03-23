// Export all public API components

// Plugin core
export { suggestionModePlugin, SuggestionModePluginOptions } from './plugin';
export { suggestionPluginKey, suggestionTransactionKey } from './key';
export type { SuggestionModePluginState } from './key';

export * from './commands/accept-reject';
export * from './commands/setMode';
export * from './commands/applySuggestion';

// Schema
export { addSuggestionMarks } from './schema';
