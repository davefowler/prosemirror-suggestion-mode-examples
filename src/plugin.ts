import { Plugin, Transaction, EditorState } from 'prosemirror-state';
import {
  ReplaceStep,
  AddMarkStep,
  RemoveMarkStep,
  ReplaceAroundStep,
} from 'prosemirror-transform';
import { SuggestionModePluginState, suggestionModePluginKey } from './key';
import {
  SuggestionHoverMenuRenderer,
  hoverMenuFactory,
  SuggestionHoverMenuOptions,
} from './menus/hoverMenu';
import { createDecorations } from './decorations';
import { Slice } from 'prosemirror-model';

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
          console.log(
            'removedSlice old',
            from,
            to,
            removedSlice,
            removedSlice.content.size
          );
          // in all but the ReplaceStep, the removedSlice is the same size as the addedSlice
          // so we can use it as the addedSlice, as we're just adding a mark over that range
          const addedSlice =
            step instanceof ReplaceStep ? step.slice : removedSlice;

          console.log(
            'addedSlice',
            addedSlice,
            addedSlice.content.size,
            addedSlice.content.firstChild?.text
          );
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

          console.log(
            'step',
            step,
            to,
            from,
            'removed',
            removedSlice,
            'added',
            addedSlice
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
            // DELETE - content was removed.
            // We need to put it back and add a suggestion_delete mark on it
            console.log(
              'inserting removedSlice',
              removedSlice.openStart,
              removedSlice.openEnd,
              removedSlice.content.size,
              removedSlice
            );
            // TODO - when openStart and openEnd are 1, to-from is 2 less than slice.content.size
            // this is because of the way prosemirror handles openStart and openEnd
            // When we insert back in, we need to cut the paragraph tokens off the slice
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
            // For pasting, we want to insert at the original position
            const addedFrom = from + removedSlice.content.size;

            // ReplaceAroundStep has an insert property that is the number of extra characters inserted
            // for things like numbers in a list item
            const extraInsertChars =
              step instanceof ReplaceAroundStep ? step.insert : 0;

            // In the case of pasted content with newlines, we need to subtract 2 for node tokens
            // This adjustment specifically targets pasted content in ReplaceSteps
            const paragraphAdjustment =
              step instanceof ReplaceStep &&
              addedSlice.openStart === 1 &&
              addedSlice.openEnd === 1
                ? -2
                : 0;

            const addedTo =
              addedFrom +
              addedSlice.content.size +
              extraInsertChars +
              paragraphAdjustment;

            console.log(
              'suggestion_add',
              step,
              addedFrom,
              addedTo,
              extraInsertChars,
              addedSlice.content
            );

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
        return createDecorations(state, renderHoverMenu);
      },
    },
  });
};
