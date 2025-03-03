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
} from "prosemirror-suggestion-mode";
import { DOMParser } from "prosemirror-model";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Plugin } from "prosemirror-state";

// Normally you can just direct import a theme
import "prosemirror-suggest-mode/styles/inkAndSwitch.css";

const exampleSchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),

  // When creating your schema, wrap the marks in the addSuggestionMarks function
  // this will add the needed suggestion_add and suggestion_delete marks to the schema
  marks: addSuggestionMarks(schema.spec.marks),
});

// Extending the suggestion plugin with an extra decorator showing deleted text on hover
const deletedTextDecorator = new Plugin({
  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(tr, oldSet) {
      // Map decorations through document changes
      const newSet = oldSet.map(tr.mapping, tr.doc);

      if (!tr.docChanged) return newSet;

      // Find all suggestion-delete marks and create decorations
      const decorations = [];
      tr.doc.descendants((node, pos) => {
        // Check each node's marks for suggestion-delete
        node.marks.forEach((mark) => {
          if (mark.type.name === "suggestion_delete") {
            // Create a decoration for the full node that shows deleted text in tooltip
            const decoration = Decoration.inline(pos, pos + node.nodeSize, {
              class: "deleted-text-content",
            });
            decorations.push(decoration);
          }
        });
      });

      return newSet.add(tr.doc, decorations);
    },
  },
  props: {
    decorations(state) {
      return this.getState(state);
    },
  },
});

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
    plugins: [keymap(baseKeymap), suggestionModePlugin, deletedTextDecorator],
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

// Add a function to create tooltips for deleted text
document.addEventListener("mouseover", (e) => {
  const target = e.target as HTMLElement;
  if (
    target.classList.contains("suggestion-delete-with-tooltip") ||
    target.closest(".suggestion-delete-with-tooltip")
  ) {
    const element = target.classList.contains("suggestion-delete-with-tooltip")
      ? target
      : target.closest(".suggestion-delete-with-tooltip");

    if (!element) return;

    // Get the deleted text from the data attribute
    const deletedText = element.getAttribute("data-deleted-text");
    if (!deletedText) return;

    // Create or update tooltip
    let tooltip = element.querySelector(".suggestion-deleted-content");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "suggestion-tooltip suggestion-deleted-content";

      const info = document.createElement("div");
      info.className = "suggestion-info";
      info.textContent = "Deleted text:";

      const content = document.createElement("div");
      content.className = "deleted-text-content";
      content.textContent = deletedText;

      tooltip.appendChild(info);
      tooltip.appendChild(content);
      element.appendChild(tooltip);
    }
  }
});
