import { Mark } from 'prosemirror-model';
import { suggestionModePluginKey } from '../key';
import { EditorState, Transaction } from 'prosemirror-state';
import { Command } from 'prosemirror-state';
import { Mapping } from 'prosemirror-transform';

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

// look for all suggestions in a range and accept or reject them
const processSuggestionsInRange = (
  acceptOrReject: 'accept' | 'reject',
  from: number,
  to: number
): Command => {
  return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    const suggestions = findSuggestionsInRange(state, from, to);
    if (!suggestions.length || !dispatch) return false;

    const tr = state.tr;
    tr.setMeta(suggestionModePluginKey, { suggestionOperation: true });

    // Process all marks in the range
    suggestions.forEach(({ mark, from: originalFrom, to: originalTo }) => {
      // Adjust positions based on previous changes
      const adjustedFrom = tr.mapping.map(originalFrom);
      const adjustedTo = tr.mapping.map(originalTo);

      // one mark range we delete, the other we just remove the mark
      const markToDelete =
        acceptOrReject === 'accept' ? 'suggestion_delete' : 'suggestion_add';

      if (mark.type.name === markToDelete) {
        // Remove both text and mark
        tr.delete(adjustedFrom, adjustedTo);
      } else {
        // Keep the text, remove the mark
        tr.removeMark(adjustedFrom, adjustedTo, mark.type);
      }
    });

    dispatch(tr);
    return true;
  };
};

export const acceptSuggestionsInRange = (from: number, to: number): Command => {
  return processSuggestionsInRange('accept', from, to);
};

export const rejectSuggestionsInRange = (from: number, to: number): Command => {
  return processSuggestionsInRange('reject', from, to);
};

// For accepting/rejecting all suggestions in the document
export const acceptAllSuggestions: Command = (state, dispatch) => {
  return acceptSuggestionsInRange(0, state.doc.content.size)(state, dispatch);
};

export const rejectAllSuggestions: Command = (state, dispatch) => {
  return rejectSuggestionsInRange(0, state.doc.content.size)(state, dispatch);
};
