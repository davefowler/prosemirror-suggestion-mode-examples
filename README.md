# ProseMirror Suggestion Mode

A ProseMirror plugin that implements a "suggestion mode" method to track and show changes similar to Google Docs and Word. This plugin allows users to make suggested edits that can be reviewed, accepted, or rejected later.


## Demo

Check out the [live demos](https://prosemirror-suggestion-mode.netlify.app) 

 - [Simple example](https://prosemirror-suggestion-mode.netlify.app/examples/simple/)
 - [Text based suggestions (for AI)](https://prosemirror-suggestion-mode.netlify.app/examples/suggestedit/)
 - [Style/decorator additions](https://prosemirror-suggestion-mode.netlify.app/examples/inkandswitch/)

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

```javascript
import { suggestionsPlugin } from 'prosemirror-suggestion-mode'

// Add to your ProseMirror plugins
const plugins = [
  suggestionsPlugin,
  // ... other plugins
]
```

### Toggle Suggestion Mode and Set Metadata

```javascript
// Enable suggestion mode with username and custom data
view.dispatch(view.state.tr.setMeta(suggestionsPlugin, {
  suggestionMode: true,
  username: 'JohnDoe',
  data: {
    department: 'Engineering',
    priority: 'high',
    reviewerId: 'REV-123'
  }
}))

// Disable suggestion mode
view.dispatch(view.state.tr.setMeta(suggestionsPlugin, {
  suggestionMode: false
}))

// Change username and data
view.dispatch(view.state.tr.setMeta(suggestionsPlugin, {
  suggestionMode: true,
  username: 'JaneSmith',
  data: {
    department: 'Marketing',
    category: 'content'
  }
}))
```

The `data` attribute can contain any JSON-serializable object. This data will be stored with the suggestion mark and displayed in the tooltip by default.

Each suggestion will now be tagged with the username of the person who made it. This is useful for:
- Tracking who made which suggestions
- Filtering suggestions by user
- Displaying user information in the UI when hovering over suggestions

### Accept/Reject Suggestions

```javascript
// Accept a suggestion at the current selection
suggestionsPlugin.accept(view)

// Reject a suggestion at the current selection
suggestionsPlugin.reject(view)
```

### Customizing Tooltips

You can customize the content and appearance of suggestion tooltips in two ways:

#### 1. Custom Tooltip Renderer

Provide a custom tooltip renderer function when creating the plugin.  If you added extra data to the suggestion mark you can access it in the tooltip renderer.  Below we've added a profile image url.

```javascript
new Plugin({
    ...suggestionsPlugin,
    tooltipRenderer: (mark, type) => {
        // mark contains attrs like username, createdAt
        // type is either 'add' or 'delete'
        return `<img src="${mark.attrs.data.profileImageUrl}" /> ${mark.attrs.username} edited on ${mark.attrs.createdAt}`
    }
})
```

#### 2. CSS Styling

Override the default tooltip styles in your CSS:

```css
.suggestion-tooltip {
    /* Change tooltip background */
    background: #444;
    
    /* Modify padding/spacing */
    padding: 8px 12px;
    
    /* Customize font */
    font-size: 13px;
    font-family: sans-serif;
}

/* Style the tooltip arrow */
.suggestion-tooltip::after {
    border-top-color: #444;
}

/* Adjust tooltip position */
.suggestion-tooltip-wrapper {
    margin-top: 5px;
}
```

The tooltipRenderer function gives you full control over the tooltip content, while CSS customization lets you style the tooltip appearance.

### Accepting/Rejecting All Suggestions

The plugin exposes two utility functions for bulk processing of suggestions:

- `acceptAllSuggestions(view)`: Accepts all suggestions in the document
- `rejectAllSuggestions(view)`: Rejects all suggestions in the document

These functions take the EditorView as their only parameter.  See the example for more details.

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


## TODO

- combine accepting and rejecting two an add and delete together when next to each other (potentially make a suggestion_replace mark)
- add reasons to suggestions display

## Implementation choices

For simplicity this is not really a diffing capability where you can input two different versions and see the changes.  Instead if a user makes changes with a suggestion mode enabled, the changes are stored as extra markup on the document.  It's not really version control, it's just a way to make suggestions.

I had gone down the route of using prosemirror-changeset as some had suggested for this, but accepting or rejecting individual suggestions out of order was quite complex in changeset, so I went back to this method of keeping the suggestions in the document.  If you'd like to see where I went with that work you can see the [changeset branch here](https://github.com/davefowler/prosemirror-suggestion-mode/tree/changeset).

## License

[MIT](https://choosealicense.com/licenses/mit/)

