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

// Default tooltip renderer that can be overridden
const renderTooltip = (
  mark: Mark,
  type: "insert" | "delete",
  view: EditorView,
  pos: number
): HTMLElement => {
  const tooltip = document.createElement("div");
  tooltip.className = "suggestion-tooltip";

  const date = new Date(mark.attrs.createdAt).toLocaleDateString();
  const infoText = document.createElement("div");
  infoText.className = "suggestion-info";
  infoText.textContent =
    type === "delete"
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
    acceptSuggestion(view, mark, type, pos);
  });

  const rejectButton = document.createElement("button");
  rejectButton.className = "suggestion-reject";
  rejectButton.textContent = "Reject";
  rejectButton.addEventListener("click", (e) => {
    e.stopPropagation();
    rejectSuggestion(view, mark, type, pos);
  });

  buttonsDiv.appendChild(acceptButton);
  buttonsDiv.appendChild(rejectButton);
  tooltip.appendChild(buttonsDiv);

  return tooltip;
};

// Function to accept a suggestion
const acceptSuggestion = (
  view: EditorView,
  mark: Mark,
  type: "insert" | "delete",
  pos: number
) => {
  const tr = view.state.tr;
  console.log("acceptSuggestion", mark, type, pos);

  // Mark this transaction as a suggestion operation so it won't be intercepted
  tr.setMeta(suggestionsPluginKey, { suggestionOperation: true });

  if (type === "insert") {
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
  } else if (type === "delete") {
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
const rejectSuggestion = (
  view: EditorView,
  mark: Mark,
  type: "insert" | "delete",
  pos: number
) => {
  const tr = view.state.tr;
  console.log("rejectSuggestion", mark, type, pos);

  // Mark this transaction as a suggestion operation so it won't be intercepted
  tr.setMeta(suggestionsPluginKey, { suggestionOperation: true });

  if (type === "insert") {
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
  } else if (type === "delete") {
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
                return renderTooltip(addMark, "insert", view, pos);
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
                return renderTooltip(delMark, "delete", view, pos);
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

    // handleKeyDown(view: EditorView, event: KeyboardEvent) {
    //   const state = this.getState(view.state);
    //   if (!state?.inSuggestionMode) return false;

    //   console.log(
    //     "handleKeyDown: inSuggestionMode is",
    //     state.inSuggestionMode,
    //     "and event.key is",
    //     event.key
    //   );

    //   // Handle delete and backspace
    //   if (event.key === "Delete" || event.key === "Backspace") {
    //     // event.preventDefault();

    //     const tr = view.state.tr;
    //     const { $from, $to } = view.state.selection;
    //     console.log("handleKeyDown: deleting", $from.pos, $to.pos);
    //     let delFrom = $from.pos;
    //     let delTo = $to.pos;

    //     if ($from.pos === $to.pos) {
    //       delFrom = event.key === "Backspace" ? $from.pos - 1 : $from.pos;
    //       delTo = event.key === "Backspace" ? $from.pos : $from.pos + 1;
    //     }
    //     if (delFrom < 0 || delTo > view.state.doc.content.size) return false;

    //     // Check if any part of the selected range is inside a suggestion_add mark
    //     let isInsideAddMark = false;
    //     view.state.doc.nodesBetween(delFrom, delTo, (node, pos) => {
    //       const marks = node.marks || [];
    //       if (
    //         marks.some(
    //           (m: Mark) => m.type === view.state.schema.marks.suggestion_add
    //         )
    //       ) {
    //         isInsideAddMark = true;
    //         return false; // let it continue and perform the delete
    //       }
    //     });

    //     if (isInsideAddMark) {
    //       console.log("Selection is inside an add mark");
    //       // Perform a regular delete, not a suggestion_delete
    //       return false;
    //     }

    //     // check if a suggestion_delete mark exists just after this selection
    //     const $delPos = view.state.doc.resolve(delTo);
    //     const node = $delPos.nodeAfter;
    //     const marks = node ? node.marks : [];
    //     const existingMark = marks.find(
    //       (m: Mark) => m.type === view.state.schema.marks.suggestion_delete
    //     );

    //     // Additional debugging output
    //     console.log("Marks at position", $delPos.pos, ":", marks);
    //     console.log("Existing suggestion_delete mark:", existingMark);
    //     console.log(
    //       "the letter at position",
    //       $delPos.pos,
    //       "is",
    //       node ? node.text : "N/A",
    //       node ? node.type.name : "N/A"
    //     );

    //     if (existingMark) {
    //       let markFrom = $delPos.pos;
    //       let markTo = $delPos.pos;

    //       // Find the start of the mark
    //       while (markFrom > 0) {
    //         const $pos = view.state.doc.resolve(markFrom - 1);
    //         if (
    //           !$pos.nodeAfter ||
    //           !$pos.nodeAfter.marks.some((m: Mark) => m.eq(existingMark))
    //         ) {
    //           break;
    //         }
    //         markFrom--;
    //       }

    //       // Find the end of the mark
    //       while (markTo < view.state.doc.content.size) {
    //         const $pos = view.state.doc.resolve(markTo);
    //         if (
    //           !$pos.nodeAfter ||
    //           !$pos.nodeAfter.marks.some((m: Mark) => m.eq(existingMark))
    //         ) {
    //           break;
    //         }
    //         markTo++;
    //       }

    //       console.log("Existing mark range:", markFrom, "to", markTo);

    //       // Expand the existing mark
    //       tr.removeMark(
    //         markFrom,
    //         markTo,
    //         view.state.schema.marks.suggestion_delete
    //       );
    //       console.log("removed mark from", markFrom, "to", markTo);
    //       // extend the del range to include the existing mark
    //       delFrom = Math.min(markFrom, delFrom);
    //       delTo = Math.max(markTo, delTo);
    //     }

    //     // create a new suggestion_delete mark
    //     tr.addMark(
    //       delFrom,
    //       delTo,
    //       view.state.schema.marks.suggestion_delete.create({
    //         createdAt: Date.now(),
    //         username: state.username,
    //         data: state.data,
    //       })
    //     );
    //     console.log("created suggestion_delete mark in range", delFrom, delTo);

    //     // Move cursor appropriately
    //     if (event.key === "Backspace") {
    //       const Selection = view.state.selection.constructor as any;
    //       tr.setSelection(Selection.create(tr.doc, delFrom));
    //     } else {
    //       const Selection = view.state.selection.constructor as any;
    //       tr.setSelection(Selection.create(tr.doc, delTo));
    //     }

    //     view.dispatch(tr);
    //     return true; // delete handled. returning true to stop further processing
    //   }
    //   return false;
    // },

    // handleTextInput(view: EditorView, from: number, to: number, text: string) {
    //   const state = this.getState(view.state);
    //   if (!state?.inSuggestionMode) return false;
    //   return false;
    // },

    // handleTextInput(view: EditorView, from: number, to: number, text: string) {
    //   const state = this.getState(view.state);
    //   if (!state?.inSuggestionMode) return false;

    //   const meta = view.state.tr.getMeta(suggestionsPluginKey);
    //   // Skip handling if this is from a suggestion operation
    //   if (meta && meta.suggestionOperation) {
    //     console.log("Skipping handleTextInput for suggestion operation");
    //     return false;
    //   }

    //   // Also skip if skipHandleTextInput is set
    //   if (meta && meta.skipHandleTextInput) {
    //     console.log(
    //       "skipHandleTextInput is true, skipping handleTextInput",
    //       from,
    //       to,
    //       text
    //     );
    //     return false;
    //   }

    //   console.log(
    //     "1. handleTextInput",
    //     from,
    //     to,
    //     text.length,
    //     "text is:",
    //     text
    //   );

    //   // Check if the input text matches the text being deleted
    //   const replacedText = view.state.doc.textBetween(from, to);
    //   if (text === replacedText) {
    //     console.log("Ignoring redundant input:", text);
    //     return true; // ignore the redundant input
    //   }

    //   const tr = view.state.tr;
    //   console.log("setting skipHandleTextInput meta");
    //   tr.setMeta(suggestionsPlugin, { skipHandleTextInput: true });

    //   // check if this input is inside an existing suggestion_add or suggestion_delete mark
    //   const $pos = view.state.doc.resolve(from);
    //   const node = $pos.nodeAfter;
    //   const marks = node ? node.marks : [];
    //   const existingMark = marks.find(
    //     (m: Mark) =>
    //       m.type === view.state.schema.marks.suggestion_add ||
    //       m.type === view.state.schema.marks.suggestion_delete
    //   );

    //   if (existingMark) {
    //     console.log(
    //       "handleTextInput: input is already inside an existing suggestion_add or suggestion_delete mark."
    //     );
    //     return false; // allow the input to be processed
    //   }

    //   // check if there is a suggestion_add mark immediately before this input
    //   const $prevPos = view.state.doc.resolve(from);
    //   const prevNode = $prevPos.nodeBefore;
    //   const prevMarks = prevNode ? prevNode.marks : [];
    //   const prevExistingMark = prevMarks.find(
    //     (m: Mark) => m.type === view.state.schema.marks.suggestion_add
    //   );

    //   // Insert the text
    //   let newTo = from + text.length;
    //   let newFrom = from;

    //   if (prevExistingMark) {
    //     console.log("prevExistingMark found at", $prevPos.pos);
    //     // find the start of the prevExistingMark
    //     const markTo = $prevPos.pos;
    //     let markFrom = markTo;
    //     while (markFrom > 0) {
    //       const $pos = view.state.doc.resolve(markFrom - 1);
    //       if (
    //         !$pos.nodeAfter ||
    //         !$pos.nodeAfter.marks.some((m: Mark) => m.eq(prevExistingMark))
    //       ) {
    //         break;
    //       }
    //       markFrom--;
    //     }

    //     console.log("removing prevExistingMark range:", markFrom, "to", markTo);
    //     // remove the prevExistingMark
    //     tr.removeMark(markFrom, markTo, view.state.schema.marks.suggestion_add);

    //     // extend the suggestion_add range to include the existing mark
    //     newFrom = Math.min(markFrom, from);
    //     newTo = Math.max(markTo, from + text.length);
    //     console.log("extended suggestion_add range to:", newFrom, "to", newTo);
    //   }

    //   console.log("inserting text", text, "at", from, "to", to);
    //   tr.insertText(text, from, to);

    //   console.log("creating new suggestion_add mark at", newFrom, "to", newTo);
    //   // Create new mark with current timestamp and username
    //   const addMark = view.state.schema.marks.suggestion_add.create({
    //     createdAt: Date.now(),
    //     username: state.username,
    //     data: state.data,
    //   });
    //   tr.addMark(newFrom, newTo, addMark);
    //   console.log("replaced text?", replacedText);

    //   if (replacedText.length > 0) {
    //     // Apply mark to the newly inserted text
    //     const replaceFrom = from + text.length;
    //     console.log(
    //       "inserting back in replaced text",
    //       replacedText,
    //       "at",
    //       replaceFrom,
    //       "to",
    //       replaceFrom
    //     );
    //     tr.insertText(replacedText, replaceFrom, replaceFrom);

    //     const deletedMark = view.state.schema.marks.suggestion_delete.create({
    //       createdAt: Date.now(),
    //       username: state.username,
    //       data: state.data,
    //     });
    //     console.log(
    //       "adding deleted mark at",
    //       replaceFrom,
    //       "to",
    //       replaceFrom + replacedText.length
    //     );
    //     tr.addMark(replaceFrom, replaceFrom + replacedText.length, deletedMark);

    //     // set the selection to the end of the new text
    //     const Selection = view.state.selection.constructor as any;
    //     tr.setSelection(Selection.create(tr.doc, replaceFrom));
    //   }

    //   view.dispatch(tr);
    //   return true; // input handled. returning true to stop further processing
    // },

    //   handleDOMEvents: {
    //     beforeinput: (view: EditorView, event: InputEvent) => {
    //       console.log("beforeinput event:", {
    //         inputType: event.inputType,
    //         data: event.data,
    //         targetRange: event.getTargetRanges?.(),
    //         selection: view.state.selection,
    //       });

    //       if (
    //         event.inputType === "deleteContentForward" ||
    //         event.inputType === "deleteContentBackward"
    //       ) {
    //         // Intercept the delete of a selected range here
    //         console.log("beforeinput event:", {
    //           inputType: event.inputType,
    //           data: event.data,
    //           targetRange: event.getTargetRanges?.(),
    //           selection: view.state.selection,
    //         });
    //         // If you handle it, prevent ProseMirror's default by returning true
    //         return true;
    //       }

    //       return false; // Let ProseMirror handle other beforeinput events
    //     },
    //   },
    // },
  },
});
