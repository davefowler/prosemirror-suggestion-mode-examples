# ProseMirrorSuggestions

A ProseMirror extension that implements a "suggestion mode" similar to Google Docs' track changes feature. This extension allows users to make suggested edits that can be reviewed, accepted, or rejected later.

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
npm run dev
```

This will:
1. Build the project
2. Start a local development server
3. Open the example page in your browser
4. Watch for changes and reload automatically

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
