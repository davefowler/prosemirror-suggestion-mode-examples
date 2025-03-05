import { Plugin, Transaction, EditorState } from "prosemirror-state";
import { ReplaceStep } from "prosemirror-transform";
import { Mark, Node } from "prosemirror-model";
import { Decoration, DecorationSet } from "prosemirror-view";
import { SuggestionModePluginState, suggestionModePluginKey } from "./key";
import {
  SuggestionHoverMenuRenderer,
  createSuggestionHoverMenu,
  defaultRenderSuggestionHoverMenu,
  SuggestionHoverMenuOptions,
} from "./hoverMenu";

// Plugin options interface
export interface SuggestionModePluginOptions {
  inSuggestionMode?: boolean; // starting status of suggestion mode
  username?: string;
  data?: Record<string, any>;
  hoverMenuRenderer?: SuggestionHoverMenuRenderer;
  hoverMenuOptions?: SuggestionHoverMenuOptions;
}

// Create the suggestions plugin
export const suggestionModePlugin = (
  options: SuggestionModePluginOptions = {}
) => {
  // If custom options but no renderer is provided, use default renderer with custom options
  let renderHoverMenu = options.hoverMenuRenderer;

  if (!renderHoverMenu && options.hoverMenuOptions) {
    renderHoverMenu = (mark, view, pos) =>
      createSuggestionHoverMenu(mark, view, pos, options.hoverMenuOptions);
  }

  // Fall back to default renderer
  renderHoverMenu = renderHoverMenu || defaultRenderSuggestionHoverMenu;

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
        const meta = transaction.getMeta(suggestionModePluginKey);
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
            
            // Check if we're inside an existing suggestion mark
            // This needs a more robust check
            const isInsideSuggestionMark = isInsideAnyMark(
              oldState,
              from,
              ["suggestion_add", "suggestion_delete"]
            );

            if (isInsideSuggestionMark) {
              // console.log('isInsideSuggestionMark', isInsideSuggestionMark, from);
              // We are already inside a suggestion mark, let normal editing happen
              return;
            }
            
            // Mark our next transactions as  internal suggestion operation so it won't be intercepted again
            tr.setMeta(suggestionModePluginKey, {
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
                  data: { ...pluginState.data, ...meta?.data || {} },
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
                  data: { ...pluginState.data, ...meta?.data || {} },
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
      init(): SuggestionModePluginState {
        return {
          inSuggestionMode: options.inSuggestionMode || false,
          username: options.username || "Anonymous",
          data: options.data || {},
        };
      },

      apply(
        tr: Transaction,
        value: SuggestionModePluginState
      ): SuggestionModePluginState {
        // If there's metadata associated with this transaction, merge it into the current state
        const meta = tr.getMeta(suggestionModePluginKey);
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

// Add this helper function to properly check if a position is inside a mark
export const isInsideAnyMark = (
  state: EditorState,
  pos: number,
  markNames: string[]
): boolean => {
  const $pos = state.doc.resolve(pos);
  let node = $pos.node($pos.depth);
  let index = $pos.index($pos.depth);
  
  // Check if we're at the end of a text node
  if (index === node.childCount) {
    const $before = state.doc.resolve(pos - 1);
    if ($before.parent === node) {
      const nodeBefore = $before.nodeBefore;
      if (nodeBefore) {
        // Check if the node before has any of the specified marks
        return nodeBefore.marks.some(mark => 
          markNames.includes(mark.type.name)
        );
      }
    }
  }
  
  // Check if the current position has any of the specified marks
  // First check if there's a node at this position
  const nodeAtPos = $pos.nodeAfter || $pos.nodeBefore;
  if (nodeAtPos) {
    return nodeAtPos.marks.some(mark => 
      markNames.includes(mark.type.name)
    );
  }
  
  // Also check the node at this position directly
  const resolvedNode = state.doc.nodeAt(pos);
  if (resolvedNode) {
    return resolvedNode.marks.some(mark => 
      markNames.includes(mark.type.name)
    );
  }
  
  return false;
};
