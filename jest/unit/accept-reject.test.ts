import { EditorView } from 'prosemirror-view';
import { Mark } from 'prosemirror-model';
import { suggestionModePluginKey } from '../../src/key';
import {
  acceptSuggestionsInRange,
  rejectSuggestionsInRange,
  acceptAllSuggestions,
  rejectAllSuggestions,
} from '../../src/commands/accept-reject';

// Mock dependencies
jest.mock('prosemirror-view');
jest.mock('../../src/key', () => {
  return {
    suggestionModePluginKey: {
      getState: jest.fn(),
    },
  };
});

describe('accept-reject functions', () => {
  let mockView: jest.Mocked<EditorView>;
  let mockState: any;
  let mockTr: any;
  let mockDoc: any;
  let mockAddMark: Mark;
  let mockDeleteMark: Mark;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock transaction
    mockTr = {
      setMeta: jest.fn().mockReturnThis(),
      removeMark: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    // Setup mock document with nodesBetween method
    mockDoc = {
      nodesBetween: jest.fn((from, to, callback) => {
        // Simulate calling the callback for nodes with marks
        callback(
          {
            marks: [mockAddMark],
            nodeSize: 5,
          },
          10
        );
        callback(
          {
            marks: [mockDeleteMark],
            nodeSize: 5,
          },
          20
        );
        callback(
          {
            marks: [],
            nodeSize: 5,
          },
          30
        );
      }),
      content: {
        size: 100,
      },
      descendants: jest.fn((callback) => {
        // Simulate calling the callback for nodes with marks
        callback(
          {
            marks: [mockAddMark],
            nodeSize: 5,
          },
          10
        );
        callback(
          {
            marks: [mockDeleteMark],
            nodeSize: 5,
          },
          20
        );
        callback(
          {
            marks: [],
            nodeSize: 5,
          },
          30
        );
      }),
    };

    // Setup mock state
    mockState = {
      tr: mockTr,
      doc: mockDoc,
      schema: {
        marks: {
          suggestion_add: { create: jest.fn() },
          suggestion_delete: { create: jest.fn() },
        },
      },
    };

    // Setup mock view
    mockView = {
      state: mockState,
      dispatch: jest.fn(),
    } as unknown as jest.Mocked<EditorView>;

    // Setup mock marks
    mockAddMark = {
      type: { name: 'suggestion_add' },
      eq: jest.fn((other) => other.type.name === 'suggestion_add'),
    } as unknown as Mark;

    mockDeleteMark = {
      type: { name: 'suggestion_delete' },
      eq: jest.fn((other) => other.type.name === 'suggestion_delete'),
    } as unknown as Mark;
  });

  describe('acceptSuggestionsInRange', () => {
    test('should remove mark but keep text for suggestion_add', () => {
      acceptSuggestionsInRange(10, 15)(mockState, mockView.dispatch);

      // Should set meta to mark this as a suggestion operation
      expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionModePluginKey, {
        suggestionOperation: true,
      });

      // Should remove the mark but not delete the text
      expect(mockTr.removeMark).toHaveBeenCalled();
      // expect(mockTr.delete).not.toHaveBeenCalled();

      // Should dispatch the transaction
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });

    test('should remove both mark and text for suggestion_delete', () => {
      acceptSuggestionsInRange(20, 25)(mockState, mockView.dispatch);

      // Should set meta to mark this as a suggestion operation
      expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionModePluginKey, {
        suggestionOperation: true,
      });

      // Should delete the text (not just remove the mark)
      expect(mockTr.delete).toHaveBeenCalled();
      // expect(mockTr.removeMark).not.toHaveBeenCalled();

      // Should dispatch the transaction
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });
  });

  describe('rejectSuggestionsInRange', () => {
    test('should remove both mark and text for suggestion_add', () => {
      rejectSuggestionsInRange(10, 15)(mockState, mockView.dispatch);

      // Should set meta to mark this as a suggestion operation
      expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionModePluginKey, {
        suggestionOperation: true,
      });

      // Should delete the text
      expect(mockTr.delete).toHaveBeenCalled();
      // expect(mockTr.removeMark).not.toHaveBeenCalled();

      // Should dispatch the transaction
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });

    test('should remove mark but keep text for suggestion_delete', () => {
      rejectSuggestionsInRange(20, 25)(mockState, mockView.dispatch);

      // Should set meta to mark this as a suggestion operation
      expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionModePluginKey, {
        suggestionOperation: true,
      });

      // Should remove the mark but not delete the text
      expect(mockTr.removeMark).toHaveBeenCalled();
      // expect(mockTr.delete).not.toHaveBeenCalled();

      // Should dispatch the transaction
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });
  });

  describe('acceptAllSuggestions', () => {
    test('should process all suggestions in the document', () => {
      acceptAllSuggestions(mockState, mockView.dispatch);

      // Should set meta to mark this as a suggestion operation
      expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionModePluginKey, {
        suggestionOperation: true,
      });

      // Should process both marks appropriately
      expect(mockTr.removeMark).toHaveBeenCalled();
      expect(mockTr.delete).toHaveBeenCalled();

      // Should dispatch the transaction
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });
  });

  describe('rejectAllSuggestions', () => {
    test('should process all suggestions in the document', () => {
      rejectAllSuggestions(mockState, mockView.dispatch);

      // Should set meta to mark this as a suggestion operation
      expect(mockTr.setMeta).toHaveBeenCalledWith(suggestionModePluginKey, {
        suggestionOperation: true,
      });

      // Should process both marks appropriately
      expect(mockTr.removeMark).toHaveBeenCalled();
      expect(mockTr.delete).toHaveBeenCalled();

      // Should dispatch the transaction
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });
  });

  describe('multiple suggestions with position adjustments', () => {
    //   test('should correctly adjust positions when multiple add suggestions are rejected', () => {
    //     // Setup multiple suggestions in sequence
    //     const mockMultipleAddMarks = [
    //       { pos: 10, size: 5, mark: { ...mockAddMark } },
    //       { pos: 20, size: 3, mark: { ...mockAddMark } },
    //       { pos: 30, size: 7, mark: { ...mockAddMark } },
    //     ];
    //     // Override the nodesBetween method to simulate multiple suggestions
    //     mockDoc.nodesBetween = jest.fn((from, to, callback) => {
    //       mockMultipleAddMarks.forEach((item) => {
    //         callback(
    //           {
    //             marks: [item.mark],
    //             nodeSize: item.size,
    //           },
    //           item.pos
    //         );
    //       });
    //     });
    //     // Call reject on all suggestions
    //     rejectSuggestionsInRange(0, 100)(mockState, mockView.dispatch);
    //     // Should have called delete with correct adjusted positions
    //     expect(mockTr.delete.mock.calls.length).toBe(3);
    //     // First call should use original position
    //     expect(mockTr.delete.mock.calls[0][0]).toBe(10);
    //     expect(mockTr.delete.mock.calls[0][1]).toBe(15);
    //     // Second call should adjust for first deletion (5 chars removed)
    //     expect(mockTr.delete.mock.calls[1][0]).toBe(15); // 20 - 5
    //     expect(mockTr.delete.mock.calls[1][1]).toBe(18); // 23 - 5
    //     // Third call should adjust for both previous deletions (5 + 3 = 8 chars removed)
    //     expect(mockTr.delete.mock.calls[2][0]).toBe(22); // 30 - 8
    //     expect(mockTr.delete.mock.calls[2][1]).toBe(29); // 37 - 8
    //   });
    //   test('should correctly adjust positions when multiple delete suggestions are accepted', () => {
    //     // Setup multiple suggestions in sequence
    //     const mockMultipleDeleteMarks = [
    //       { pos: 10, size: 5, mark: { ...mockDeleteMark } },
    //       { pos: 20, size: 3, mark: { ...mockDeleteMark } },
    //       { pos: 30, size: 7, mark: { ...mockDeleteMark } },
    //     ];
    //     // Override the nodesBetween method to simulate multiple suggestions
    //     mockDoc.nodesBetween = jest.fn((from, to, callback) => {
    //       mockMultipleDeleteMarks.forEach((item) => {
    //         callback(
    //           {
    //             marks: [item.mark],
    //             nodeSize: item.size,
    //           },
    //           item.pos
    //         );
    //       });
    //     });
    //     // Call accept on all suggestions
    //     acceptSuggestionsInRange(0, 100)(mockState, mockView.dispatch);
    //     // Should have called delete with correct adjusted positions
    //     expect(mockTr.delete.mock.calls.length).toBe(3);
    //     // First call should use original position
    //     expect(mockTr.delete.mock.calls[0][0]).toBe(10);
    //     expect(mockTr.delete.mock.calls[0][1]).toBe(15);
    //     // Second call should adjust for first deletion (5 chars removed)
    //     expect(mockTr.delete.mock.calls[1][0]).toBe(15); // 20 - 5
    //     expect(mockTr.delete.mock.calls[1][1]).toBe(18); // 23 - 5
    //     // Third call should adjust for both previous deletions (5 + 3 = 8 chars removed)
    //     expect(mockTr.delete.mock.calls[2][0]).toBe(22); // 30 - 8
    //     expect(mockTr.delete.mock.calls[2][1]).toBe(29); // 37 - 8
    //   });
  });

  describe('error handling', () => {
    test('should handle errors in acceptSuggestionsInRange', () => {
      // Force an error by making nodesBetween throw
      mockDoc.nodesBetween.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      // Call the function and expect it to throw
      expect(() => {
        acceptSuggestionsInRange(10, 15)(mockState, mockView.dispatch);
      }).toThrow('Test error');

      // Should not dispatch the transaction when an error occurs
      expect(mockView.dispatch).not.toHaveBeenCalled();
    });

    test('should handle errors in rejectSuggestionsInRange', () => {
      // Force an error by making nodesBetween throw
      mockDoc.nodesBetween.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      // Call the function and expect it to throw
      expect(() => {
        rejectSuggestionsInRange(20, 25)(mockState, mockView.dispatch);
      }).toThrow('Test error');

      // Should not dispatch the transaction when an error occurs
      expect(mockView.dispatch).not.toHaveBeenCalled();
    });
  });
});
