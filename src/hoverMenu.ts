import { Mark } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { acceptSuggestion, rejectSuggestion } from "./tools/accept-reject";

// Type for suggestion hover menu renderer function
export type SuggestionHoverMenuRenderer = (
  mark: Mark,
  view: EditorView,
  pos: number
) => HTMLElement;

// Default suggestion hover menu renderer
export const defaultRenderSuggestionHoverMenu: SuggestionHoverMenuRenderer = (
  mark: Mark,
  view: EditorView,
  pos: number
): HTMLElement => {
  const menu = document.createElement("div");
  menu.className = "suggestion-hover-menu";

  const date = new Date(mark.attrs.createdAt).toLocaleDateString();
  const infoText = document.createElement("div");
  infoText.className = "suggestion-info";
  infoText.textContent =
    mark.type.name === "suggestion_delete"
      ? `Deleted by ${mark.attrs.username} on ${date}`
      : `Added by ${mark.attrs.username} on ${date}`;
  menu.appendChild(infoText);

  // Add custom data as attributes to the menu element if present
  if (mark.attrs.data) {
    try {
      const customData =
        typeof mark.attrs.data === "string"
          ? JSON.parse(mark.attrs.data)
          : mark.attrs.data;

      // Add data attributes to the menu element
      Object.entries(customData).forEach(([key, value]) => {
        menu.setAttribute(`data-${key}`, String(value));
      });
    } catch (error) {
      console.error("Error processing suggestion data:", error);
    }
  }

  // Add accept and reject buttons
  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "suggestion-buttons";

  const acceptButton = document.createElement("button");
  acceptButton.className = "suggestion-accept";
  acceptButton.textContent = "Accept";
  acceptButton.addEventListener("click", (e) => {
    e.stopPropagation();
    acceptSuggestion(view, mark, pos);
  });

  const rejectButton = document.createElement("button");
  rejectButton.className = "suggestion-reject";
  rejectButton.textContent = "Reject";
  rejectButton.addEventListener("click", (e) => {
    e.stopPropagation();
    rejectSuggestion(view, mark, pos);
  });

  buttonsDiv.appendChild(acceptButton);
  buttonsDiv.appendChild(rejectButton);
  menu.appendChild(buttonsDiv);

  return menu;
};
