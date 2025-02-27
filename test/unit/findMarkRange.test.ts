import { EditorState } from "prosemirror-state";
import { findMarkRange } from "../../src/suggestions";
import { Mark } from "prosemirror-model";

// Mock dependencies
jest.mock("prosemirror-state");
jest.mock("prosemirror-model");

describe("findMarkRange", () => {
  let mockState: EditorState;
  let mockDoc: any;
  let mockMark: Mark;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock mark
    mockMark = {
      type: { name: "suggestion_add" },
      eq: jest.fn((other) => other.type.name === "suggestion_add"),
    } as unknown as Mark;

    // Setup mock document
    mockDoc = {
      resolve: jest.fn().mockReturnValue({
        nodeAfter: {
          marks: [mockMark],
        },
        nodeBefore: null,
      }),
      content: { size: 100 },
    };

    // Setup mock state
    mockState = {
      doc: mockDoc,
    } as unknown as EditorState;
  });

  test("should find mark range when mark exists", () => {
    // Setup mock document to simulate a mark spanning positions 10-15
    mockDoc.resolve = jest.fn((pos) => {
      if (pos === 10) {
        return {
          nodeAfter: {
            marks: [mockMark],
          },
          nodeBefore: null,
        };
      } else if (pos > 10 && pos < 15) {
        return {
          nodeAfter: {
            marks: [mockMark],
          },
          nodeBefore: {
            marks: [mockMark],
          },
        };
      } else {
        return {
          nodeAfter: null,
          nodeBefore: {
            marks: pos === 15 ? [mockMark] : [],
          },
        };
      }
    });

    const result = findMarkRange(mockState, 12, "suggestion_add");

    expect(result).not.toBeNull();
    if (result) {
      expect(result.from).toBe(10);
      expect(result.to).toBe(15);
      expect(result.mark).toBe(mockMark);
    }
  });

  test("should return null when mark doesn't exist", () => {
    // Setup mock document to simulate no marks
    mockDoc.resolve = jest.fn(() => ({
      nodeAfter: {
        marks: [],
      },
      nodeBefore: {
        marks: [],
      },
    }));

    const result = findMarkRange(mockState, 10, "suggestion_add");

    expect(result).toBeNull();
  });

  test("should return null when nodes don't exist", () => {
    // Setup mock document to simulate no nodes
    mockDoc.resolve = jest.fn(() => ({
      nodeAfter: null,
      nodeBefore: null,
    }));

    const result = findMarkRange(mockState, 10, "suggestion_add");

    expect(result).toBeNull();
  });

  test("should handle mark at document start", () => {
    // Setup mock document to simulate a mark at the start
    mockDoc.resolve = jest.fn((pos) => {
      if (pos === 0) {
        return {
          nodeAfter: {
            marks: [mockMark],
          },
          nodeBefore: null,
        };
      } else if (pos > 0 && pos < 5) {
        return {
          nodeAfter: {
            marks: [mockMark],
          },
          nodeBefore: {
            marks: [mockMark],
          },
        };
      } else {
        return {
          nodeAfter: null,
          nodeBefore: {
            marks: pos === 5 ? [mockMark] : [],
          },
        };
      }
    });

    const result = findMarkRange(mockState, 0, "suggestion_add");

    expect(result).not.toBeNull();
    if (result) {
      expect(result.from).toBe(0);
      expect(result.to).toBe(5);
      expect(result.mark).toBe(mockMark);
    }
  });

  test("should handle mark at document end", () => {
    const docSize = 100;
    
    // Setup mock document to simulate a mark at the end
    mockDoc.resolve = jest.fn((pos) => {
      if (pos >= docSize - 5 && pos < docSize) {
        return {
          nodeAfter: pos < docSize - 1 ? {
            marks: [mockMark],
          } : null,
          nodeBefore: {
            marks: [mockMark],
          },
        };
      } else {
        return {
          nodeAfter: {
            marks: [],
          },
          nodeBefore: {
            marks: [],
          },
        };
      }
    });

    const result = findMarkRange(mockState, docSize - 3, "suggestion_add");

    expect(result).not.toBeNull();
    if (result) {
      expect(result.from).toBe(docSize - 5);
      expect(result.to).toBe(docSize);
      expect(result.mark).toBe(mockMark);
    }
  });
});
