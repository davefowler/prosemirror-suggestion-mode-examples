import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { history } from "prosemirror-history";
import { suggestionsPlugin, suggestionsPluginKey } from "./suggestions";
import { mySchema } from "./schema";
import { DOMParser } from "prosemirror-model";

// Initialize the editor with the suggestions plugin
window.addEventListener("load", () => {
  const content = `
    <p>We choose to go to the Moon in this decade and do the other things, not because they are easy, but because they are hard, because that goal will serve to organize and measure the best of our energies and skills, because that challenge is one that we are willing to accept, one we are unwilling to postpone, and one which we intend to win, and the others, too.</p>
    <p>We set sail on this new sea because there is new knowledge to be gained, and new rights to be won, and they must be won and used for the progress of all people. For space science, like nuclear science and all technology, has no conscience of its own.</p>
    <p>Whether it will become a force for good or ill depends on man, and only if the United States occupies a position of pre-eminence can we help decide whether this new ocean will be a sea of peace or a new terrifying theater of war.</p>
  `;

  const parser = DOMParser.fromSchema(mySchema);
  const htmlDoc = new window.DOMParser().parseFromString(content, "text/html");
  const doc = parser.parse(htmlDoc.body);

  const state = EditorState.create({
    schema: mySchema,
    doc,
    plugins: [
      history(),
      keymap(baseKeymap),
      suggestionsPlugin
    ]
  });

  // Create the editor view
  const view = new EditorView(document.querySelector("#editor"), {state});

  // Make view available globally for debugging
  (window as any).view = view;


  const setState = (view: EditorView, key: string, value: any) => {
    const state = suggestionsPluginKey.getState(view.state);
    if (!state) return;
    view.dispatch(view.state.tr.setMeta(suggestionsPlugin, {
      ...state,
      [key]: value
    }));
  }

  // Add event listeners for the controls
  const toggleModeCheckbox = document.querySelector("#toggleSuggestionMode") as HTMLInputElement;
  toggleModeCheckbox.addEventListener("change", (e) => {
    setState(view, "isSuggestionMode", (e.target as HTMLInputElement).checked);
  });
    
  

  const showDeletedTextCheckbox = document.querySelector("#showDeletedText") as HTMLInputElement;
  showDeletedTextCheckbox.addEventListener("change", (e) => {
    setState(view, "showDeletedText", (e.target as HTMLInputElement).checked);
  });
  
});
