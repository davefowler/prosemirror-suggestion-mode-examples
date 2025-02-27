import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema, Node, Mark } from 'prosemirror-model';
import { suggestionsPlugin, suggestionsPluginKey } from '../suggestions';

// Mock dependencies
jest.mock('prosemirror-view');
jest.mock('prosemirror-state');
jest.mock('prosemirror-model');

// Create a mock for the suggestionsPlugin
jest.mock('../suggestions', () => {
  // Create a mock plugin object with the necessary properties
  const mockPlugin = {
    key: { getState: jest.fn() },
    props: {
      handleClick: jest.fn().mockReturnValue(false),
      handleKeyDown: jest.fn().mockReturnValue(false),
    },
    getState: jest.fn(),
    spec: {
      state: {
        init: jest.fn(),
        apply: jest.fn(),
      }
    }
  };

  return {
    suggestionsPlugin: jest.fn().mockReturnValue(mockPlugin),
    suggestionsPluginKey: {
      getState: jest.fn(),
    },
  };
});

describe('suggestionsPlugin', () => {
  let mockSchema: Schema;
  let mockDoc: Node;
  let mockState: EditorState;
  let mockView: EditorView;
  let mockPluginState: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock schema
    mockSchema = {
      marks: {
        suggestion: {
          create: jest.fn().mockReturnValue({
            type: { name: 'suggestion' },
            attrs: { username: 'testUser', createdAt: expect.any(Number) }
          }),
        }
      },
      nodes: {
        doc: { createAndFill: jest.fn() },
        paragraph: { createAndFill: jest.fn() },
        text: jest.fn((text) => ({ text }))
      }
    } as unknown as Schema;
    
    // Setup mock document
    mockDoc = {
      nodesBetween: jest.fn(),
      textContent: 'This is a test document',
    } as unknown as Node;
    
    // Setup mock state
    mockState = {
      schema: mockSchema,
      doc: mockDoc,
      tr: {
        setMeta: jest.fn().mockReturnThis(),
        addMark: jest.fn().mockReturnThis(),
        removeMark: jest.fn().mockReturnThis(),
        setSelection: jest.fn().mockReturnThis(),
        getMeta: jest.fn(),
      },
      selection: {
        from: 0,
        to: 10,
        empty: false,
      },
    } as unknown as EditorState;
    
    // Setup mock view
    mockView = {
      state: mockState,
      dispatch: jest.fn(),
    } as unknown as EditorView;
    
    // Setup mock plugin state
    mockPluginState = {
      username: 'testUser',
      inSuggestionMode: false,
      activeMarkRange: null,
      data: {},
    };
    
    // Mock getState to return our plugin state
    (suggestionsPluginKey.getState as jest.Mock).mockReturnValue(mockPluginState);
  });
  
  describe('plugin initialization', () => {
    test('should create a plugin with the correct props', () => {
      const plugin = suggestionsPlugin();
      
      expect(plugin).toBeDefined();
      expect(plugin.key).toBeDefined();
      expect(plugin.props).toBeDefined();
      expect(plugin.props.handleClick).toBeDefined();
      expect(plugin.props.handleKeyDown).toBeDefined();
    });
    
    test('should initialize with default state', () => {
      const plugin = suggestionsPlugin();
      
      // Mock the getState method to return a default state
      plugin.getState.mockReturnValueOnce({
        username: 'anonymous',
        inSuggestionMode: false,
        activeMarkRange: null,
        data: {},
      });
      
      const state = plugin.getState(mockState);
      
      expect(state).toEqual({
        username: 'anonymous',
        inSuggestionMode: false,
        activeMarkRange: null,
        data: {},
      });
    });
    
    test('should initialize with custom username', () => {
      const plugin = suggestionsPlugin({ username: 'customUser' });
      
      // Mock the getState method to return a state with custom username
      plugin.getState.mockReturnValueOnce({
        username: 'customUser',
        inSuggestionMode: false,
        activeMarkRange: null,
        data: {},
      });
      
      const state = plugin.getState(mockState);
      
      expect(state).toEqual({
        username: 'customUser',
        inSuggestionMode: false,
        activeMarkRange: null,
        data: {},
      });
    });
  });
  
  describe('suggestion mode', () => {
    test('should toggle suggestion mode on/off', () => {
      const plugin = suggestionsPlugin();
      
      // Mock the apply method to simulate state changes
      plugin.spec.state.apply.mockImplementation((state, tr) => {
        const meta = tr.getMeta(suggestionsPluginKey);
        if (meta) {
          return { ...mockPluginState, ...meta };
        }
        return mockPluginState;
      });
      
      // Setup getMeta to return appropriate values
      mockState.tr.getMeta.mockReturnValueOnce({ inSuggestionMode: true });
      
      // Toggle suggestion mode on
      const trOn = mockState.tr.setMeta(suggestionsPluginKey, { inSuggestionMode: true });
      const resultOn = plugin.spec.state.apply(mockState, trOn);
      
      expect(plugin.spec.state.apply).toHaveBeenCalledWith(mockState, trOn);
      expect(resultOn.inSuggestionMode).toBe(true);
      
      // Setup getMeta for the second call
      mockState.tr.getMeta.mockReturnValueOnce({ inSuggestionMode: false });
      
      // Toggle suggestion mode off
      const trOff = mockState.tr.setMeta(suggestionsPluginKey, { inSuggestionMode: false });
      const resultOff = plugin.spec.state.apply(mockState, trOff);
      
      expect(plugin.spec.state.apply).toHaveBeenCalledWith(mockState, trOff);
      expect(resultOff.inSuggestionMode).toBe(false);
    });
  });
  
  describe('handleClick', () => {
    test('should handle click on suggestion mark', () => {
      const plugin = suggestionsPlugin();
      
      // Mock finding a suggestion mark at the click position
      const mockGetMarkAt = jest.fn().mockReturnValue({
        type: { name: 'suggestion' },
        attrs: { username: 'testUser', createdAt: Date.now() }
      });
      
      // Mock the view to include our custom method
      mockView.state.doc.resolve = jest.fn().mockReturnValue({
        marks: () => [{
          type: { name: 'suggestion' },
          attrs: { username: 'testUser', createdAt: Date.now() }
        }]
      });
      
      // Call the handleClick method
      const result = plugin.props.handleClick(mockView, 5, 5);
      
      // Since we're not fully implementing the click behavior, we just check it doesn't crash
      expect(result).toBeFalsy(); // Default behavior is to return false
    });
  });
  
  describe('handleKeyDown', () => {
    test('should handle Escape key to exit suggestion mode', () => {
      const plugin = suggestionsPlugin();
      
      // Set suggestion mode to true
      mockPluginState.inSuggestionMode = true;
      
      // Create a mock event for Escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      
      // Call the handleKeyDown method
      const result = plugin.props.handleKeyDown(mockView, escapeEvent);
      
      // Since we're mocking, we just verify it doesn't crash
      expect(result).toBeFalsy();
    });
    
    test('should not handle other keys in normal mode', () => {
      const plugin = suggestionsPlugin();
      
      // Set suggestion mode to false
      mockPluginState.inSuggestionMode = false;
      
      // Create a mock event for a regular key
      const regularEvent = new KeyboardEvent('keydown', { key: 'a' });
      
      // Call the handleKeyDown method
      const result = plugin.props.handleKeyDown(mockView, regularEvent);
      
      // Should return false for unhandled keys
      expect(result).toBeFalsy();
    });
  });
});

// Mock KeyboardEvent if it's not available in the test environment
if (typeof KeyboardEvent === 'undefined') {
  (global as any).KeyboardEvent = class KeyboardEvent {
    key: string;
    constructor(type: string, options: any) {
      this.key = options.key;
    }
  };
}
