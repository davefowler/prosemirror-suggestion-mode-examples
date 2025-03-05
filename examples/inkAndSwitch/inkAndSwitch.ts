import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { addListNodes } from "prosemirror-schema-list";
import { Schema } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import {
  suggestionModePlugin,
  acceptAllSuggestions,
  rejectAllSuggestions,
  setSuggestionMode,
  addSuggestionMarks,
  findMarkRange,
} from "prosemirror-suggestion-mode";
import { DOMParser } from "prosemirror-model";

// Normally you can just direct import a theme
import "prosemirror-suggestion-mode/styles/inkAndSwitch.css";

const exampleSchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),

  // When creating your schema, wrap the marks in the addSuggestionMarks function
  // this will add the needed suggestion_add and suggestion_delete marks to the schema
  marks: addSuggestionMarks(schema.spec.marks),
});

// Create a custom component for displaying deleted text in the hover menu
const createDeletedTextInfoComponent = (mark, view, pos) => {
  // Only show for delete suggestions
  if (mark.type.name !== "suggestion_delete") {
    return { dom: document.createElement("div") };
  }

  const deletedTextDiv = document.createElement("div");
  deletedTextDiv.className = "suggestion-deleted-text";
  
  // Helper function that will find the full range of the mark
  const markRange = findMarkRange(view.state, pos, "suggestion_delete");
  
  if (markRange) {
    // Extract all text in the range
    const deletedText = view.state.doc.textBetween(
      markRange.from, 
      markRange.to,
      " "
    );
    
    // Create the html along with the deleted text
    const textSpan = document.createElement("span");
    textSpan.textContent = deletedText;
    textSpan.className = "deleted-text-content";
    
    const label = document.createElement("strong");
    label.textContent = "Deleted text: ";
    
    deletedTextDiv.appendChild(label);
    deletedTextDiv.appendChild(textSpan);
  }
  
  return { dom: deletedTextDiv };
};

// Initialize the editor with the suggestions plugin
window.addEventListener("load", () => {
  const content = `
    <p>We choose to go to the Moon in this decade and do the other things, not because they are easy, but because they are hard, because that goal will serve to organize and measure the best of our energies and skills, because that challenge is one that we are willing to accept, one we are unwilling to postpone, and one which we intend to win, and the others, too.</p>
    <p>We set sail on this new sea because there is new knowledge to be gained, and new rights to be won, and they must be won and used for the progress of all people. For space science, like nuclear science and all <i>technology, has no conscience of its own.</i></p>
    <p>Whether it will become a <b>force</b> for good or ill depends on man, and only if the United States occupies a position of pre-eminence can we help decide whether this new ocean will be a sea of peace or a new terrifying theater of war.</p>
  `;

  const parser = DOMParser.fromSchema(exampleSchema);
  const htmlDoc = new window.DOMParser().parseFromString(content, "text/html");
  const doc = parser.parse(htmlDoc.body);

  const state = EditorState.create({
    schema: exampleSchema,
    doc,
    plugins: [
      keymap(baseKeymap), 
      suggestionModePlugin({
        username: "example user",
        inSuggestionMode: true, // start in suggestion mode - toggled below
        // Add hover menu options to show deleted text
        hoverMenuOptions: {
            components: {
                createInfoComponent: createDeletedTextInfoComponent,
            }
       
        }
      })
    ],
  });

  // Create the editor view
  const view = new EditorView(document.querySelector("#editor"), { state });

  // Add event listeners for the controls
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
