import { PluginKey } from "prosemirror-state";

// Define interfaces for plugin state
export interface SuggestionModePluginState {
  inSuggestionMode: boolean;
  username: string;
  data?: Record<string, any>;
  skipHandleTextInput?: boolean;
}

// Plugin key for accessing the plugin state
export const suggestionModePluginKey = new PluginKey<SuggestionModePluginState>(
  "suggestions"
);
