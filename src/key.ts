import { PluginKey } from 'prosemirror-state';

// Define interfaces for plugin state
export interface SuggestionModePluginState {
  inSuggestionMode: boolean;
  username: string;
  data?: Record<string, any>;
  skipHandleTextInput?: boolean;
}

// For global state
export const suggestionPluginKey = new PluginKey<SuggestionModePluginState>(
  'suggestion-mode'
);

// For transaction-only hints - will temporarily override the global state
export const suggestionTransactionKey =
  new PluginKey<SuggestionModePluginState>('suggestion-mode-transaction');
