console.log("Advanced example script loading...");
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap, toggleMark, setBlockType } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { history, undo, redo } from "prosemirror-history";
import {
  suggestionModePlugin,
  acceptAllSuggestions,
  rejectAllSuggestions,
  setSuggestionMode,
} from "prosemirror-suggestion-mode";
import { addSuggestionMarks } from "prosemirror-suggestion-mode/schema";
import { DOMParser } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { Schema } from "prosemirror-model";

// Import a theme for the suggestions
import "prosemirror-suggestion-mode/styles/default.css";

// Create an enhanced schema with suggestion marks
const advancedSchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
  marks: addSuggestionMarks(schema.spec.marks),
});

// Initialize the editor with the suggestions plugin
document.addEventListener("DOMContentLoaded", () => {
  const content = `
    <p>This is an <b>advanced</b> example of ProseMirror with suggestion mode.</p>
    <p>You can use <i>formatting</i> tools like bold and italic.</p>
    <p>You can also undo and redo your changes while in suggestion mode.</p>
    <p>Try making some edits with suggestion mode enabled to see how they appear as suggestions.</p>
  `;

  // Define view at a higher scope so it's accessible to event handlers
  let view: EditorView;

  try {
    console.log("Initializing advanced editor...");
    const parser = DOMParser.fromSchema(advancedSchema);
    const htmlDoc = new window.DOMParser().parseFromString(content, "text/html");
    const doc = parser.parse(htmlDoc.body);
    console.log("Document parsed successfully");

    // Create editor state with all necessary plugins
    console.log("Creating editor state...");
    const editorState = EditorState.create({
      schema: advancedSchema,
      doc,
      plugins: [
        history(),
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
          "Mod-Shift-z": redo,
          "Mod-b": toggleMark(advancedSchema.marks.strong),
          "Mod-i": toggleMark(advancedSchema.marks.em),
          "Shift-Ctrl-1": setBlockType(advancedSchema.nodes.heading, { level: 1 }),
          "Shift-Ctrl-2": setBlockType(advancedSchema.nodes.heading, { level: 2 }),
          "Shift-Ctrl-3": setBlockType(advancedSchema.nodes.heading, { level: 3 }),
        }),
        keymap(baseKeymap),
        suggestionModePlugin({ 
          username: "advanced user", 
          inSuggestionMode: true,
          data: { 
            source: "advanced example" 
          } 
        })
      ],
    });
    
    // Create the editor view
    const editorElement = document.querySelector("#editor");
    console.log("Editor element:", editorElement); // Debug log
    view = new EditorView(editorElement, { 
      state: editorState,
      // Add a handler for when the editor gets focus
      handleDOMEvents: {
        focus: (view, event) => {
          updateToolbarState(view);
          return false; // Let other handlers run
        }
      },
      // Update toolbar state when selection changes
      dispatchTransaction: (transaction) => {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        updateToolbarState(view);
      }
    });
  } catch (error) {
    console.error("Error initializing editor:", error);
  }

  // Function to update toolbar button states based on current marks and nodes
  function updateToolbarState(view: EditorView) {
    const { state } = view;
    const { schema, selection } = state;
    const { from, to, empty } = selection;
    
    // Update bold button
    const boldActive = schema.marks.strong.isInSet(
      state.doc.resolve(from).marks()
    ) || (!empty && state.doc.rangeHasMark(from, to, schema.marks.strong));
    document.getElementById("bold").classList.toggle("active", !!boldActive);
    
    // Update italic button
    const italicActive = schema.marks.em.isInSet(
      state.doc.resolve(from).marks()
    ) || (!empty && state.doc.rangeHasMark(from, to, schema.marks.em));
    document.getElementById("italic").classList.toggle("active", !!italicActive);
    
    // Update heading buttons
    const node = selection.$from.node();
    const isH1 = node.type.name === 'heading' && node.attrs.level === 1;
    const isH2 = node.type.name === 'heading' && node.attrs.level === 2;
    const isH3 = node.type.name === 'heading' && node.attrs.level === 3;
    
    document.getElementById("h1").classList.toggle("active", isH1);
    document.getElementById("h2").classList.toggle("active", isH2);
    document.getElementById("h3").classList.toggle("active", isH3);
  }

  // Add event listeners for the toolbar buttons
  document.getElementById("bold").addEventListener("click", () => {
    toggleMark(advancedSchema.marks.strong)(view.state, view.dispatch, view);
    view.focus();
  });

  document.getElementById("italic").addEventListener("click", () => {
    toggleMark(advancedSchema.marks.em)(view.state, view.dispatch, view);
    view.focus();
  });
  
  // Add heading buttons
  document.getElementById("h1").addEventListener("click", () => {
    setBlockType(advancedSchema.nodes.heading, { level: 1 })(view.state, view.dispatch, view);
    view.focus();
  });
  
  document.getElementById("h2").addEventListener("click", () => {
    setBlockType(advancedSchema.nodes.heading, { level: 2 })(view.state, view.dispatch, view);
    view.focus();
  });
  
  document.getElementById("h3").addEventListener("click", () => {
    setBlockType(advancedSchema.nodes.heading, { level: 3 })(view.state, view.dispatch, view);
    view.focus();
  });

  document.getElementById("undo").addEventListener("click", () => {
    undo(view.state, view.dispatch, view);
    view.focus();
  });

  document.getElementById("redo").addEventListener("click", () => {
    redo(view.state, view.dispatch, view);
    view.focus();
  });

  // Add event listeners for the suggestion mode controls
  document
    .querySelector("#toggleSuggestionMode")
    ?.addEventListener("change", (e) => {
      setSuggestionMode(view, (e.target as HTMLInputElement).checked);
    });

  document
    .querySelector("#acceptAllSuggestions")
    ?.addEventListener("click", () => {
      acceptAllSuggestions(view);
    });

  document
    .querySelector("#rejectAllSuggestions")
    ?.addEventListener("click", () => {
      rejectAllSuggestions(view);
    });
});
