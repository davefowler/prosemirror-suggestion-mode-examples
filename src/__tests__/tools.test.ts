import { suggestEdit, TextSuggestion } from '../tools';
import { EditorView } from 'prosemirror-view';
import { suggestionsPluginKey } from '../suggestions';

// Mock dependencies
jest.mock('prosemirror-view');
jest.mock('../suggestions', () => ({
  suggestionsPluginKey: {
    getState: jest.fn(),
  },
}));

describe('suggestEdit', () => {
  let mockView: jest.Mocked<EditorView>;
  let mockState: any;
  let mockTr: any;
  let mockDoc: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock document
    mockDoc = {
      textContent: 'This is a test document with some text to replace.',
    };
    
    // Setup mock transaction
    mockTr = {
      setMeta: jest.fn().mockReturnThis(),
      replaceWith: jest.fn().mockReturnThis(),
    };
    
    // Setup mock state
    mockState = {
      tr: mockTr,
      doc: mockDoc,
      schema: {
        text: jest.fn((text) => text),
      },
    };
    
    // Setup mock view
    mockView = {
      state: mockState,
      dispatch: jest.fn(),
    } as unknown as jest.Mocked<EditorView>;
    
    // Setup mock plugin state
    const mockPluginState = {
      username: 'originalUser',
      inSuggestionMode: false,
      data: {},
    };
    
    (suggestionsPluginKey.getState as jest.Mock).mockReturnValue(mockPluginState);
  });
  
  test('should return 0 if no plugin state exists', () => {
    (suggestionsPluginKey.getState as jest.Mock).mockReturnValueOnce(null);
    
    const result = suggestEdit(mockView, [], 'testUser');
    
    expect(result).toBe(0);
    expect(mockView.dispatch).not.toHaveBeenCalled();
  });
  
  test('should apply a simple text replacement', () => {
    const suggestions: TextSuggestion[] = [
      {
        textToReplace: 'test',
        textReplacement: 'example',
      },
    ];
    
    const result = suggestEdit(mockView, suggestions, 'testUser');
    
    // Should have called dispatch at least 3 times:
    // 1. To set suggestion mode
    // 2. To apply the replacement
    // 3. To restore original state
    expect(mockView.dispatch).toHaveBeenCalledTimes(3);
    expect(result).toBe(1);
  });
  
  test('should apply a replacement with context', () => {
    const suggestions: TextSuggestion[] = [
      {
        textToReplace: 'text',
        textReplacement: 'content',
        prefix: 'some ',
        suffix: ' to',
      },
    ];
    
    const result = suggestEdit(mockView, suggestions, 'testUser');
    
    expect(mockView.dispatch).toHaveBeenCalledTimes(3);
    expect(result).toBe(1);
  });
  
  test('should include reason in metadata if provided', () => {
    const suggestions: TextSuggestion[] = [
      {
        textToReplace: 'test',
        textReplacement: 'example',
        reason: 'Improved clarity',
      },
    ];
    
    suggestEdit(mockView, suggestions, 'testUser');
    
    // Check if setMeta was called with the reason
    expect(mockTr.setMeta).toHaveBeenCalledWith(
      suggestionsPluginKey,
      expect.objectContaining({
        data: { reason: 'Improved clarity' },
      })
    );
  });
  
  test('should handle errors gracefully', () => {
    // Mock console.error to prevent test output pollution
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    // Force an error by making replaceWith throw
    mockTr.replaceWith.mockImplementationOnce(() => {
      throw new Error('Test error');
    });
    
    const suggestions: TextSuggestion[] = [
      {
        textToReplace: 'test',
        textReplacement: 'example',
      },
    ];
    
    const result = suggestEdit(mockView, suggestions, 'testUser');
    
    expect(result).toBe(0);
    expect(console.error).toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalConsoleError;
  });
  
  test('should handle multiple replacements', () => {
    // Update mock document to have multiple instances
    mockDoc.textContent = 'test document with test content and test examples';
    
    const suggestions: TextSuggestion[] = [
      {
        textToReplace: 'test',
        textReplacement: 'example',
      },
    ];
    
    const result = suggestEdit(mockView, suggestions, 'testUser');
    
    // Should have 3 replacements + 2 state changes = 5 dispatches
    expect(mockView.dispatch).toHaveBeenCalledTimes(5);
    expect(result).toBe(3);
  });
});

describe('escapeRegExp', () => {
  test('should escape special regex characters', () => {
    // We can't directly test the private function, so we'll test it indirectly
    // by using suggestEdit with strings containing special characters
    
    // Setup mock document with special characters
    const specialMockDoc = {
      textContent: 'This has (special) characters like [brackets] and {braces}',
    };
    
    // Create a new mock transaction for this test
    const specialMockTr = {
      setMeta: jest.fn().mockReturnThis(),
      replaceWith: jest.fn().mockReturnThis(),
    };
    
    // Create a new mock view with the special document
    const specialMockState = {
      tr: specialMockTr,
      doc: specialMockDoc,
      schema: {
        text: jest.fn((text) => text),
      },
    };
    
    const specialMockView = {
      state: specialMockState,
      dispatch: jest.fn(),
    } as unknown as jest.Mocked<EditorView>;
    
    // Setup mock plugin state
    (suggestionsPluginKey.getState as jest.Mock).mockReturnValue({
      username: 'originalUser',
      inSuggestionMode: false,
      data: {},
    });
    
    const suggestions: TextSuggestion[] = [
      {
        textToReplace: '(special)',
        textReplacement: 'escaped',
      },
      {
        textToReplace: '[brackets]',
        textReplacement: 'escaped',
      },
    ];
    
    const result = suggestEdit(specialMockView, suggestions, 'testUser');
    
    // Should successfully find and replace both special character strings
    expect(result).toBe(2);
  });
});

describe('handling formatted text', () => {
  let mockView: jest.Mocked<EditorView>;
  let mockState: any;
  let mockTr: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock transaction
    mockTr = {
      setMeta: jest.fn().mockReturnThis(),
      replaceWith: jest.fn().mockReturnThis(),
    };
    
    // Setup mock state
    mockState = {
      tr: mockTr,
      schema: {
        text: jest.fn((text) => text),
      },
    };
    
    // Setup mock view
    mockView = {
      state: mockState,
      dispatch: jest.fn(),
    } as unknown as jest.Mocked<EditorView>;
    
    // Setup mock plugin state
    (suggestionsPluginKey.getState as jest.Mock).mockReturnValue({
      username: 'originalUser',
      inSuggestionMode: false,
      data: {},
    });
  });
  
  test('should handle text with formatting marks correctly', () => {
    // Create a mock document with a more complex structure that includes formatting
    // This simulates a document with text that includes bold formatting
    const mockNode = {
      textContent: 'This is a document with some bolded text to replace.',
      nodeSize: 54,
      content: {
        content: [
          { text: 'This is a document with some ', nodeSize: 28 },
          { 
            marks: [{ type: 'strong' }],
            text: 'bolded',
            nodeSize: 6
          },
          { text: ' text to replace.', nodeSize: 17 }
        ]
      },
      nodesBetween: jest.fn((from, to, callback) => {
        // Simulate the nodesBetween method to call the callback for each node
        // with the correct positions
        callback(mockNode, 0);
        callback(mockNode.content.content[0], 0);
        callback(mockNode.content.content[1], 28);
        callback(mockNode.content.content[2], 34);
      }),
      textBetween: jest.fn((from, to) => {
        // Return the appropriate text slice based on positions
        return mockNode.textContent.slice(from, to);
      })
    };
    
    // Update the mock state with our complex document
    mockState.doc = mockNode;
    
    const suggestions: TextSuggestion[] = [
      {
        textToReplace: 'bolded',
        textReplacement: 'formatted',
      }
    ];
    
    const result = suggestEdit(mockView, suggestions, 'testUser');
    
    // Should find and replace the text correctly despite formatting
    expect(result).toBe(1);
    expect(mockTr.replaceWith).toHaveBeenCalledWith(
      28, // Starting position of "bolded"
      34, // Ending position of "bolded"
      'formatted'
    );
  });
  
  test('should handle text with formatting in prefix/suffix context', () => {
    // Create a mock document with formatting that spans across the context boundaries
    const mockNode = {
      textContent: 'This document has some bolded words in the middle.',
      nodeSize: 51,
      content: {
        content: [
          { text: 'This document has some ', nodeSize: 22 },
          { 
            marks: [{ type: 'strong' }],
            text: 'bolded words',
            nodeSize: 12
          },
          { text: ' in the middle.', nodeSize: 15 }
        ]
      },
      nodesBetween: jest.fn((from, to, callback) => {
        callback(mockNode, 0);
        callback(mockNode.content.content[0], 0);
        callback(mockNode.content.content[1], 22);
        callback(mockNode.content.content[2], 34);
      }),
      textBetween: jest.fn((from, to) => {
        return mockNode.textContent.slice(from, to);
      })
    };
    
    // Update the mock state with our complex document
    mockState.doc = mockNode;
    
    const suggestions: TextSuggestion[] = [
      {
        textToReplace: 'words',
        textReplacement: 'text',
        prefix: 'bolded ',
      }
    ];
    
    const result = suggestEdit(mockView, suggestions, 'testUser');
    
    // Should find and replace the text correctly despite formatting
    expect(result).toBe(1);
    expect(mockTr.replaceWith).toHaveBeenCalledWith(
      29, // Starting position of "words"
      34, // Ending position of "words"
      'text'
    );
  });
  
  test('should handle multiple formatted sections correctly', () => {
    // Create a mock document with multiple formatted sections
    const mockNode = {
      textContent: 'This has bold and italic and underlined text.',
      nodeSize: 45,
      content: {
        content: [
          { text: 'This has ', nodeSize: 9 },
          { 
            marks: [{ type: 'strong' }],
            text: 'bold',
            nodeSize: 4
          },
          { text: ' and ', nodeSize: 5 },
          { 
            marks: [{ type: 'em' }],
            text: 'italic',
            nodeSize: 6
          },
          { text: ' and ', nodeSize: 5 },
          { 
            marks: [{ type: 'underline' }],
            text: 'underlined',
            nodeSize: 10
          },
          { text: ' text.', nodeSize: 6 }
        ]
      },
      nodesBetween: jest.fn((from, to, callback) => {
        callback(mockNode, 0);
        let pos = 0;
        mockNode.content.content.forEach(node => {
          if (pos + node.nodeSize > from && pos < to) {
            callback(node, pos);
          }
          pos += node.nodeSize;
        });
      }),
      textBetween: jest.fn((from, to) => {
        return mockNode.textContent.slice(from, to);
      })
    };
    
    // Update the mock state with our complex document
    mockState.doc = mockNode;
    
    const suggestions: TextSuggestion[] = [
      {
        textToReplace: 'bold',
        textReplacement: 'strong',
      },
      {
        textToReplace: 'italic',
        textReplacement: 'emphasized',
      },
      {
        textToReplace: 'underlined',
        textReplacement: 'highlighted',
      }
    ];
    
    const result = suggestEdit(mockView, suggestions, 'testUser');
    
    // Should find and replace all three formatted sections correctly
    expect(result).toBe(3);
    
    // Check that replaceWith was called with the correct positions for each replacement
    expect(mockTr.replaceWith).toHaveBeenCalledWith(9, 13, 'strong');
    expect(mockTr.replaceWith).toHaveBeenCalledWith(18, 24, 'emphasized');
    expect(mockTr.replaceWith).toHaveBeenCalledWith(29, 39, 'highlighted');
  });
});
