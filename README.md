# ProseMirrorSuggestions

A ProseMirror extension that implements a "suggestion mode" method to track and show changes similar to Google Docs', but inspired more by [Ink and Switch's Diffs](https://www.inkandswitch.com/patchwork/notebook/04/). This extension allows users to make suggested edits that can be reviewed, accepted, or rejected later.

## Design choices

For simplicity this is not really a diffing capability where you can input two different versions and see the changes.  Instead if a user makes changes with a suggestion mode enabled, the changes are stored as extra markup on the document.  It's not really version control, it's just a way to make suggestions.

## Features

- Toggle suggestion mode on/off
- Highlight suggested text additions in green
- Show suggested deletions as compact red squares that reveal text on hover
- Accept/reject individual suggestions
- Full undo/redo support
- Clean, minimal UI

## Installation

```bash
npm install
```

## Development

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

## Usage

### Basic Setup

```javascript
import { suggestionsPlugin } from 'prosemirror-suggestions'

// Add to your ProseMirror plugins
const plugins = [
  suggestionsPlugin,
  // ... other plugins
]
```

### Toggle Suggestion Mode

```javascript
// Enable suggestion mode
view.dispatch(view.state.tr.setMeta(suggestionsPlugin, {
  suggestionMode: true
}))

// Disable suggestion mode
view.dispatch(view.state.tr.setMeta(suggestionsPlugin, {
  suggestionMode: false
}))
```

### Accept/Reject Suggestions

```javascript
// Accept a suggestion at the current selection
suggestionsPlugin.accept(view)

// Reject a suggestion at the current selection
suggestionsPlugin.reject(view)
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
