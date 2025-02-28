import { PluginKey } from "prosemirror-state";

// Define interfaces for plugin state
export interface SuggestionsPluginState {
  inSuggestionMode: boolean;
  username: string;
  data?: Record<string, any>;
  skipHandleTextInput?: boolean;
}

// Plugin key for accessing the plugin state
export const suggestionsPluginKey = new PluginKey<SuggestionsPluginState>(
  "suggestions"
);
