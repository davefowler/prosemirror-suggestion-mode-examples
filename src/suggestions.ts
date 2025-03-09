import { Plugin, Transaction, EditorState } from 'prosemirror-state';
import {
  ReplaceStep,
  AddMarkStep,
  RemoveMarkStep,
  ReplaceAroundStep,
} from 'prosemirror-transform';
import { Mark, Node } from 'prosemirror-model';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { SuggestionModePluginState, suggestionModePluginKey } from './key';
import {
  SuggestionHoverMenuRenderer,
  createSuggestionHoverMenu,
  SuggestionHoverMenuOptions,
} from './hoverMenu';

type AnyStep = ReplaceStep | AddMarkStep | RemoveMarkStep | ReplaceAroundStep;
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
  renderHoverMenu = renderHoverMenu || createSuggestionHoverMenu;

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

        transaction.steps.forEach((step: AnyStep) => {
          //  1 ReplaceStep: Created when text is inserted, deleted, or replaced. This is the most common step type, triggered by:
          //     • Typing text
          //     • Deleting text (backspace/delete)
          //     • Pasting content
          //     • Cutting content
          //  2 AddMarkStep: Created when adding a mark to existing content, triggered by:
          //     • Applying formatting (bold, italic, etc.)
          //     • Using formatting keyboard shortcuts (Ctrl+B, Ctrl+I)
          //     • Using formatting buttons in the toolbar
          //  3 RemoveMarkStep: Created when removing a mark from content, triggered by:
          //     • Removing formatting
          //     • Toggling off a mark that was previously applied
          //  4 ReplaceAroundStep: Created for more complex replacements that preserve some content, triggered by:
          //     • Wrapping content in a node (e.g., turning text into a list item)
          //     • Unwrapping content from a node

          //step instanceof ReplaceStep) { // TODO - remove if unecessry
          console.log('transaction step is of type ', typeof step, step);
          const from = step.from;
          const to = step.to;

          const removedSlice = oldState.doc.slice(from, to, false); // TODO - last boolean is includeParents.  Needed?
          const addedSlice =
            step instanceof AddMarkStep || step instanceof RemoveMarkStep
              ? removedSlice
              : step.slice;

          // Mark our next transactions as  internal suggestion operation so it won't be intercepted again
          tr.setMeta(suggestionModePluginKey, {
            suggestionOperation: true,
            handled: true, // Add this flag to indicate this input has been handled
          });

          // Check if we're inside an existing suggestion mark
          // This needs a more robust check
          // TODO - i could just check if the slice has a mark applied?

          console.log('checking mark at position:', from);
          const $pos = oldState.doc.resolve(from);
          const marksAtPos = $pos.marks();
          const suggestionMark = marksAtPos.find(
            (m) =>
              m.type.name === 'suggestion_add' ||
              m.type.name === 'suggestion_delete'
          );
          if (suggestionMark) {
            if (addedSlice.content.size > 1) {
              console.log(
                'inserting new text and adding mark',
                addedSlice.content,
                from,
                suggestionMark
              );
              // need to handle a paste in the middle of a suggestion mark
              // insert the new text and add the wrapping mark to it
              console.log('adding mark', suggestionMark.type.name);
              tr.addMark(from, from + addedSlice.content.size, suggestionMark);
              // seems to automatically get rid of other suggestion marks
              changed = true;
            }
            // We are already inside a suggestion mark, don't process further
            return;
          }

          if (removedSlice.content.size > 0) {
            // content was removed.  We need to put it back and add a suggestion_delete to it
            tr.insert(from, removedSlice.content);
            tr.addMark(
              from,
              from + removedSlice.content.size,
              newState.schema.marks.suggestion_delete.create({
                username: pluginState.username,
                data: { ...pluginState.data, ...(meta?.data || {}) },
              })
            );
            changed = true;
          }

          if (addedSlice.content.size > 0) {
            // ADD - mark the new text with a suggestion_add
            // The insert already happend
            // but we've just inserted the removedSlice infront of it so we need to adjust
            const addedFrom = from + removedSlice.content.size;

            tr.addMark(
              addedFrom,
              addedFrom + addedSlice.content.size,
              newState.schema.marks.suggestion_add.create({
                username: pluginState.username,
                data: { ...pluginState.data, ...(meta?.data || {}) },
              })
            );
            changed = true;
          }

          // if it's only a deletion, move the cursor to the start of the deleted text
          if (addedSlice.content.size === 0) {
            const newCursorPos = from;
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
          username: options.username || 'Anonymous',
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
        let currentGroup: {
          start: number;
          end: number;
          username: string;
          marks: Mark[];
        } | null = null;

        // First pass: collect all marks and their ranges
        state.doc.descendants((node: Node, pos: number) => {
          const suggestionMark = node.marks.find(
            (m) =>
              m.type.name === 'suggestion_add' ||
              m.type.name === 'suggestion_delete'
          );

          if (suggestionMark) {
            if (!currentGroup) {
              // Start a new group
              currentGroup = {
                start: pos,
                end: pos + node.nodeSize,
                username: suggestionMark.attrs.username,
                marks: [suggestionMark],
              };
            } else if (
              currentGroup.username === suggestionMark.attrs.username
            ) {
              // Extend current group
              currentGroup.end = pos + node.nodeSize;
              currentGroup.marks.push(suggestionMark);
            } else {
              // Add decorations for the completed group
              addGroupDecorations(decos, currentGroup, renderHoverMenu);

              // Start new group
              currentGroup = {
                start: pos,
                end: pos + node.nodeSize,
                username: suggestionMark.attrs.username,
                marks: [suggestionMark],
              };
            }
          } else if (currentGroup) {
            // No suggestion mark found, finish current group if it exists
            addGroupDecorations(decos, currentGroup, renderHoverMenu);
            currentGroup = null;
          }
        });

        // Handle the last group if it exists
        if (currentGroup) {
          addGroupDecorations(decos, currentGroup, renderHoverMenu);
        }

        return DecorationSet.create(state.doc, decos);
      },
    },
  });
};

// Helper function to add decorations for a group
function addGroupDecorations(
  decos: Decoration[],
  group: { start: number; end: number; username: string; marks: Mark[] },
  renderHoverMenu: SuggestionHoverMenuRenderer
) {
  // Add the group wrapper decoration first
  decos.push(
    Decoration.widget(
      group.start,
      (view) => {
        return renderHoverMenu(group.marks, view, group.start);
      },
      {
        side: -1,
        key: `suggestion-hover-menu-${group.start}`,
        class: 'suggestion-hover-menu-wrapper',
      }
    )
  );

  // Then add the group decoration that wraps everything
  decos.push(
    Decoration.inline(group.start, group.end, {
      class: 'suggestion-group',
    })
  );
}

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
