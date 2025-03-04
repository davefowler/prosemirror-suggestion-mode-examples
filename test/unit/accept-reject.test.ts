import { EditorView } from "prosemirror-view";
import { Mark } from "prosemirror-model";
import { acceptSuggestion, rejectSuggestion, acceptAllSuggestions, rejectAllSuggestions } from "../../src/tools/accept-reject";
import { suggestionModePluginKey } from "../../src/key";

// Mock dependencies
jest.mock("prosemirror-view");
jest.mock("../../src/key", () => {
  return {
    suggestionModePluginKey: {
      getState: jest.fn(),
    },
  };
});

describe("accept-reject functions", () => {
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
        callback({ 
          marks: [mockAddMark], 
          nodeSize: 5 
        }, 10);
        callback({ 
          marks: [mockDeleteMark], 
          nodeSize: 5 
        }, 20);
        callback({ 
          marks: [], 
          nodeSize: 5 
        }, 30);
      }),
      content: {
        size: 100
      },
      descendants: jest.fn((callback) => {
        // Simulate calling the callback for nodes with marks
        callback({ 
          marks: [mockAddMark], 
          nodeSize: 5 
        }, 10);
        callback({ 
          marks: [mockDeleteMark], 
          nodeSize: 5 
        }, 20);
        callback({ 
          marks: [], 
          nodeSize: 5 
        }, 30);
      }),
    };

    // Setup mock state
    mockState = {
      tr: mockTr,
      doc: mockDoc,
      schema: {
        marks: {
          suggestion_add: { create: jest.fn() },
          suggestion_delete: { create: jest.fn() }
        }
      }
    };

    // Setup mock view
    mockView = {
      state: mockState,
      dispatch: jest.fn(),
    } as unknown as jest.Mocked<EditorView>;

    // Setup mock marks
    mockAddMark = {
      type: { name: "suggestion_add" },
      eq: jest.fn((other) => other.type.name === "suggestion_add"),
    } as unknown as Mark;

    mockDeleteMark = {
      type: { name: "suggestion_delete" },
      eq: jest.fn((other) => other.type.name === "suggestion_delete"),
    } as unknown as Mark;
  });

  describe("acceptSuggestion", () => {
    test("should remove mark but keep text for suggestion_add", () => {
      acceptSuggestion(mockView, mockAddMark, 10);

      // Should set meta to mark this as a suggestion operation
      expect(mockTr.setMeta).toHaveBeenCalledWith(
        suggestionModePluginKey, 
        { suggestionOperation: true }
      );

      // Should remove the mark but not delete the text
      expect(mockTr.removeMark).toHaveBeenCalled();
      expect(mockTr.delete).not.toHaveBeenCalled();
      
      // Should dispatch the transaction
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });

    test("should remove both mark and text for suggestion_delete", () => {
      acceptSuggestion(mockView, mockDeleteMark, 20);

      // Should set meta to mark this as a suggestion operation
      expect(mockTr.setMeta).toHaveBeenCalledWith(
        suggestionModePluginKey, 
        { suggestionOperation: true }
      );

      // Should delete the text (not just remove the mark)
      expect(mockTr.delete).toHaveBeenCalled();
      expect(mockTr.removeMark).not.toHaveBeenCalled();
      
      // Should dispatch the transaction
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });
  });

  describe("rejectSuggestion", () => {
    test("should remove both mark and text for suggestion_add", () => {
      rejectSuggestion(mockView, mockAddMark, 10);

      // Should set meta to mark this as a suggestion operation
      expect(mockTr.setMeta).toHaveBeenCalledWith(
        suggestionModePluginKey, 
        { suggestionOperation: true }
      );

      // Should delete the text
      expect(mockTr.delete).toHaveBeenCalled();
      expect(mockTr.removeMark).not.toHaveBeenCalled();
      
      // Should dispatch the transaction
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });

    test("should remove mark but keep text for suggestion_delete", () => {
      rejectSuggestion(mockView, mockDeleteMark, 20);

      // Should set meta to mark this as a suggestion operation
      expect(mockTr.setMeta).toHaveBeenCalledWith(
        suggestionModePluginKey, 
        { suggestionOperation: true }
      );

      // Should remove the mark but not delete the text
      expect(mockTr.removeMark).toHaveBeenCalled();
      expect(mockTr.delete).not.toHaveBeenCalled();
      
      // Should dispatch the transaction
      expect(mockView.dispatch).toHaveBeenCalledWith(mockTr);
    });
  });

  describe("acceptAllSuggestions", () => {
    test("should process all suggestions in the document", () => {
      // Create a spy on acceptSuggestion
      const acceptSpy = jest.spyOn(require("../../src/tools/accept-reject"), "acceptSuggestion");
      
      acceptAllSuggestions(mockView);
      
      // Should call acceptSuggestion for each suggestion mark
      expect(acceptSpy).toHaveBeenCalledTimes(2);
      expect(acceptSpy).toHaveBeenCalledWith(mockView, mockAddMark, 10);
      expect(acceptSpy).toHaveBeenCalledWith(mockView, mockDeleteMark, 20);
    });
  });

  describe("rejectAllSuggestions", () => {
    test("should process all suggestions in the document", () => {
      // Create a spy on rejectSuggestion
      const rejectSpy = jest.spyOn(require("../../src/tools/accept-reject"), "rejectSuggestion");
      
      rejectAllSuggestions(mockView);
      
      // Should call rejectSuggestion for each suggestion mark
      expect(rejectSpy).toHaveBeenCalledTimes(2);
      expect(rejectSpy).toHaveBeenCalledWith(mockView, mockAddMark, 10);
      expect(rejectSpy).toHaveBeenCalledWith(mockView, mockDeleteMark, 20);
    });
  });

  describe("error handling", () => {
    test("should throw errors in acceptSuggestion", () => {
      // Force an error by making nodesBetween throw
      mockDoc.nodesBetween.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      // Call the function and expect it to throw
      expect(() => {
        acceptSuggestion(mockView, mockAddMark, 10);
      }).toThrow("Test error");

      // Should not dispatch the transaction when an error occurs
      expect(mockView.dispatch).not.toHaveBeenCalled();
    });

    test("should throw errors in rejectSuggestion", () => {
      // Force an error by making nodesBetween throw
      mockDoc.nodesBetween.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      // Call the function and expect it to throw
      expect(() => {
        rejectSuggestion(mockView, mockDeleteMark, 20);
      }).toThrow("Test error");

      // Should not dispatch the transaction when an error occurs
      expect(mockView.dispatch).not.toHaveBeenCalled();
    });
  });
});
