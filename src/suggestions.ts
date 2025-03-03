import { Plugin, Transaction, EditorState } from "prosemirror-state";
import { ReplaceStep } from "prosemirror-transform";
import { Mark, Node } from "prosemirror-model";
import { Decoration, DecorationSet } from "prosemirror-view";
import { SuggestionsPluginState, suggestionsPluginKey } from "./key";
import {
  SuggestionHoverMenuRenderer,
  defaultRenderSuggestionHoverMenu,
} from "./hoverMenu";

// Plugin options interface
export interface SuggestionModePluginOptions {
  username?: string; // username of the user who is making the suggestion
  data?: Record<string, any>; // custom data to be added to the suggestion hover menu
  hoverMenuRenderer?: SuggestionHoverMenuRenderer; // custom renderer for the suggestion hover menu
}

// Create the suggestions plugin
export const suggestionModePlugin = (
  options: SuggestionModePluginOptions = {}
) => {
  // Use provided hover menu renderer or fall back to default
  const renderHoverMenu =
    options.hoverMenuRenderer || defaultRenderSuggestionHoverMenu;

  return new Plugin({
    key: suggestionModePluginKey,

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
        // Skip if this is an internal operation
        const meta = transaction.getMeta(suggestionsPluginKey);
        if (meta && meta.suggestionOperation) {
          return;
        }

        transaction.steps.forEach((step) => {
          if (step instanceof ReplaceStep) {
            const from = step.from;
            const to = step.to;
            const oldText = oldState.doc.textBetween(from, to, " ");
            const newText = step.slice.content.textBetween(
              0,
              step.slice.content.size,
              " "
            );
            const newFrom = from + oldText.length;
            const newTo = newFrom + newText.length;
            const isDelete = oldText.length > 0 && newText.length === 0;
            const isAdd = oldText.length === 0 && newText.length > 0;
            const isReplace = oldText.length > 0 && newText.length > 0;
            // if from is inside a suggestion mark don't do anything
            const from$ = newState.doc.resolve(from + (isDelete ? +1 : 0));
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
            // Mark our next transactions as  internal suggestion operation so it won't be intercepted again
            tr.setMeta(suggestionsPluginKey, {
              suggestionOperation: true,
              handled: true, // Add this flag to indicate this input has been handled
            });

            if (oldText.length > 0) {
              // DELETE - reinsert removed text with a suggestion_delete mark
              let markFrom = from;
              let markTo = from + oldText.length;

              // Check for adjacent suggestion_delete mark (on old version of doc)
              const deleteMarkRange = findMarkRange(
                newState,
                markFrom,
                "suggestion_delete"
              );

              tr.insertText(oldText, from, from);
              if (deleteMarkRange) {
                // Remove existing mark and expand mark range to include it
                tr.removeMark(
                  deleteMarkRange.from,
                  deleteMarkRange.to,
                  newState.schema.marks.suggestion_delete
                );
                // Expand range to include existing mark
                markFrom = Math.min(
                  markFrom,
                  deleteMarkRange.from + oldText.length
                );
                markTo = Math.max(markTo, deleteMarkRange.to + oldText.length);
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
              // ADD - insert new text with a suggestion_add mark
              let markFrom = newFrom;
              let markTo = newTo;

              // Check for adjacent suggestion_add mark
              const addMarkRange = findMarkRange(
                newState,
                newFrom,
                "suggestion_add"
              );

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
          username: options.username || "Anonymous",
          data: options.data || {},
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

            // Add the hover menu within the wrapper
            decos.push(
              Decoration.widget(
                pos,
                (view) => {
                  return renderHoverMenu(addMark, view, pos);
                },
                {
                  side: 1,
                  key: `suggestion-add-hover-menu-${pos}`,
                  class: "suggestion-hover-menu-wrapper",
                }
              )
            );
          }

          // Handle suggestion_delete marks
          const delMark = node.marks.find(
            (m: Mark) => m.type.name === "suggestion_delete"
          );
          if (delMark) {
            // Create a wrapper for both the suggestion and its hover menu
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

            // Add hover menu for deleted text
            decos.push(
              Decoration.widget(
                pos,
                (view) => {
                  return renderHoverMenu(delMark, view, pos);
                },
                {
                  side: 1,
                  key: `suggestion-delete-hover-menu-${pos}`,
                  class: "suggestion-hover-menu-wrapper",
                }
              )
            );
          }
        });

        return DecorationSet.create(state.doc, decos);
      },
    },
  });
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
