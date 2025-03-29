import { EditorView } from 'prosemirror-view';
import { setSuggestionMode, toggleSuggestionMode } from '../../src';
import { suggestionPluginKey } from '../../src/key';
// Mock dependencies
jest.mock('prosemirror-view');
jest.mock('../../src/key', () => {
  return {
    suggestionPluginKey: {
      getState: jest.fn(),
    },
  };
});
jest.mock('../../src/plugin', () => ({
  suggestionModePlugin: {},
}));

describe('suggestion mode commands', () => {
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
      username: 'testUser',
      inSuggestionMode: false,
      data: {},
    };

    // Mock getState to return our plugin state
    (suggestionPluginKey.getState as jest.Mock).mockReturnValue(
      mockPluginState
    );
  });

  describe('toggleSuggestionMode', () => {
    test('should toggle suggestion mode from false to true', () => {
      mockPluginState.inSuggestionMode = false;

      const result = toggleSuggestionMode(mockState, mockView.dispatch);

      expect(result).toBe(true);
      expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionPluginKey, {
        ...mockPluginState,
        inSuggestionMode: true,
      });
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });

    test('should toggle suggestion mode from true to false', () => {
      mockPluginState.inSuggestionMode = true;

      const result = toggleSuggestionMode(mockState, mockView.dispatch);

      expect(result).toBe(true);
      expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionPluginKey, {
        ...mockPluginState,
        inSuggestionMode: false,
      });
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });

    test('should return false if plugin state is null', () => {
      (suggestionPluginKey.getState as jest.Mock).mockReturnValueOnce(null);

      const result = toggleSuggestionMode(mockState, mockView.dispatch);

      expect(result).toBe(false);
      expect(mockView.dispatch).not.toHaveBeenCalled();
    });

    test('should not dispatch if dispatch is not provided', () => {
      const result = toggleSuggestionMode(mockState, undefined);

      expect(result).toBe(true);
      expect(mockTr.setMeta).not.toHaveBeenCalled();
    });
  });

  describe('setSuggestionMode (backward compatibility)', () => {
    test('should set suggestion mode to true', () => {
      setSuggestionMode(mockView, true);

      expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionPluginKey, {
        ...mockPluginState,
        inSuggestionMode: true,
      });
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });

    test('should set suggestion mode to false', () => {
      setSuggestionMode(mockView, false);

      expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionPluginKey, {
        ...mockPluginState,
        inSuggestionMode: false,
      });
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });

    test('should do nothing if plugin state is null', () => {
      (suggestionPluginKey.getState as jest.Mock).mockReturnValueOnce(null);

      setSuggestionMode(mockView, true);

      expect(mockView.dispatch).not.toHaveBeenCalled();
    });

    test('should preserve existing state properties', () => {
      mockPluginState.customProp = 'customValue';

      setSuggestionMode(mockView, true);

      expect(mockTr.setMeta).toHaveBeenCalledWith(
        suggestionPluginKey,
        expect.objectContaining({
          customProp: 'customValue',
          inSuggestionMode: true,
        })
      );
    });
  });
});
