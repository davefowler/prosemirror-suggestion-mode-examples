import { PluginKey } from "prosemirror-state";

// Define interfaces for plugin state
export interface SuggestionsPluginState {
  inSuggestionMode: boolean;
  username: string;
  activeMarkRange: { from: number; to: number; createdAt: number } | null;
  data?: Record<string, any>;
  skipHandleTextInput?: boolean;
}

// Plugin key for accessing the plugin state
export const suggestionsPluginKey = new PluginKey<SuggestionsPluginState>(
  "suggestions"
);
