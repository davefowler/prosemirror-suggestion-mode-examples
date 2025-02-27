import { suggestionsPluginKey } from "../../src/key";
import { suggestionsPlugin } from "../../src/suggestions";
import { 
  createEditorState, 
  createEditorView, 
  setCursor, 
  insertText, 
  deleteText,
  setupDOMEnvironment 
} from "../helpers/test-helpers";

describe("Suggestions Plugin Integration", () => {
  // Setup DOM environment for tests
  beforeAll(() => {
    setupDOMEnvironment();
  });

  test("should initialize with suggestion mode enabled by default", () => {
    const state = createEditorState("<p>Hello world</p>");
    const pluginState = suggestionsPluginKey.getState(state);
    
    expect(pluginState).toBeDefined();
    expect(pluginState?.inSuggestionMode).toBe(true);
    expect(pluginState?.username).toBe("Anonymous");
  });

  test("should toggle suggestion mode", () => {
    const state = createEditorState("<p>Hello world</p>");
    const view = createEditorView(state);
    
    // Initially in suggestion mode
    let pluginState = suggestionsPluginKey.getState(view.state);
    expect(pluginState?.inSuggestionMode).toBe(true);
    
    // Toggle suggestion mode off
    const tr = view.state.tr.setMeta(suggestionsPluginKey, {
      inSuggestionMode: false
    });
    view.dispatch(tr);
    
    // Check that suggestion mode is now off
    pluginState = suggestionsPluginKey.getState(view.state);
    expect(pluginState?.inSuggestionMode).toBe(false);
  });

  test("should set username", () => {
    const state = createEditorState("<p>Hello world</p>");
    const view = createEditorView(state);
    
    // Set username
    const tr = view.state.tr.setMeta(suggestionsPluginKey, {
      username: "TestUser"
    });
    view.dispatch(tr);
    
    // Check that username is updated
    const pluginState = suggestionsPluginKey.getState(view.state);
    expect(pluginState?.username).toBe("TestUser");
  });

  test("should mark text insertions in suggestion mode", () => {
    // Create state with suggestion mode on
    const state = createEditorState("<p>Hello world</p>");
    const view = createEditorView(state);
    
    // Set cursor position after "Hello "
    setCursor(view, 6);
    
    // Insert text at cursor position
    insertText(view, "awesome ");
    
    // Check that the document now contains the inserted text
    expect(view.state.doc.textContent).toBe("Hello awesome world");
    
    // The appendTransaction should have added a suggestion_add mark
    // We can verify this by checking if there are decorations
    const decos = suggestionsPlugin.props.decorations?.(view.state);
    expect(decos).toBeDefined();
    
    // We can also check the document for marks
    let hasAddMark = false;
    view.state.doc.nodesBetween(0, view.state.doc.content.size, (node, pos) => {
      if (node.marks.some(m => m.type.name === "suggestion_add")) {
        hasAddMark = true;
      }
    });
    
    expect(hasAddMark).toBe(true);
  });
  
  test("should mark text deletions in suggestion mode", () => {
    // Create state with suggestion mode on
    const state = createEditorState("<p>Hello awesome world</p>");
    const view = createEditorView(state);
    
    // Delete "awesome " (from position 6 to 14)
    deleteText(view, 6, 14);
    
    // Check that the document now visually contains just "Hello world"
    expect(view.state.doc.textContent).toBe("Hello world");
    
    // The appendTransaction should have added a suggestion_delete mark
    // We can verify this by checking if there are decorations
    const decos = suggestionsPlugin.props.decorations?.(view.state);
    expect(decos).toBeDefined();
    
    // We can also check the document for marks
    let hasDeleteMark = false;
    view.state.doc.nodesBetween(0, view.state.doc.content.size, (node, pos) => {
      if (node.marks.some(m => m.type.name === "suggestion_delete")) {
        hasDeleteMark = true;
      }
    });
    
    expect(hasDeleteMark).toBe(true);
  });
  
  test("should handle adjacent suggestion marks", () => {
    // Create state with suggestion mode on
    const state = createEditorState("<p>Hello world</p>");
    const view = createEditorView(state);
    
    // Set cursor position after "Hello "
    setCursor(view, 6);
    
    // Insert text at cursor position
    insertText(view, "awesome ");
    
    // Insert more text right after
    insertText(view, "fantastic ");
    
    // Check that the document now contains the inserted text
    expect(view.state.doc.textContent).toBe("Hello awesome fantastic world");
    
    // We should have suggestion_add marks
    let markCount = 0;
    view.state.doc.nodesBetween(0, view.state.doc.content.size, (node, pos) => {
      if (node.marks.some(m => m.type.name === "suggestion_add")) {
        markCount++;
      }
    });
    
    // We should have at least one node with a suggestion_add mark
    expect(markCount).toBeGreaterThan(0);
  });
});
