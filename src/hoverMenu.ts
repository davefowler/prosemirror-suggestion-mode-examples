import { Mark } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import { acceptSuggestion, rejectSuggestion } from "./tools/accept-reject";

// Type for suggestion hover menu renderer function
export type SuggestionHoverMenuRenderer = (
  mark: Mark,
  view: EditorView,
  pos: number
) => HTMLElement;

// Menu item interface
export interface MenuComponent {
  dom: HTMLElement;
  update?: (mark: Mark, view: EditorView, pos: number) => void;
}

// Default components builders
export const defaultComponents = {
  // Creates the info section showing who made the change and when
  createInfoComponent(mark: Mark): MenuComponent {
    const infoText = document.createElement("div");
    infoText.className = "suggestion-info";

    const date = new Date(mark.attrs.createdAt).toLocaleDateString();
    infoText.textContent =
      mark.type.name === "suggestion_delete"
        ? `Deleted by ${mark.attrs.username} on ${date}`
        : `Added by ${mark.attrs.username} on ${date}`;

    return { dom: infoText };
  },

  // Creates the buttons section with accept/reject
  createButtonsComponent(
    mark: Mark,
    view: EditorView,
    pos: number
  ): MenuComponent {
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

    return { dom: buttonsDiv };
  },
};

// Options for creating the hover menu
export interface SuggestionHoverMenuOptions {
  // Component factories - can be replaced or extended
  components?: {
    createInfoComponent?: (
      mark: Mark,
      view: EditorView,
      pos: number
    ) => MenuComponent;
    createButtonsComponent?: (
      mark: Mark,
      view: EditorView,
      pos: number
    ) => MenuComponent;
    // Add more component types as needed
  };
  // Additional components to include
  additionalComponents?: ((
    mark: Mark,
    view: EditorView,
    pos: number
  ) => MenuComponent)[];
  // CSS classes
  menuClass?: string;
}

// Create a hover menu with the specified components
export function createSuggestionHoverMenu(
  mark: Mark,
  view: EditorView,
  pos: number,
  options: SuggestionHoverMenuOptions = {}
): HTMLElement {
  // Create the menu container
  const menu = document.createElement("div");
  menu.className = options.menuClass || "suggestion-hover-menu";

  // Use component factories or fall back to defaults
  const components = options.components || {};

  // Create and add the info component
  const createInfo =
    components.createInfoComponent || defaultComponents.createInfoComponent;
  const infoComponent = createInfo(mark, view, pos);
  menu.appendChild(infoComponent.dom);

  // Create and add the buttons component
  const createButtons =
    components.createButtonsComponent ||
    defaultComponents.createButtonsComponent;
  const buttonsComponent = createButtons(mark, view, pos);
  menu.appendChild(buttonsComponent.dom);

  // Add any additional components
  if (options.additionalComponents) {
    options.additionalComponents.forEach((createComponent) => {
      const component = createComponent(mark, view, pos);
      menu.appendChild(component.dom);
    });
  }

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

  return menu;
}

// Default suggestion hover menu renderer
export const defaultRenderSuggestionHoverMenu: SuggestionHoverMenuRenderer = (
  mark: Mark,
  view: EditorView,
  pos: number
): HTMLElement => {
  return createSuggestionHoverMenu(mark, view, pos);
};
