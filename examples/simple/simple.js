import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { suggestionsPlugin, acceptAllSuggestions, rejectAllSuggestions } from "../../src/suggestions";
import { suggestionsPluginKey } from "../../src/key";
import { schema } from "prosemirror-schema-basic";
import { DOMParser } from "prosemirror-model";

// Import styles
import "../../src/styles/default.css";

// Initialize the editor with the suggestions plugin
window.addEventListener("load", () => {
  const content = `
    <p>We choose to go to the Moon in this decade and do the other things, not because they are easy, but because they are hard, because that goal will serve to organize and measure the best of our energies and skills, because that challenge is one that we are willing to accept, one we are unwilling to postpone, and one which we intend to win, and the others, too.</p>
    <p>We set sail on this new sea because there is new knowledge to be gained, and new rights to be won, and they must be won and used for the progress of all people. For space science, like nuclear science and all <i>technology, has no conscience of its own.</i></p>
    <p>Whether it will become a <b>force</b> for good or ill depends on man, and only if the United States occupies a position of pre-eminence can we help decide whether this new ocean will be a sea of peace or a new terrifying theater of war.</p>
  `;

  const parser = DOMParser.fromSchema(schema);
  const htmlDoc = new window.DOMParser().parseFromString(content, "text/html");
  const doc = parser.parse(htmlDoc.body);

  const state = EditorState.create({
    schema,
    doc,
    plugins: [keymap(baseKeymap), suggestionsPlugin],
  });

  // Create the editor view
  const view = new EditorView(document.querySelector("#editor"), { state });

  // Set the username and custom data
  view.dispatch(
    view.state.tr.setMeta(suggestionsPluginKey, {
      username: "Your username",
      data: {
        exampleattr: "these get added to the attrs of the the hover tooltip",
      },
    })
  );

  // Add event listeners for the controls
  document
    .querySelector("#toggleSuggestionMode")
    ?.addEventListener("change", (e) => {
      view.dispatch(
        view.state.tr.setMeta(suggestionsPluginKey, {
          inSuggestionMode: e.target.checked,
        })
      );
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
