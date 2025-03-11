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
  hoverMenuFactory,
  SuggestionHoverMenuOptions,
} from './menus/hoverMenu';

type AnyStep = ReplaceStep | AddMarkStep | RemoveMarkStep | ReplaceAroundStep;
// Plugin options interface
export interface SuggestionModePluginOptions {
  inSuggestionMode?: boolean; // starting status of suggestion mode
  username?: string;
  data?: Record<string, any>;
  hoverMenuRenderer?: SuggestionHoverMenuRenderer;
  hoverMenuOptions?: SuggestionHoverMenuOptions;
}

let groupId = 1;

function decorateSuggestion(
  decos: Decoration[],
  start: number,
  end: number,
  attrs: Record<string, any>,
  renderHoverMenu: SuggestionHoverMenuRenderer
) {
  groupId++;

  // Add the group decoration with the ID
  decos.push(
    Decoration.inline(start, end, {
      class: 'suggestion-group',
      'data-group-id': `group-${groupId}`,
    })
  );

  // Add the hover menu with the same ID
  decos.push(
    Decoration.widget(
      start,
      (view) => {
        const wrapper = document.createElement('span');
        wrapper.className = 'suggestion-menu-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.verticalAlign = 'text-top'; // Align with top of text
        wrapper.style.height = '0';
        wrapper.style.width = '0';
        wrapper.style.overflow = 'visible';

        const menu = renderHoverMenu(start, end, attrs, {
          dispatch: (command) => command(view.state, view.dispatch),
        });
        wrapper.appendChild(menu);
        return wrapper;
      },
      {
        key: `hover-${start}`,
        side: -1,
      }
    )
  );
}

// Create the suggestions plugin
export const suggestionModePlugin = (
  options: SuggestionModePluginOptions = {}
) => {
  // If custom options but no renderer is provided, use default renderer with custom options
  const renderHoverMenu =
    options.hoverMenuRenderer ||
    hoverMenuFactory(options?.hoverMenuOptions || {});

  return new Plugin({
    key: suggestionModePluginKey,

    // After a transaction is applied we add our suggestion marks to it
    // This will not impact undo/redo as ProseMirror's history plugin
    // automatically combines related transactions that happen close together in time
    // this is chosen over wrapping dispatchTransaction because it will keep a clean set of steps
    // and be less likely to interfere with other plugins.
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

        // Process each step in the transaction
        // This works for all 4 types of steps: ReplaceStep, AddMarkStep, RemoveMarkStep, ReplaceAroundStep
        transaction.steps.forEach((step: AnyStep) => {
          // TODO write better tests for ReplaceStep
          const from = step.from;
          const to = step.to;

          const removedSlice = oldState.doc.slice(from, to, false);
          // in all but the ReplaceStep, the removedSlice is the same size as the addedSlice
          // so we can use it as the addedSlice, as we're just adding a mark over that range
          const addedSlice =
            step instanceof ReplaceStep ? step.slice : removedSlice;

          // Mark our next transactions as  internal suggestion operation so it won't be intercepted again
          tr.setMeta(suggestionModePluginKey, {
            suggestionOperation: true,
            handled: true, // Add this flag to indicate this input has been handled
          });

          // Check if we're inside an existing suggestion mark
          const $pos = oldState.doc.resolve(from);
          const marksAtPos = $pos.marks();
          const suggestionMark = marksAtPos.find(
            (m) =>
              m.type.name === 'suggestion_add' ||
              m.type.name === 'suggestion_delete'
          );

          if (suggestionMark) {
            if (addedSlice.content.size > 1) {
              // a paste has happened in the middle of a suggestion mark
              // insert the new text and add the wrapping mark to it
              tr.addMark(from, from + addedSlice.content.size, suggestionMark);
              // seems to automatically get rid of other suggestion marks
              changed = true;
            }
            // We are already inside a suggestion mark, no additional processing needed
            return;
          }

          if (removedSlice.content.size > 0) {
            // content was removed.
            // We need to put it back with a suggestion_delete mark on it
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
            // Original logic for regular replacements
            const addedFrom = step.from + removedSlice.content.size;
            // ReplaceAroundStep has an insert property that is the number of extra characters inserted
            // for things like numbers in a list item
            const extraInsertChars =
              step instanceof ReplaceAroundStep ? step.insert : 0;
            const addedTo =
              addedFrom + addedSlice.content.size + extraInsertChars;

            tr.addMark(
              addedFrom,
              addedTo,
              newState.schema.marks.suggestion_add.create({
                username: pluginState.username,
                data: { ...pluginState.data, ...(meta?.data || {}) },
              })
            );
            changed = true;
          }

          if (addedSlice.content.size === 0) {
            // They hit backspace and then we added the removedSlice back in
            // we need to move the cursor to the start (from the end) of the text we put back in
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
        const decos: Decoration[] = [];
        let groupStart: number | null = null;
        let groupEnd: number | null = null;
        let currentUsername: string | null = null;
        let currentAttrs: Record<string, any> | null = null;

        state.doc.descendants((node, pos, parent, index) => {
          const suggestionMark = node.marks.find(
            (m) =>
              m.type.name === 'suggestion_add' ||
              m.type.name === 'suggestion_delete'
          );

          // Quick return if no suggestion and no active group
          if (!suggestionMark && !groupStart) return;

          // End current group if username changes or no suggestion
          if (
            (suggestionMark &&
              currentUsername !== suggestionMark.attrs.username) ||
            !suggestionMark
          ) {
            if (groupStart !== null) {
              decorateSuggestion(
                decos,
                groupStart,
                groupEnd,
                currentAttrs,
                renderHoverMenu
              );
            }
            groupStart = null;
            groupEnd = null;
            currentUsername = null;
            currentAttrs = null;
          }

          // Start new group if we have a suggestion
          if (suggestionMark) {
            if (!groupStart) {
              groupStart = pos;
              currentUsername = suggestionMark.attrs.username;
              currentAttrs = suggestionMark.attrs;
            }
            // always set a group end, it will be incremented if the next node part of the same group
            groupEnd = pos + node.nodeSize;
          }

          // If it's the last node and we have an active group, close it
          const isLastNode = index === parent.childCount - 1;
          if (isLastNode && groupStart !== null) {
            decorateSuggestion(
              decos,
              groupStart,
              groupEnd,
              currentAttrs,
              renderHoverMenu
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
