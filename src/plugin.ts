import { Plugin, Transaction, EditorState } from 'prosemirror-state';
import {
  ReplaceStep,
  AddMarkStep,
  RemoveMarkStep,
  ReplaceAroundStep,
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

      // For the rare case where there are multiple transforming steps in this dispatch
      // we need to keep track of the intermediate doc inbetween each step
      // so we can get the correct slice
      let intermediateTransform = new Transform(oldState.doc);
      let lastStep: AnyStep | null = null;

      // we will reinsert deletions and mark them as suggestion_delete
      // we do this after we mark all the suggestion_adds and
      // and we necessarily do it backwards
      const reinsertSteps: { step: ReplaceStep; stepMeta: any }[] = [];

      // After transactions are applied, apply transactions needed for the suggestion marks
      transactions.forEach((transaction, index) => {
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
          // we don't actually use/need the addedSlice, we just need its size to mark it
          // in all but the ReplaceStep, the removedSlice is the same size as the addedSlice
          const addedSliceSize =
            step instanceof ReplaceStep ? step.slice.size : removedSlice.size;

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
            if (addedSliceSize > 1) {
              // a paste has happened in the middle of a suggestion mark
              // make sure it has the same mark as the surrounding text
              tr.addMark(step.from, step.from + addedSliceSize, suggestionMark);
              changed = true;
            }
            // We are already inside a suggestion mark so we don't need to do anything
            return;
          }

          if (removedSlice.size > 0) {
            // DELETE - content was removed.
            // We need to put it back and add a suggestion_delete mark on it
            // tr.replace(mappedFrom, mappedFrom, removedSlice);
            reinsertSteps.push({
              step: new ReplaceStep(step.from, step.from, removedSlice),
              stepMeta: {
                username,
                data: newData,
              },
            });
          }

          if (addedSliceSize > 0) {
            // ReplaceAroundStep has an insert property that is the number of extra characters inserted
            // for things like numbers in a list item
            // TODO - I think this is not needed anymore?
            const extraInsertChars =
              step instanceof ReplaceAroundStep ? step.insert : 0;

            const addedTo = step.from + addedSliceSize + extraInsertChars;

            if (step instanceof ReplaceStep) {
              console.log('Adding add mark:', {
                type: 'suggestion_add',
                from: step.from,
                to: addedTo,
                content: step.slice.content.textBetween(
                  0,
                  step.slice.content.size
                ),
              });
            }

            // just mark it, it was already inserted before appendTransaction
            tr.addMark(
              step.from,
              addedTo,
              newState.schema.marks.suggestion_add.create({
                username,
                data: newData,
              })
            );
            changed = true;
          }

          // // TODO - figure out backspace cursor re-postion with stacked steps later
          // if (addedSliceSize === 0) {
          //   // They hit backspace and then we added the removedSlice back in
          //   // we need to move the cursor to the start (from the end) of the text we put back in
          //   const newCursorPos = mappedFrom;
          //   const Selection = newState.selection.constructor as any;
          //   tr.setSelection(Selection.create(tr.doc, newCursorPos));
          // }
        });
      });

      // Now we go backward through the steps and reinsert the deletions
      reinsertSteps.reverse().forEach(({ step, stepMeta }) => {
        console.log(
          'inserting back in',
          step.slice.content.textBetween(0, step.slice.content.size),
          'step.from was',
          step.from,
          'current content there is',
          tr.doc.textBetween(step.from, step.from + step.slice.size)
        );
        tr.step(step);
        console.log(
          'doc after replaceSlice reinserted',
          tr.doc.textBetween(0, tr.doc.content.size)
        );
        console.log('Adding delete mark:', {
          type: 'suggestion_delete',
          from: step.from,
          to: step.from + step.slice.size,
          sliceContent: step.slice.content.textBetween(
            0,
            step.slice.content.size
          ),
          trContent: tr.doc.textBetween(step.from, step.from + step.slice.size),
        });
        tr.addMark(
          step.from,
          step.from + step.slice.size,
          newState.schema.marks.suggestion_delete.create(stepMeta)
        );
        changed = true;
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
