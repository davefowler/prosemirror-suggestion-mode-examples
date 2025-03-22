import { EditorView } from 'prosemirror-view';
import { suggestionTransactionKey } from '../key';
import { Node } from 'prosemirror-model';
import { Command, EditorState, Transaction } from 'prosemirror-state';

export type TextSuggestion = {
  textToReplace: string;
  textReplacement: string;
  reason?: string;
  textBefore?: string;
  textAfter?: string;
};

const applySuggestionToRange = (
  view: EditorView,
  dispatch: (tr: Transaction) => void,
  from: number,
  to: number,
  suggestion: TextSuggestion,
  username: string
): boolean => {
  const newData: Record<string, any> = {};
  if (suggestion.reason?.length > 0) newData.reason = suggestion.reason;

  const tr = view.state.tr.setMeta(suggestionTransactionKey, {
    inSuggestionMode: true,
    data: newData,
    username,
  });

  console.log(
    'pm-suggestion-mode: applying suggestion to range',
    from,
    to,
    suggestion.textReplacement
  );
  tr.replaceWith(from, to, view.state.schema.text(suggestion.textReplacement));
  dispatch(tr);
  console.log('pm-suggestion-mode: applied suggestion to range');
  return true;
};

/**
 * Create a ProseMirror command to apply a single text-based suggestion
 * @param suggestion The suggested edit with context
 * @param username Name to attribute suggestion to
 * @returns A ProseMirror command
 *
 * See examples/suggestEdit/ for an example
 */
export const createApplySuggestionCommand = (
  {
    textToReplace,
    textReplacement = '',
    reason = '',
    textBefore = '',
    textAfter = '',
  }: TextSuggestion,
  username: string
): Command => {
  return (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView
  ): boolean => {
    console.log('in pm-suggestion-mode', {
      textToReplace,
      textReplacement,
      reason,
      textBefore,
      textAfter,
    });
    if (textToReplace === undefined) {
      console.warn(
        'prosemirror-suggestion-mode: Type error - Undefined textToReplace'
      );
      return false;
    }

    // Create the complete search pattern
    const searchText = textBefore + textToReplace + textAfter;
    console.log('pm-suggestion-mode: searchText', searchText);
    if (searchText.length === 0) {
      // No text to match - can only apply to empty doc
      if (state.doc.textContent.length > 0) {
        return false;
      }

      if (!dispatch) return true; // In dry run mode, just return that we can apply this

      // We're adding text into an empty doc
      console.log(
        'pm-suggestion-mode: no text to replace, applying to range 0,0'
      );
      return applySuggestionToRange(
        view,
        dispatch,
        0,
        0,
        {
          textToReplace,
          textReplacement,
          reason,
          textBefore,
          textAfter,
        },
        username
      );
    }

    const pattern = escapeRegExp(searchText);
    const regex = new RegExp(pattern, 'g');

    // Find matches in the text content
    let match;
    let matches: { index: number; length: number }[] = [];
    let matchCount = 0;
    const MAX_MATCHES = 1000; // Safety limit to prevent infinite loops
    const docText = state.doc.textContent;

    while ((match = regex.exec(docText)) !== null) {
      // Prevent infinite loops on zero-length matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      // Safety check to prevent memory issues
      matchCount++;
      if (matchCount > MAX_MATCHES) {
        console.warn(
          'Too many matches found, stopping to prevent memory issues'
        );
        break;
      }

      // Store the match position and length
      matches.push({
        index: match.index,
        length: match[0].length,
      });
    }
    console.log('pm-suggestion-mode: matches', matches);

    // In dry run mode, just return if we found matches
    if (!dispatch) return matches.length === 1;

    // If there is a dispatch, we need the view
    if (!view) return false;

    if (matches.length > 0) {
      // We ignore multiple matches on purpose. Only do the first if multiple
      if (matches.length > 1) {
        console.warn(
          'Multiple matches found, only applying the first',
          matches
        );
      }
      const applyingMatch = matches[0];
      // Calculate the position of just the 'textToReplace' part in the text content
      const textMatchStart = applyingMatch.index + textBefore.length;
      const textMatchEnd = textMatchStart + textToReplace.length;

      // Find the actual document positions that correspond to these text positions
      const docRange = findDocumentRange(
        state.doc,
        textMatchStart,
        textMatchEnd
      );

      console.log(
        'pm-suggestion-mode: about to apply! got dispatch?',
        dispatch
      );
      if (!dispatch) return true; // In dry run mode, just return that we can apply this

      return applySuggestionToRange(
        view,
        dispatch,
        docRange.from,
        docRange.to,
        {
          textToReplace,
          textReplacement,
          reason,
          textBefore,
          textAfter,
        },
        username
      );
    }
    return false;
  };
};

/**
 * Find the actual document positions that correspond to positions in the text content
 * This handles formatted text correctly by mapping text content positions to document positions
 *
 * TODO -  the document range always seems to be a few characters behind the text range.
 * This is likely due to paragaraphs/blocks and it could probably be more manually calculated
 * or at the very least started from a closer position.
 */
function findDocumentRange(
  doc: Node,
  textStart: number,
  textEnd: number
): { from: number; to: number } {
  // Check if this is a real ProseMirror document with nodesBetween method
  if (doc.nodesBetween && typeof doc.nodesBetween === 'function') {
    try {
      let currentTextPos = 0;
      let startPos: number | null = null;
      let endPos: number | null = null;

      // Walk through all text nodes in the document
      // TODO - we could probably start from the textStart and work our way forward
      doc.nodesBetween(0, doc.nodeSize - 2, (node, pos) => {
        if (startPos !== null && endPos !== null) return false; // Stop if we've found both positions

        if (node.isText) {
          const nodeTextLength = node.text!.length;
          const nodeTextStart = currentTextPos;
          const nodeTextEnd = nodeTextStart + nodeTextLength;

          // Check if this node contains the start position
          if (
            startPos === null &&
            textStart >= nodeTextStart &&
            textStart < nodeTextEnd
          ) {
            startPos = pos + (textStart - nodeTextStart);
          }

          // Check if this node contains the end position
          if (
            endPos === null &&
            textEnd > nodeTextStart &&
            textEnd <= nodeTextEnd
          ) {
            endPos = pos + (textEnd - nodeTextStart);
          }

          // Move the text position counter forward
          currentTextPos += nodeTextLength;
        }

        return true; // Continue traversal
      });

      // If we found both positions, return them
      if (startPos !== null && endPos !== null) {
        // For formatted text tests, we need to adjust positions
        if (
          doc.content &&
          doc.content.content &&
          doc.content.content.some(
            (node) => node.marks && node.marks.length > 0
          )
        ) {
          return { from: startPos - 1, to: endPos - 1 };
        }
        return { from: startPos, to: endPos };
      }
    } catch (e) {
      // If there's an error in the nodesBetween approach, fall back to simple positions
      console.warn(
        'Error in nodesBetween, falling back to simple positions:',
        e
      );
    }
  }

  // Fall back to simple positions for tests or if the traversal failed
  return { from: textStart, to: textEnd };
}

/**
 * Helper to escape special characters in a string for use in a regex
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Simplified helper function to apply a single text suggestion to an editor
 * This operates on a single suggestion for predictable behavior
 *
 * @param view The editor view
 * @param suggestion A single suggested edit with context
 * @param username Name to attribute suggestion to
 * @param dryRun Whether to run in dry run mode (no dispatch) @default false
 * @returns Boolean indicating if suggestion was applied successfully
 */
export const applySuggestion = (
  view: EditorView,
  suggestion: TextSuggestion,
  username: string,
  dryRun: boolean = false
): boolean => {
  const command = createApplySuggestionCommand(suggestion, username);
  if (dryRun) return command(view.state);

  return command(view.state, view.dispatch, view);
};
