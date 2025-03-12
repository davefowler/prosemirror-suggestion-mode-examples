import { Plugin, Transaction, EditorState } from 'prosemirror-state';
import {
  ReplaceStep,
  AddMarkStep,
  RemoveMarkStep,
  ReplaceAroundStep,
  Mapping,
  StepMap,
  Transform,
} from 'prosemirror-transform';
import { SuggestionModePluginState, suggestionModePluginKey } from './key';
import {
  SuggestionHoverMenuRenderer,
  hoverMenuFactory,
  SuggestionHoverMenuOptions,
} from './menus/hoverMenu';
import { createDecorations } from './decorations';
import { initSuggestionHoverListeners } from './menus/hoverHandlers';

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

  // Store listeners for cleanup
  let currentListeners: WeakMap<HTMLElement, any> | null = null;

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

      let tr = newState.tr;
      let changed = false;

      const mapping = new Mapping();

      // For the rare case where there are multiple transforming steps in this dispatch
      // we need to keep track of the intermediate doc inbetween each step
      // so we can get the correct slice
      let intermediateTransform = new Transform(oldState.doc);
      let lastStep: AnyStep | null = null;

      // After transactions are applied, apply transactions needed for the suggestion marks
      transactions.forEach((transaction) => {
        // username and data are gotten from the transaction overwritting any pluginState defaults
        const meta = transaction.getMeta(suggestionModePluginKey);

        const inSuggestionMode =
          pluginState.inSuggestionMode || meta?.inSuggestionMode;
        // If we're not in suggestion mode do nothing
        if (!inSuggestionMode) return;
        // if this is a transaction that we created in this plugin, ignore it
        if (meta && meta.suggestionOperation) return;

        const newData = {
          ...pluginState.data,
          ...(meta?.data || {}),
        };
        const username = meta?.username || pluginState.username;

        // Process each step in the transaction
        // This works for all 4 types of steps: ReplaceStep, AddMarkStep, RemoveMarkStep, ReplaceAroundStep
        transaction.steps.forEach((step: AnyStep) => {
          // update intermediateState if there was a previous step
          if (lastStep) {
            console.log(
              'transforming old doc from',
              intermediateTransform.doc.textBetween(
                0,
                intermediateTransform.doc.content.size
              )
            );
            intermediateTransform.step(lastStep);
            console.log(
              'transformedto',
              intermediateTransform.doc.textBetween(
                0,
                intermediateTransform.doc.content.size
              )
            );
          }
          console.log('updating lastStep', lastStep);
          lastStep = step;

          // Each transaction has two optional parts:
          //   1. removedSlice - content that should be marked as suggestion_delete
          //   2. addedSlice - content that should be marked as suggestion_add
          const removedSlice = intermediateTransform.doc.slice(
            step.from,
            step.to,
            false
          );
          console.log(
            'removedSlice',
            removedSlice.content.textBetween(0, removedSlice.content.size)
          );
          // in all but the ReplaceStep, the removedSlice is the same size as the addedSlice
          // since we don't actually re-insert the addedSlice (we just need its size)
          // we can use removedSlice as a stand in
          const addedSlice =
            step instanceof ReplaceStep ? step.slice : removedSlice;

          // if there are multiple transforming steps in this dispatch we need
          // to adjust for our inserts with a mapping
          const mappedFrom = mapping.map(step.from);
          // const mappedTo = mapping.map(step.to); // mapped to is unused

          // Mark our next transactions as  internal suggestion operation so it won't be intercepted again
          tr.setMeta(suggestionModePluginKey, {
            suggestionOperation: true,
          });

          // Check if we're inside an existing suggestion mark
          const $pos = oldState.doc.resolve(step.from);
          const marksAtPos = $pos.marks();
          const suggestionMark = marksAtPos.find(
            (m) =>
              m.type.name === 'suggestion_add' ||
              m.type.name === 'suggestion_delete'
          );

          if (suggestionMark) {
            if (addedSlice.size > 1) {
              // a paste has happened in the middle of a suggestion mark
              // insert the new text and add the wrapping mark to it
              tr.addMark(
                mappedFrom,
                mappedFrom + addedSlice.size,
                suggestionMark
              );
              changed = true;
            }
            // We are already inside a suggestion mark so we don't need to do anything
            return;
          }

          if (removedSlice.size > 0) {
            // DELETE - content was removed.
            // We need to put it back and add a suggestion_delete mark on it
            tr.replace(mappedFrom, mappedFrom, removedSlice);
            console.log(
              'inserting back in',
              removedSlice.content.textBetween(0, removedSlice.content.size),
              'at',
              mappedFrom
            );
            const stepMap = new StepMap([
              mappedFrom, // start
              0, // oldsize
              removedSlice.size, // newsize
            ]);
            mapping.appendMap(stepMap);
            console.log('Adding delete mark:', {
              type: 'suggestion_delete',
              from: mappedFrom,
              to: mappedFrom + removedSlice.size,
              content: removedSlice.content.textBetween(
                0,
                removedSlice.content.size
              ),
            });
            tr.addMark(
              mappedFrom,
              mappedFrom + removedSlice.size,
              newState.schema.marks.suggestion_delete.create({
                username,
                data: newData,
              })
            );
            changed = true;
          }

          if (addedSlice.size > 0) {
            // For pasting, we want to insert at the original position
            const addedFrom = mappedFrom + removedSlice.size;

            // ReplaceAroundStep has an insert property that is the number of extra characters inserted
            // for things like numbers in a list item
            const extraInsertChars =
              step instanceof ReplaceAroundStep ? step.insert : 0;

            // In the case of pasted content with newlines, we need to subtract 2 for node tokens
            // This adjustment specifically targets pasted content in ReplaceSteps
            // TODO - we may want to just mapke this adjustment = -addedSlice.openStart - addedSlice.openEnd
            // const paragraphAdjustment =
            //   step instanceof ReplaceStep &&
            //   addedSlice.openStart === 1 &&
            //   addedSlice.openEnd === 1
            //     ? -2
            //     : 0;

            const addedTo = addedFrom + addedSlice.size + extraInsertChars;

            console.log('Adding add mark:', {
              type: 'suggestion_add',
              from: addedFrom,
              to: addedTo,
              content: addedSlice.content.textBetween(
                0,
                addedSlice.content.size
              ),
            });

            // just mark it, it was already inserted before appendTransaction
            tr.addMark(
              addedFrom,
              addedTo,
              newState.schema.marks.suggestion_add.create({
                username,
                data: newData,
              })
            );
            changed = true;
          }

          if (addedSlice.size === 0) {
            // They hit backspace and then we added the removedSlice back in
            // we need to move the cursor to the start (from the end) of the text we put back in
            const newCursorPos = mappedFrom;
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
        if (options.hoverMenuOptions?.disabled) return null;
        return createDecorations(state, renderHoverMenu);
      },
    },

    view(view) {
      if (options.hoverMenuOptions?.disabled) return null;
      // Initialize listeners when the view is created
      setTimeout(() => {
        currentListeners = initSuggestionHoverListeners(view);
      }, 0);

      return {
        update(view, prevState) {
          // Re-initialize listeners when the decorations might have changed
          if (view.state.doc !== prevState.doc) {
            setTimeout(() => {
              currentListeners = initSuggestionHoverListeners(view);
            }, 0);
          }
        },
        destroy() {
          // Cleanup would happen automatically with WeakMap
          currentListeners = null;
        },
      };
    },
  });
};
