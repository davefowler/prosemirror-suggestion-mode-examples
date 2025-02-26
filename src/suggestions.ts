import { Plugin, PluginKey, Transaction, EditorState } from "prosemirror-state";
import { ReplaceStep } from "prosemirror-transform";
import { Mark, Node } from "prosemirror-model";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

// Define interfaces for plugin state
interface SuggestionsPluginState {
  inSuggestionMode: boolean;
  username: string;
  activeMarkRange: { from: number; to: number; createdAt: number } | null;
  data?: Record<string, any>;
  skipHandleTextInput?: boolean;
}

// Plugin key for accessing the plugin state
export const suggestionsPluginKey = new PluginKey<SuggestionsPluginState>(
  "suggestions"
);

export const setSuggestionMode = (
  view: EditorView,
  isSuggestionMode: boolean
) => {
  const state = suggestionsPluginKey.getState(view.state);
  if (!state) return;
  view.dispatch(
    view.state.tr.setMeta(suggestionsPlugin, {
      ...state,
      inSuggestionMode: isSuggestionMode,
    })
  );
};

const handleAllSuggestions = (
  view: EditorView,
  acceptOrReject: "accept" | "reject"
) => {
  view.state.doc.descendants((node, pos) => {
    const suggestionMark = node.marks.find(
      (m) =>
        m.type.name === "suggestion_add" || m.type.name === "suggestion_delete"
    );
    if (!suggestionMark) return;

    if (acceptOrReject === "accept") {
      acceptSuggestion(view, suggestionMark, pos);
    } else {
      rejectSuggestion(view, suggestionMark, pos);
    }
  });
};

export const acceptAllSuggestions = (view: EditorView) => {
  handleAllSuggestions(view, "accept");
};

export const rejectAllSuggestions = (view: EditorView) => {
  handleAllSuggestions(view, "reject");
};

// Default tooltip renderer that can be overridden
const renderTooltip = (
  mark: Mark,
  view: EditorView,
  pos: number
): HTMLElement => {
  const tooltip = document.createElement("div");
  tooltip.className = "suggestion-tooltip";

  const date = new Date(mark.attrs.createdAt).toLocaleDateString();
  const infoText = document.createElement("div");
  infoText.className = "suggestion-info";
  infoText.textContent =
    mark.type.name === "suggestion_delete"
      ? `Deleted by ${mark.attrs.username} on ${date}`
      : `Added by ${mark.attrs.username} on ${date}`;
  tooltip.appendChild(infoText);

  // Add custom data if present
  if (mark.attrs.data) {
    try {
      const customData =
        typeof mark.attrs.data === "string"
          ? JSON.parse(mark.attrs.data)
          : mark.attrs.data;
      const dataStr = Object.entries(customData)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
      const dataElement = document.createElement("div");
      dataElement.textContent = `Custom data: ${dataStr}`;
      tooltip.appendChild(dataElement);
    } catch (e) {
      console.warn("Failed to parse custom data in suggestion mark:", e);
    }
  }

  // Add accept and reject buttons
  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "suggestion-buttons";

  const acceptButton = document.createElement("button");
  acceptButton.className = "suggestion-accept";
  acceptButton.textContent = "Accept";
  acceptButton.addEventListener("click", (e) => {
    e.stopPropagation();
    acceptSuggestion(view, mark, pos);
  });

  const rejectButton = document.createElement("button");
  rejectButton.className = "suggestion-reject";
  rejectButton.textContent = "Reject";
  rejectButton.addEventListener("click", (e) => {
    e.stopPropagation();
    rejectSuggestion(view, mark, pos);
  });

  buttonsDiv.appendChild(acceptButton);
  buttonsDiv.appendChild(rejectButton);
  tooltip.appendChild(buttonsDiv);

  return tooltip;
};

// Updated function to accept a suggestion without requiring type parameter
const acceptSuggestion = (view: EditorView, mark: Mark, pos: number) => {
  const tr = view.state.tr;
  console.log("acceptSuggestion", mark, pos);

  // Mark this transaction as a suggestion operation so it won't be intercepted
  tr.setMeta(suggestionsPluginKey, { suggestionOperation: true });

  if (mark.type.name === "suggestion_add") {
    // For added text, we keep the text but remove the mark
    // Find the full range of this mark
    let from = pos;
    let to = pos;

    // Find the boundaries of the mark
    view.state.doc.nodesBetween(
      0,
      view.state.doc.content.size,
      (node, nodePos) => {
        if (node.marks.some((m) => m.eq(mark))) {
          from = Math.min(from, nodePos);
          to = Math.max(to, nodePos + node.nodeSize);
        }
      }
    );

    // Remove just the mark, keeping the text
    tr.removeMark(from, to, mark.type);
  } else if (mark.type.name === "suggestion_delete") {
    // For deleted text, we remove both the text and the mark
    let from = pos;
    let to = pos;

    // Find the boundaries of the mark
    view.state.doc.nodesBetween(
      0,
      view.state.doc.content.size,
      (node, nodePos) => {
        if (node.marks.some((m) => m.eq(mark))) {
          from = Math.min(from, nodePos);
          to = Math.max(to, nodePos + node.nodeSize);
        }
      }
    );

    console.log("deleting text from", from, "to", to);
    // Delete the text that has the deletion mark
    tr.delete(from, to);
  }

  view.dispatch(tr);
};

// Function to reject a suggestion
const rejectSuggestion = (view: EditorView, mark: Mark, pos: number) => {
  const tr = view.state.tr;
  console.log("rejectSuggestion", mark, pos);

  // Mark this transaction as a suggestion operation so it won't be intercepted
  tr.setMeta(suggestionsPluginKey, { suggestionOperation: true });

  if (mark.type.name === "suggestion_add") {
    // For added text, we remove both the text and the mark
    let from = pos;
    let to = pos;

    // Find the boundaries of the mark
    view.state.doc.nodesBetween(
      0,
      view.state.doc.content.size,
      (node, nodePos) => {
        if (node.marks.some((m) => m.eq(mark))) {
          from = Math.min(from, nodePos);
          to = Math.max(to, nodePos + node.nodeSize);
        }
      }
    );

    // Delete the text that has the insertion mark
    tr.delete(from, to);
  } else if (mark.type.name === "suggestion_delete") {
    // For deleted text, we keep the text but remove the mark
    let from = pos;
    let to = pos;

    // Find the boundaries of the mark
    view.state.doc.nodesBetween(
      0,
      view.state.doc.content.size,
      (node, nodePos) => {
        if (node.marks.some((m) => m.eq(mark))) {
          from = Math.min(from, nodePos);
          to = Math.max(to, nodePos + node.nodeSize);
        }
      }
    );

    // Remove just the mark, keeping the text
    tr.removeMark(from, to, mark.type);
  }

  view.dispatch(tr);
};

// Function to find if a position is inside a mark and return its range
export const findMarkRange = (
  state: EditorState,
  pos: number,
  markName: string
): { from: number; to: number; mark: Mark } | null => {
  const $pos = state.doc.resolve(pos);

  // Check if the position has the mark
  const nodeAtPos = $pos.nodeAfter || $pos.nodeBefore;
  if (!nodeAtPos) return null;

  const mark = nodeAtPos.marks.find((m) => m.type.name === markName);
  if (!mark) return null;

  // Find the range of the mark
  let from = pos;
  let to = pos;

  // Find the start of the mark
  while (from > 0) {
    const $from = state.doc.resolve(from - 1);
    const nodeBefore = $from.nodeAfter;
    if (!nodeBefore || !nodeBefore.marks.some((m) => m.eq(mark))) {
      break;
    }
    from--;
  }

  // Find the end of the mark
  while (to < state.doc.content.size) {
    const $to = state.doc.resolve(to);
    const nodeAfter = $to.nodeAfter;
    if (!nodeAfter || !nodeAfter.marks.some((m) => m.eq(mark))) {
      break;
    }
    to += nodeAfter.nodeSize;
  }

  return { from, to, mark };
};

// Create the suggestions plugin
export const suggestionsPlugin = new Plugin({
  key: suggestionsPluginKey,

  appendTransaction(
    transactions: readonly Transaction[],
    oldState: EditorState,
    newState: EditorState
  ) {
    // handle when a selection is deleted
    const pluginState = this.getState(oldState);
    if (!pluginState?.inSuggestionMode) return null;

    let tr = newState.tr;
    let changed = false;

    transactions.forEach((transaction) => {
      // Skip if this is a suggestion operation
      const meta = transaction.getMeta(suggestionsPluginKey);
      if (meta && meta.suggestionOperation) {
        console.log("skipping suggestion transaction", transaction);
        return;
      }

      transaction.steps.forEach((step) => {
        if (step instanceof ReplaceStep) {
          const from = step.from;
          const to = step.to;
          const text = oldState.doc.textBetween(from, to, " ");
          const newText = step.slice.content.textBetween(
            0,
            step.slice.content.size,
            " "
          );
          const newFrom = from + text.length;
          const newTo = newFrom + newText.length;

          // if from is inside a suggestion mark don't do anything
          const from$ = newState.doc.resolve(from);
          const marksAtFrom = from$.marks();
          const fromMark = marksAtFrom.find(
            (m) =>
              m.type.name === "suggestion_add" ||
              m.type.name === "suggestion_delete"
          );
          if (fromMark) {
            // We are already inside a suggestion mark, let normal editing happen
            return;
          }
          // Mark this transaction as a suggestion operation so it won't be intercepted again
          tr.setMeta(suggestionsPluginKey, {
            suggestionOperation: true,
            handled: true, // Add this flag to indicate this input has been handled
          });

          if (text.length > 0) {
            // reinsert old text with a suggestion_delete mark
            let markFrom = from;
            let markTo = from + text.length;

            // Check for adjacent suggestion_delete mark (on old version of doc)
            const deleteMarkRange = findMarkRange(
              newState,
              markFrom,
              "suggestion_delete"
            );

            tr.insertText(text, from, from);
            if (deleteMarkRange) {
              // Remove existing mark and expand mark range to include it
              tr.removeMark(
                deleteMarkRange.from,
                deleteMarkRange.to,
                newState.schema.marks.suggestion_delete
              );
              // Expand range to include existing mark
              markFrom = Math.min(markFrom, deleteMarkRange.from + text.length);
              markTo = Math.max(markTo, deleteMarkRange.to + text.length);
            }

            tr.addMark(
              markFrom,
              markTo,
              newState.schema.marks.suggestion_delete.create({
                createdAt: Date.now(),
                username: pluginState.username,
                data: pluginState.data,
              })
            );
            changed = true;
          }

          if (newText.length > 0) {
            // insert new text with a suggestion_add mark
            let markFrom = newFrom;
            let markTo = newTo;

            // Check for adjacent suggestion_add mark
            const addMarkRange = findMarkRange(
              newState,
              newFrom,
              "suggestion_add"
            );

            console.log("addMarkRange is", addMarkRange);
            if (addMarkRange) {
              // Remove existing mark
              tr.removeMark(
                addMarkRange.from,
                addMarkRange.to,
                newState.schema.marks.suggestion_add
              );

              // Expand range to include existing mark
              markFrom = Math.min(markFrom, addMarkRange.from);
              markTo = Math.max(markTo, addMarkRange.to);

              console.log(
                "merging with existing add mark, new range:",
                markFrom,
                "to",
                markTo
              );
            } else {
              console.log(
                "inserting new text",
                newText,
                "at",
                markFrom,
                "to",
                markTo
              );
            }

            // somewhere else the insert already happens don't re-insert
            tr.addMark(
              markFrom,
              markTo,
              newState.schema.marks.suggestion_add.create({
                createdAt: Date.now(),
                username: pluginState.username,
                data: pluginState.data,
              })
            );
            changed = true;
          }

          // if it's only a deletion, move the cursor to the start of the deleted text
          const newCursorPos = newText.length > 0 ? newTo : from;
          const Selection = newState.selection.constructor as any;
          tr.setSelection(Selection.create(tr.doc, newCursorPos));
        }
      });
    });

    // Return the transaction if there were changes; otherwise return null
    return changed ? tr : null;
  },

  state: {
    init(): SuggestionsPluginState {
      return {
        inSuggestionMode: true,
        username: "Anonymous",
        activeMarkRange: null,
      };
    },

    apply(
      tr: Transaction,
      value: SuggestionsPluginState
    ): SuggestionsPluginState {
      // If there's metadata associated with this transaction, merge it into the current state
      const meta = tr.getMeta(suggestionsPluginKey);
      if (meta) {
        return {
          ...value,
          ...meta,
        };
      }
      // Otherwise, return the existing state as-is
      return value;
    },
  },

  props: {
    decorations(state: EditorState) {
      const pluginState = this.getState(state);
      if (!pluginState) return DecorationSet.empty;

      const decos: Decoration[] = [];

      state.doc.descendants((node: Node, pos: number) => {
        // Handle suggestion_add marks
        const addMark = node.marks.find(
          (m: Mark) => m.type.name === "suggestion_add"
        );
        if (addMark) {
          // Add inline decoration for the actual text
          decos.push(
            Decoration.inline(pos, pos + node.nodeSize, {
              class: "suggestion-add",
            })
          );

          // Add the tooltip within the wrapper
          decos.push(
            Decoration.widget(
              pos,
              (view) => {
                return renderTooltip(addMark, view, pos);
              },
              {
                side: 1,
                key: `suggestion-add-tooltip-${pos}`,
                class: "suggestion-tooltip-wrapper",
              }
            )
          );
        }

        // Handle suggestion_delete marks
        const delMark = node.marks.find(
          (m: Mark) => m.type.name === "suggestion_delete"
        );
        if (delMark) {
          // Create a wrapper for both the suggestion and its tooltip
          decos.push(
            Decoration.inline(pos, pos + node.nodeSize, {
              class: "suggestion-wrapper suggestion-delete-wrapper",
            })
          );

          // Add class to the node with the deletion mark
          decos.push(
            Decoration.inline(pos, pos + node.nodeSize, {
              class: "suggestion-delete",
            })
          );

          // Add tooltip for deleted text
          decos.push(
            Decoration.widget(
              pos,
              (view) => {
                return renderTooltip(delMark, view, pos);
              },
              {
                side: 1,
                key: `suggestion-delete-tooltip-${pos}`,
                class: "suggestion-tooltip-wrapper",
              }
            )
          );
        }
      });

      return DecorationSet.create(state.doc, decos);
    },
  },
});
