import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { history } from "prosemirror-history";
import {
  suggestionsPlugin,
  acceptAllSuggestions,
  rejectAllSuggestions,
  setSuggestionMode,
} from "../../suggestions";
import { mySchema } from "../../schema";
import { DOMParser } from "prosemirror-model";
import { suggestEdit, TextSuggestion } from "../../tools";

// Normally you can just direct import a theme
import "../../styles/default.css";

// Initialize the editor with the suggestions plugin
window.addEventListener("load", () => {
  // === REGULAR EDITOR SETUP ===
  const content = `
    <p>We choose to go to the Moon in this decade and do the other things, not because they are easy, but because they are hard, because that goal will serve to organize and measure the best of our energies and skills, because that challenge is one that we are willing to accept, one we are unwilling to postpone, and one which we intend to win, and the others, too.</p>
    <p>We set sail on this new sea because there is new knowledge to be gained, and new rights to be won, and they must be won and used for the progress of all people. For space science, like nuclear science and all <i>technology, has no conscience of its own.</i></p>
    <p>Whether it will become a <b>force</b> for good or ill depends on man, and only if the United States occupies a position of pre-eminence can we help decide whether this new ocean will be a sea of peace or a new terrifying theater of war.</p>
  `;

  const parser = DOMParser.fromSchema(mySchema);
  const htmlDoc = new window.DOMParser().parseFromString(content, "text/html");
  const doc = parser.parse(htmlDoc.body);

  const state = EditorState.create({
    schema: mySchema,
    doc,
    plugins: [history(), keymap(baseKeymap), suggestionsPlugin],
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

  // === TEXT SUGGESTION EXAMPLES ===

  const exampleSuggestions: TextSuggestion[] = [
    {
      textToReplace: "Moon",
      textReplacement: "moon",
      reason: "Consistent lowercase for celestial bodies",
      textBefore: "We choose to go to the ",
      textAfter: " in this decade and do",
    },
    {
      textToReplace: "",
      textReplacement: "\n\nWe want to see if the moon is made of cheese.",
      reason: "Added new paragraph about cheese moon theory",
      textBefore: "others, too.",
      textAfter: "We set sail",
    },
    {
      textToReplace: "hard",
      textReplacement: "challenging",
      reason: "Word choice improvement",
      textBefore: "not because they are easy, but because they are ",
      textAfter: ", because that goal",
    },
    {
      textToReplace: "pre-eminence",
      textReplacement: "leadership position",
      reason: "Using more common terminology",
      textBefore: "only if the United States occupies a position of ",
      textAfter: " can we help decide",
    },
    {
      textToReplace: "new terrifying theater",
      textReplacement: "terrifying new theater",
      reason: "Improved word order",
      textAfter: " of war.",
    },
    {
      textToReplace: "s",
      textReplacement: "z",
      reason: "Corrected spelling",
      textBefore: "will serve to organi",
      textAfter: "e and measure",
    },
  ];

  exampleSuggestions.forEach((suggestion) => {
    suggestEdit(view, [suggestion], "somebody");
  });

  const suggestionsDiv = document.querySelector("#suggestions");

  // Format the suggestions for display
  let formattedText = "[\n";

  exampleSuggestions.forEach((suggestion, index) => {
    formattedText += "  {\n";
    formattedText += `    textToReplace: "${suggestion.textToReplace}",\n`;
    formattedText += `    textReplacement: "${suggestion.textReplacement}",\n`;

    if (suggestion.reason) {
      formattedText += `    reason: "${suggestion.reason}",\n`;
    }

    if (suggestion.textBefore) {
      formattedText += `    textBefore: "${suggestion.textBefore}",\n`;
    }

    if (suggestion.textAfter) {
      formattedText += `    textAfter: "${suggestion.textAfter}",\n`;
    }

    // Remove trailing comma for the last property
    formattedText = formattedText.slice(0, -2) + "\n";
    formattedText +=
      "  }" + (index < exampleSuggestions.length - 1 ? ",\n" : "\n");
  });

  formattedText += "]";

  // Use a pre element to preserve formatting
  suggestionsDiv.innerHTML = `<pre>${formattedText}</pre>`;
});
