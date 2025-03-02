import { EditorView } from "prosemirror-view";
import { setSuggestionMode } from "../../src/tools/setMode";
import { suggestionsPluginKey } from "../../src/key";
import { suggestionModePlugin } from "../../src/suggestions";

// Mock dependencies
jest.mock("prosemirror-view");
jest.mock("../../src/key", () => ({
  suggestionsPluginKey: {
    getState: jest.fn(),
  },
}));
jest.mock("../../src/suggestions", () => ({
  suggestionsPlugin: {},
}));

describe("setSuggestionMode", () => {
  let mockView: jest.Mocked<EditorView>;
  let mockState: any;
  let mockTr: any;
  let mockPluginState: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock transaction
    mockTr = {
      setMeta: jest.fn().mockReturnThis(),
    };

    // Setup mock state
    mockState = {
      tr: mockTr,
    };

    // Setup mock view
    mockView = {
      state: mockState,
      dispatch: jest.fn(),
    } as unknown as jest.Mocked<EditorView>;

    // Setup mock plugin state
    mockPluginState = {
      username: "testUser",
      inSuggestionMode: false,
      data: {},
    };

    // Mock getState to return our plugin state
    (suggestionsPluginKey.getState as jest.Mock).mockReturnValue(
      mockPluginState
    );
  });

  test("should set suggestion mode to true", () => {
    setSuggestionMode(mockView, true);

    // Should set meta with updated state
    expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionModePlugin, {
      ...mockPluginState,
      inSuggestionMode: true,
    });

    // Should dispatch the transaction
    expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
  });

  test("should set suggestion mode to false", () => {
    setSuggestionMode(mockView, false);

    // Should set meta with updated state
    expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionModePlugin, {
      ...mockPluginState,
      inSuggestionMode: false,
    });

    // Should dispatch the transaction
    expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
  });

  test("should do nothing if plugin state is null", () => {
    // Mock getState to return null
    (suggestionsPluginKey.getState as jest.Mock).mockReturnValueOnce(null);

    setSuggestionMode(mockView, true);

    // Should not dispatch
    expect(mockView.dispatch).not.toHaveBeenCalled();
  });

  test("should preserve existing state properties", () => {
    // Add some custom data to the plugin state
    mockPluginState.customProp = "customValue";

    setSuggestionMode(mockView, true);

    // Should preserve custom properties
    expect(mockTr.setMeta).toHaveBeenCalledWith(
      suggestionModePlugin,
      expect.objectContaining({
        customProp: "customValue",
        inSuggestionMode: true,
      })
    );
  });
});
