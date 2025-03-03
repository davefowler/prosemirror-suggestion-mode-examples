import { EditorView } from "prosemirror-view";
import { Mark } from "prosemirror-model";
import { suggestionModePluginKey } from "../key";

// Updated function to accept a suggestion without requiring type parameter
export const acceptSuggestion = (view: EditorView, mark: Mark, pos: number) => {
  const tr = view.state.tr;

  // Mark this transaction as a suggestion operation so it won't be intercepted
  tr.setMeta(suggestionModePluginKey, { suggestionOperation: true });

  if (mark.type.name === "suggestion_add") {
    // For added text, we keep the text but remove the mark
    // Find the full range of this mark
    let from = pos;
    let to = pos;

    // Find the boundaries of the mark
    view.state.doc.nodesBetween(
      0,
      view.state.doc.content.size,
      (node, nodePos) => {
        if (node.marks.some((m) => m.eq(mark))) {
          from = Math.min(from, nodePos);
          to = Math.max(to, nodePos + node.nodeSize);
        }
      }
    );

    // Remove just the mark, keeping the text
    tr.removeMark(from, to, mark.type);
  } else if (mark.type.name === "suggestion_delete") {
    // For deleted text, we remove both the text and the mark
    let from = pos;
    let to = pos;

    // Find the boundaries of the mark
    view.state.doc.nodesBetween(
      0,
      view.state.doc.content.size,
      (node, nodePos) => {
        if (node.marks.some((m) => m.eq(mark))) {
          from = Math.min(from, nodePos);
          to = Math.max(to, nodePos + node.nodeSize);
        }
      }
    );

    // Delete the text that has the deletion mark
    tr.delete(from, to);
  }

  view.dispatch(tr);
};

// Reject an individual suggestion by its mark and position
export const rejectSuggestion = (view: EditorView, mark: Mark, pos: number) => {
  const tr = view.state.tr;

  // Mark this transaction as a suggestion operation so it won't be intercepted
  tr.setMeta(suggestionModePluginKey, { suggestionOperation: true });

  if (mark.type.name === "suggestion_add") {
    // For added text, we remove both the text and the mark
    let from = pos;
    let to = pos;

    // Find the boundaries of the mark
    view.state.doc.nodesBetween(
      0,
      view.state.doc.content.size,
      (node, nodePos) => {
        if (node.marks.some((m) => m.eq(mark))) {
          from = Math.min(from, nodePos);
          to = Math.max(to, nodePos + node.nodeSize);
        }
      }
    );

    // Delete the text that has the insertion mark
    tr.delete(from, to);
  } else if (mark.type.name === "suggestion_delete") {
    // For deleted text, we keep the text but remove the mark
    let from = pos;
    let to = pos;

    // Find the boundaries of the mark
    view.state.doc.nodesBetween(
      0,
      view.state.doc.content.size,
      (node, nodePos) => {
        if (node.marks.some((m) => m.eq(mark))) {
          from = Math.min(from, nodePos);
          to = Math.max(to, nodePos + node.nodeSize);
        }
      }
    );

    // Remove just the mark, keeping the text
    tr.removeMark(from, to, mark.type);
  }

  view.dispatch(tr);
};

const handleAllSuggestions = (
  view: EditorView,
  acceptOrReject: "accept" | "reject"
) => {
  view.state.doc.descendants((node, pos) => {
    const suggestionMark = node.marks.find(
      (m) =>
        m.type.name === "suggestion_add" || m.type.name === "suggestion_delete"
    );
    if (!suggestionMark) return;

    if (acceptOrReject === "accept") {
      acceptSuggestion(view, suggestionMark, pos);
    } else {
      rejectSuggestion(view, suggestionMark, pos);
    }
  });
};

// Accept all suggestions in an editor
export const acceptAllSuggestions = (view: EditorView) => {
  handleAllSuggestions(view, "accept");
};

// Reject all suggestions in an editor
export const rejectAllSuggestions = (view: EditorView) => {
  handleAllSuggestions(view, "reject");
};
