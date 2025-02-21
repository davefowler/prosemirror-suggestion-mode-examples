# Project Prompt: ProseMirrorSuggestions

## Project Overview

Create a ProseMirror extension called **ProseMirrorSuggestions** that allows users to toggle a **suggestion mode**, similar to Google Docs' suggestion or "track changes" feature. When **suggestion mode** is active:

1. **Text Insertions:** Any newly inserted text should automatically be wrapped in a mark (`suggestion_add`). This mark should visually highlight the inserted text with a green background.

2. **Text Deletions:** Instead of immediately deleting selected text, create a **suggestion deletion mark** (`suggestion_delete`).

   - The UI should not show the deleted text directly. Instead, show a small red square (or button) in the document where the deletion occurred.
   - When the user hovers over this red square, the deleted text should be revealed (e.g., using a tooltip or by changing the color to make the text visible).
   - This approach minimizes noise during review, keeping the document cleaner and easier to read.

3. **Accepting & Rejecting Suggestions:** The extension should provide API methods to accept or reject individual suggestions. Accepting an addition should remove the suggestion mark and normalize the content. Rejecting an addition should remove the added text. For deletions, accepting should remove the text, while rejecting should restore it.

---

## Example User Flows

### 1. **Toggling Suggestion Mode**

- The user clicks a "Toggle Suggestion Mode" button in the UI.
- When enabled, any new changes are treated as suggestions rather than immediate edits.

### 2. **Making Suggestions**

- **Adding Text:** While suggestion mode is on, typing new text should automatically mark it with `suggestion_add`.
- **Deleting Text:** Selecting text and executing a deletion should not remove the text immediately. Instead, the text should be marked with `suggestion_delete` and represented by a small red square.

### 3. **Reviewing Suggestions**

- When in review mode, the UI should display all suggestions.
- The reviewer can hover over red squares to see suggested deletions.
- The reviewer can accept or reject suggestions through UI controls.

---

## Key Components to Implement

### 1. **Schema Extensions**

Add two marks to the ProseMirror schema:

```js
// Mark for suggested additions
const suggestion_add = {
  attrs: { createdAt: { default: null } },
  parseDOM: [{ tag: "span[data-suggestion-add]" }],
  toDOM(mark) {
    return ["span", { "data-suggestion-add": "true", class: "suggestion-add" }, 0];
  }
};

// Mark for suggested deletions
const suggestion_delete = {
  attrs: { createdAt: { default: null }, hiddenText: { default: "" } },
  parseDOM: [{ tag: "span[data-suggestion-delete]" }],
  toDOM(mark) {
    return ["span", { "data-suggestion-delete": "true", class: "suggestion-delete", "data-hidden-text": mark.attrs.hiddenText }, 0];
  }
};
```

---

## Desired Outcome

The AI should produce a working extension for ProseMirror that includes:

1. **Suggestion Mode Toggle:** Ability to switch between normal edit mode and suggestion mode.
2. **Mark Insertions and Deletions:** Insertions appear with a green highlight. Deletions show as red squares that reveal text on hover.
3. **Accept/Reject Suggestions:** Implement UI buttons or API methods to manage suggestions.
4. **Styling:** Clean, minimal CSS that differentiates between normal, added, and deleted text.
5. **Example HTML Page:** A test page where all features can be tested interactively.

---

## Additional Considerations

- **Undo/Redo Support:** Ensure that suggestions play nicely with undo/redo behavior.
- **Acceptance/Rejection of Suggestions:** Build UI elements or API methods to accept/reject suggestions.
- **Performance:** Handle large documents gracefully, keeping the suggestion logic performant.
- **Error Handling:** Avoid edge cases like empty selections, nested marks, and ensure smooth behavior with ProseMirror's history plugin.

---

## Goals for the AI (e.g., Aider)

1. **Setup ProseMirror Environment:** Create a simple ProseMirror editor instance with minimal setup.
2. **Implement the Suggestion Mode Plugin:** Add functionality to toggle suggestion mode.
3. **Create Insertion & Deletion Handlers:** Implement automatic marking of insertions and deletions as suggestions.
4. **Style the Suggestions in the UI:** Apply CSS to visually distinguish additions and deletions.
5. **Provide Accept/Reject Methods:** Add UI or API methods to manage suggestions.
6. **Ensure Functionality & Testability:** Provide an example HTML page to test the feature.

---
