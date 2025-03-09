import { EditorView } from 'prosemirror-view';
import { Mark } from 'prosemirror-model';
import { suggestionModePluginKey } from '../key';
import { EditorState, Transaction } from 'prosemirror-state';

// Helper function to find mark boundaries
const findMarkBoundaries = (
  doc: EditorState['doc'],
  mark: Mark,
  pos: number
) => {
  let from = pos;
  let to = pos;

  doc.nodesBetween(0, doc.content.size, (node, nodePos) => {
    if (node.marks.some((m) => m.eq(mark))) {
      from = Math.min(from, nodePos);
      to = Math.max(to, nodePos + node.nodeSize);
    }
  });

  return { from, to };
};

// Command to accept multiple suggestions in a single transaction
export const acceptSuggestionsCommand = (marks: Mark[], pos: number) => {
  return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!dispatch) return true;

    const tr = state.tr;
    tr.setMeta(suggestionModePluginKey, { suggestionOperation: true });

    // Process all marks in a single transaction
    marks.forEach((mark) => {
      const { from, to } = findMarkBoundaries(state.doc, mark, pos);
      if (mark.type.name === 'suggestion_add') {
        // For added text, we keep the text but remove the mark
        tr.removeMark(from, to, mark.type);
      } else if (mark.type.name === 'suggestion_delete') {
        // For deleted text, we remove both the text and the mark
        tr.delete(from, to);
      }
    });

    dispatch(tr);
    return true;
  };
};

// Command to reject multiple suggestions in a single transaction
export const rejectSuggestionsCommand = (marks: Mark[], pos: number) => {
  return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!dispatch) return true;

    const tr = state.tr;
    tr.setMeta(suggestionModePluginKey, { suggestionOperation: true });

    // Process all marks in a single transaction
    marks.forEach((mark) => {
      const { from, to } = findMarkBoundaries(state.doc, mark, pos);
      if (mark.type.name === 'suggestion_add') {
        // For added text, we remove both the text and the mark
        tr.delete(from, to);
      } else if (mark.type.name === 'suggestion_delete') {
        // For deleted text, we keep the text but remove the mark
        tr.removeMark(from, to, mark.type);
      }
    });

    dispatch(tr);
    return true;
  };
};

// Single mark commands for backward compatibility
export const acceptSuggestionCommand = (mark: Mark, pos: number) => {
  return acceptSuggestionsCommand([mark], pos);
};

export const rejectSuggestionCommand = (mark: Mark, pos: number) => {
  return rejectSuggestionsCommand([mark], pos);
};

// Wrapper functions for backward compatibility
export const acceptSuggestion = (view: EditorView, mark: Mark, pos: number) => {
  acceptSuggestionCommand(mark, pos)(view.state, view.dispatch);
};

export const rejectSuggestion = (view: EditorView, mark: Mark, pos: number) => {
  rejectSuggestionCommand(mark, pos)(view.state, view.dispatch);
};

// Command to handle all suggestions
const handleAllSuggestionsCommand = (acceptOrReject: 'accept' | 'reject') => {
  return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!dispatch) return true;

    // Collect all suggestion marks
    const marks: { mark: Mark; pos: number }[] = [];
    state.doc.descendants((node, pos) => {
      const suggestionMark = node.marks.find(
        (m) =>
          m.type.name === 'suggestion_add' ||
          m.type.name === 'suggestion_delete'
      );
      if (suggestionMark) {
        marks.push({ mark: suggestionMark, pos });
      }
    });

    if (marks.length === 0) return false;

    // Handle all marks in a single transaction
    const command =
      acceptOrReject === 'accept'
        ? acceptSuggestionsCommand(
            marks.map((m) => m.mark),
            marks[0].pos
          )
        : rejectSuggestionsCommand(
            marks.map((m) => m.mark),
            marks[0].pos
          );

    return command(state, dispatch);
  };
};

// Export commands for accepting/rejecting all suggestions
export const acceptAllSuggestionsCommand =
  handleAllSuggestionsCommand('accept');
export const rejectAllSuggestionsCommand =
  handleAllSuggestionsCommand('reject');

// Wrapper functions for backward compatibility
export const acceptAllSuggestions = (view: EditorView) => {
  acceptAllSuggestionsCommand(view.state, view.dispatch);
};

export const rejectAllSuggestions = (view: EditorView) => {
  rejectAllSuggestionsCommand(view.state, view.dispatch);
};
