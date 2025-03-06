# ProseMirror Suggestion Mode

A ProseMirror plugin that implements a "suggestion mode" method to track and show changes similar to Google Docs and Word. This plugin allows users to make suggested edits that can be reviewed, accepted, or rejected later.


## Demo

Check out the [live demos](https://prosemirror-suggestion-mode.netlify.app) 

 - [Simple example](https://prosemirror-suggestion-mode.netlify.app/examples/simple/)
 - [Text based suggestions (for AI) & Custom Hover Menu example ](https://prosemirror-suggestion-mode.netlify.app/examples/suggestedit/)
 - [Custom Hover Menu Advanced Example](https://prosemirror-suggestion-mode.netlify.app/examples/inkandswitch/)

[![ProseMirror Suggestion Mode Demo](https://github.com/davefowler/prosemirror-suggestion-mode/blob/main/assets/prosemirror-suggestion-mode-demo.png?raw=true)](https://prosemirror-suggestion-mode.netlify.app/examples/simple/)

## Features

- Toggle suggestion mode on/off
- Highlight suggested text additions in green, deletions in red
- Show suggested deletions as compact red squares that reveal text on hover
- Accept/reject individual suggestions
- Does not conflict with formatting or undo/redo
- Clean, minimal UI
- text search/replace helpers for AI generated suggestions

## Installation

```bash
# Using npm
npm install prosemirror-suggestion-mode

# Using yarn
yarn add prosemirror-suggestion-mode
```


## Usage

### Basic Setup

First import the *addSuggestionMarks* helper to add the plugin's marks to your schema.  

```javascript
import { addSuggestionMarks } from "prosemirror-suggestion-mode";

const exampleSchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),

  // When creating your schema, wrap the marks in the addSuggestionMarks function
  // this will add the needed suggestion_add and suggestion_delete marks to the schema
  marks: addSuggestionMarks(schema.spec.marks),
});
```

Then add the plugin to your plugins array with the *suggestionModePlugin* plugin factory function when you create the editor

```javascript
  import { suggestionModePlugin } from 'prosemirror-suggestion-mode'
  const state = EditorState.create({
    schema: exampleSchema,
    doc,
    plugins: [
      keymap(baseKeymap), // basic keymap for the editor 
      // suggestion mode plugin factory function with init values
      suggestionModePlugin({ 
        username: "example user", 
        data: { // put any custom ata here that you want added as attrs to the hover tooltip
            exampleattr: "these get added to the attrs of the the hover tooltip" 
          } 
      })],
  });
```

the init options for the plugin are:

```javascript
suggestionModePlugin({
  inSuggestionMode: false, // starting status of suggestion mode
  username?: string; // of who is making the suggestions
  data?: Record<string, any>; // custom metadata that will get added to the attrs of the mark nodes
  hoverMenuRenderer?: (mark: Mark, view: EditorView, pos: number) => HTMLElement;  // override to create a fully custom hover menu
  hoverMenuOptions?: { // override parts of this to customise just parts of the hover menu
  components?: {
    createInfoComponent?: (mark: Mark, view: EditorView, pos: number) => HTMLElement; // override to create a custom info component above the buttons
    createButtonsComponent?: (mark: Mark, view: EditorView, pos: number) => HTMLElement; // override to create a custom buttons component below the info component
  };
  menuClass?: string; // class to apply to the hover menu
};  
```


### Toggle Suggestion Mode 


There are a few helpers for common tasks like:

Setting the suggestion mode on/off

```javascript
import { setSuggestionMode } from 'prosemirror-suggestion-mode'
setSuggestionMode(view, true); // enable suggestion mode
setSuggestionMode(view, false); // disable suggestion mode
```

### Change the username or data

To change the username and data that will get stored in the suggestion mark attributes you can do:

```javascript
// Change username and data
view.dispatch(view.state.tr.setMeta(suggestionModePlugin, {
  username: 'JaneSmith',
  data: {
    department: 'Marketing',
    category: 'content'
  }
}))
```

The `data` attribute can contain any JSON-serializable object. This data will be stored with the suggestion mark and displayed in the tooltip by default.


### Accept/Reject Suggestions

Here are the helper functions for accepting and rejecting suggestions individually or in bulk.

```javascript
import { acceptSuggestion, rejectSuggestion, acceptAllSuggestions, rejectAllSuggestions } from 'prosemirror-suggestion-mode'
// Accept a suggestion at the given mark and position
acceptSuggestion(view, mark, pos)

// Reject a suggestion at the given mark and position
rejectSuggestion(view, mark, pos)

// Accept all suggestions
acceptAllSuggestions(view)

// Reject all suggestions
rejectAllSuggestions(view)
```

### Customizing the Hover Menu

You can customize the content and appearance of suggestion hover menu by either overwritting a component of the default hover menu, or by providing your own full hover menu renderer.

See the examples for more details: 
 - [SuggestEdit Example](https://github.com/davefowler/prosemirror-suggestion-mode/blob/main/examples/suggestEdit/suggestEditDemo.ts) - puts 'reasons' in the hover menu [demo](https://prosemirror-suggestion-mode.netlify.app/examples/suggestedit/)
 - [Ink & Switch Example ](https://github.com/davefowler/prosemirror-suggestion-mode/blob/main/examples/inkAndSwitch/inkAndSwitch.ts) - hides the deletes and shows what was deleted only on hover [demo](https://prosemirror-suggestion-mode.netlify.app/examples/inkandswitch/) 


#### 2. CSS Styling

For basic styling you can simply import the [default styles](https://github.com/davefowler/prosemirror-suggestion-mode/blob/main/src/styles/default.css) 

```javascript
import 'prosemirror-suggestion-mode/styles/default.css'
```

The hover menu customizations give you full control over the hover menu content, while CSS customization lets you style the hover menu appearance.


## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

To start the development server:

```bash
npm start
```

This will:
1. Build the project
2. Start a local development server on http://localhost:8080
3. Open the example page in your browser
4. Watch for changes and reload automatically

The development server will be available at:
http://localhost:8080


## Implementation choices

For simplicity this is not really a diffing capability where you can input two different versions and see the changes.  Instead if a user makes changes with a suggestion mode enabled, the changes are stored as extra markup on the document.  It's not really version control, it's just a way to make suggestions.

I had gone down the route of using prosemirror-changeset as some had suggested for this, but accepting or rejecting individual suggestions out of order was quite complex in changeset, so I went back to this method of keeping the suggestions in the document.  If you'd like to see where I went with that work you can see the [changeset branch here](https://github.com/davefowler/prosemirror-suggestion-mode/tree/changeset).

## License

[MIT](https://choosealicense.com/licenses/mit/)

