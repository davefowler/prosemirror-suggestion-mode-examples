import { EditorView } from 'prosemirror-view';
import { Mark } from 'prosemirror-model';
import { suggestionModePluginKey } from '../key';
import { EditorState, Transaction } from 'prosemirror-state';
import { Command } from 'prosemirror-state';

interface MarkedRange {
  mark: Mark;
  from: number;
  to: number;
}

// Helper to find all suggestion marks and their boundaries in a range
const findSuggestionsInRange = (
  state: EditorState,
  from: number,
  to: number
): MarkedRange[] => {
  const markRanges = new Map<Mark, { from: number; to: number }>();

  state.doc.nodesBetween(from, to, (node, pos) => {
    node.marks.forEach((mark) => {
      if (
        mark.type.name === 'suggestion_add' ||
        mark.type.name === 'suggestion_delete'
      ) {
        const range = markRanges.get(mark) || { from: pos, to: pos };
        range.from = Math.min(range.from, pos);
        range.to = Math.max(range.to, pos + node.nodeSize);
        markRanges.set(mark, range);
      }
    });
  });

  return Array.from(markRanges.entries()).map(([mark, range]) => ({
    mark,
    from: range.from,
    to: range.to,
  }));
};

export const acceptSuggestionsInRange = (from: number, to: number): Command => {
  return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    const suggestions = findSuggestionsInRange(state, from, to);
    console.log('acceptSuggestionsInRange', suggestions, from, to);
    if (!suggestions.length || !dispatch) return false;

    const tr = state.tr;
    tr.setMeta(suggestionModePluginKey, { suggestionOperation: true });

    // Sort suggestions by their starting position in ascending order
    // This ensures we process them from left to right, making position adjustments easier
    const sortedSuggestions = [...suggestions].sort((a, b) => a.from - b.from);

    // Track position adjustment as we make changes to the document
    let offset = 0;

    // Process all marks in the range
    sortedSuggestions.forEach(
      ({ mark, from: originalFrom, to: originalTo }) => {
        // Adjust positions based on previous changes
        const adjustedFrom = originalFrom + offset;
        const adjustedTo = originalTo + offset;

        if (mark.type.name === 'suggestion_add') {
          // Keep the text, remove the mark
          tr.removeMark(adjustedFrom, adjustedTo, mark.type);
          // No offset change when just removing marks
        } else if (mark.type.name === 'suggestion_delete') {
          // Remove both text and mark
          tr.delete(adjustedFrom, adjustedTo);
          // Update offset: deleting text reduces subsequent positions
          offset -= adjustedTo - adjustedFrom;
        }
      }
    );

    dispatch(tr);
    return true;
  };
};

export const rejectSuggestionsInRange = (from: number, to: number): Command => {
  return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    const suggestions = findSuggestionsInRange(state, from, to);
    if (!suggestions.length || !dispatch) return false;

    const tr = state.tr;
    tr.setMeta(suggestionModePluginKey, { suggestionOperation: true });

    // Sort suggestions by their starting position in ascending order
    // This ensures we process them from left to right, making position adjustments easier
    const sortedSuggestions = [...suggestions].sort((a, b) => a.from - b.from);

    // Track position adjustment as we make changes to the document
    let offset = 0;

    // Process all marks in the range
    sortedSuggestions.forEach(
      ({ mark, from: originalFrom, to: originalTo }) => {
        // Adjust positions based on previous changes
        const adjustedFrom = originalFrom + offset;
        const adjustedTo = originalTo + offset;

        if (mark.type.name === 'suggestion_add') {
          // Remove both text and mark
          tr.delete(adjustedFrom, adjustedTo);
          // Update offset: deleting text reduces subsequent positions
          offset -= adjustedTo - adjustedFrom;
        } else if (mark.type.name === 'suggestion_delete') {
          // Keep the text, remove the mark
          tr.removeMark(adjustedFrom, adjustedTo, mark.type);
          // No offset change when just removing marks
        }
      }
    );

    dispatch(tr);
    return true;
  };
};

// For accepting/rejecting all suggestions in the document
export const acceptAllSuggestions: Command = (state, dispatch) => {
  return acceptSuggestionsInRange(0, state.doc.content.size)(state, dispatch);
};

export const rejectAllSuggestions: Command = (state, dispatch) => {
  return rejectSuggestionsInRange(0, state.doc.content.size)(state, dispatch);
};
