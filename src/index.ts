import { EditorState } from "prosemirror-state";
import { Schema } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { history } from "prosemirror-history";
import { suggestionsPlugin, suggestionsPluginKey } from "./suggestions";

// Define suggestion marks
const suggestionMarks = {
  suggestion_add: {
    attrs: { 
      createdAt: { default: null },
      username: { default: 'Anonymous' },
      data: { default: null }
    },
    inclusive: true,
    parseDOM: [{ tag: "span[data-suggestion-add]" }],
    toDOM() {
      return ["span", { 
        "data-suggestion-add": "true", 
        class: "suggestion-add",
        style: "background-color: #e6ffe6;" 
      }, 0];
    }
  },
  suggestion_delete: {
    attrs: { 
      createdAt: { default: null },
      hiddenText: { default: "" },
      username: { default: 'Anonymous' },
      data: { default: null }
    },
    inclusive: true,
    parseDOM: [{ tag: "span[data-suggestion-delete]" }],
    toDOM() {
      return ["span", {
        "data-suggestion-delete": "true",
        class: "suggestion-delete",
        "data-hidden-text": node.attrs.hiddenText
      }, 0];
    }
  }
};

// Mix the nodes from prosemirror-schema-list into the basic schema to
// support lists and paragraphs
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: {
    ...schema.spec.marks,
    suggestion_add: suggestionMarks.suggestion_add,
    suggestion_delete: suggestionMarks.suggestion_delete
  }
});

// Initialize the editor with the suggestions plugin
window.addEventListener("load", () => {
  // Create the initial editor state with some starter content
  const state = EditorState.create({
    schema: mySchema,
    doc: mySchema.node("doc", null, [
      mySchema.node("paragraph", null, [
        mySchema.text("We choose to go to the Moon in this decade and do the other things, not because they are easy, but because they are hard, because that goal will serve to organize and measure the best of our energies and skills, because that challenge is one that we are willing to accept, one we are unwilling to postpone, and one which we intend to win, and the others, too.")
      ]),
      mySchema.node("paragraph", null, [
        mySchema.text("We set sail on this new sea because there is new knowledge to be gained, and new rights to be won, and they must be won and used for the progress of all people. For space science, like nuclear science and all technology, has no conscience of its own.")
      ]),
      mySchema.node("paragraph", null, [
        mySchema.text("Whether it will become a force for good or ill depends on man, and only if the United States occupies a position of pre-eminence can we help decide whether this new ocean will be a sea of peace or a new terrifying theater of war.")
      ])
    ]),
    plugins: [
      history(),
      keymap(baseKeymap),
      suggestionsPlugin
    ]
  });

  // Create the editor view
  const view = new EditorView(document.querySelector("#editor") as HTMLElement, {
    state,
    dispatchTransaction(transaction) {
      let newState = view.state.apply(transaction);
      view.updateState(newState);
      
      // Update the mode indicator when suggestion mode changes
      const suggestionState = suggestionsPluginKey.getState(newState);
      if (!suggestionState) return;
      
      const modeIndicator = document.querySelector("#modeIndicator");
      if (modeIndicator) modeIndicator.textContent = "";
      
      const toggleCheckbox = document.querySelector("#toggleSuggestionMode") as HTMLInputElement;
      if (toggleCheckbox) toggleCheckbox.checked = suggestionState.suggestionMode;

      // Update deletion marks based on showDeletedText setting
      document.querySelectorAll('.suggestion-delete').forEach(el => {
        el.classList.toggle('compact', !suggestionState.showDeletedText);
        el.classList.toggle('expanded', suggestionState.showDeletedText);
      });
    }
  });

  // Make view available globally for debugging
  (window as any).view = view;

  // Add event listeners for the controls
  const toggleModeCheckbox = document.querySelector("#toggleSuggestionMode") as HTMLInputElement;
  if (toggleModeCheckbox) {
    toggleModeCheckbox.addEventListener("change", (e) => {
      const state = suggestionsPluginKey.getState(view.state);
      if (!state) return;
      
      view.dispatch(view.state.tr.setMeta(suggestionsPlugin, {
        suggestionMode: (e.target as HTMLInputElement).checked,
        username: state.username
      }));
    });
  }

  const showDeletedTextCheckbox = document.querySelector("#showDeletedText") as HTMLInputElement;
  if (showDeletedTextCheckbox) {
    showDeletedTextCheckbox.addEventListener("change", (e) => {
      const state = suggestionsPluginKey.getState(view.state);
      if (!state) return;
      
      view.dispatch(view.state.tr.setMeta(suggestionsPlugin, {
        ...state,
        showDeletedText: (e.target as HTMLInputElement).checked
      }));
    });
  }
});
