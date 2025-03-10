console.log('Advanced example script loading...');
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { baseKeymap, toggleMark, setBlockType } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';
import {
  suggestionModePlugin,
  acceptAllSuggestions,
  rejectAllSuggestions,
  toggleSuggestionMode,
  suggestionModePluginKey,
} from 'prosemirror-suggestion-mode';
import { addSuggestionMarks } from 'prosemirror-suggestion-mode/schema';
import { DOMParser } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { Schema } from 'prosemirror-model';
import { exampleSetup, buildMenuItems } from 'prosemirror-example-setup';
import { MenuItem } from 'prosemirror-menu';

// Import a theme for the suggestions
import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-menu/style/menu.css';
import 'prosemirror-example-setup/style/style.css';
import 'prosemirror-suggestion-mode/styles/default.css';

// Create an enhanced schema with suggestion marks and list support
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: addSuggestionMarks(schema.spec.marks),
});

// Create suggestion mode menu items
const suggestionMenuItems = [
  new MenuItem({
    title: 'Toggle Suggestion Mode',
    label: '✏️ Toggle Suggestion Mode',
    enable: (state) => true,
    active(state) {
      const pluginState = suggestionModePluginKey.getState(state);
      return pluginState?.inSuggestionMode || false;
    },
    run(state, dispatch) {
      toggleSuggestionMode(state, dispatch);
      return true;
    },
  }),
  new MenuItem({
    title: 'Accept All Suggestions',
    label: '✅ Accept All Suggestions',
    enable: (state) => true,
    run(state, dispatch) {
      acceptAllSuggestions(state, dispatch);
      return true;
    },
  }),
  new MenuItem({
    title: 'Reject All Suggestions',
    label: '❌ Reject All Suggestions',
    enable: (state) => true,
    run(state, dispatch) {
      rejectAllSuggestions(state, dispatch);
      return true;
    },
  }),
];

// Initialize the editor
document.addEventListener('DOMContentLoaded', () => {
  const content = `
    <h1>ProseMirror Suggestion Mode Example</h1>
    <p>This is an example of <strong>ProseMirror</strong> with suggestion mode enabled by default.  It uses the <a href="https://github.com/ProseMirror/prosemirror-example-setup">prosemirror-example-setup</a> package to provide a toolbar and undo/redo functionality.</p>
    <p>Try making some edits with suggestion mode enabled to see how they appear as suggestions.  Note that it can even handle suggestions over <em>formatted text</em>!</p>
  `;

  const parser = DOMParser.fromSchema(mySchema);
  const htmlDoc = new window.DOMParser().parseFromString(content, 'text/html');
  const doc = parser.parse(htmlDoc.body);

  // Get the default menu items
  const defaultMenuItems = buildMenuItems(mySchema);

  const view = new EditorView(document.querySelector('#editor'), {
    state: EditorState.create({
      doc,
      plugins: [
        ...exampleSetup({
          schema: mySchema,
          menuBar: true,
          floatingMenu: false,
          menuContent: [...defaultMenuItems.fullMenu, [...suggestionMenuItems]],
        }),
        suggestionModePlugin({
          inSuggestionMode: true,
          username: 'example user',
          data: {
            source: 'basic example',
          },
        }),
      ],
    }),
  });
});
