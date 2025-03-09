import { Mark } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import {
  acceptSuggestionsCommand,
  rejectSuggestionsCommand,
} from './tools/accept-reject';

// Type for suggestion hover menu renderer function
export type SuggestionHoverMenuRenderer = (
  marks: Mark[],
  view: EditorView,
  pos: number
) => HTMLElement;

// Menu item interface
export interface MenuComponent {
  dom: HTMLElement;
  update?: (marks: Mark[], view: EditorView, pos: number) => void;
}

// Default components builders
export const defaultComponents = {
  // Creates the info section showing who made the change and when
  createInfoComponent(
    marks: Mark[],
    view: EditorView,
    pos: number
  ): MenuComponent {
    const infoText = document.createElement('div');
    infoText.className = 'suggestion-info';

    // Group by username to show a consolidated message
    const usernames = new Set(marks.map((mark) => mark.attrs.username));
    const type = marks[0].type.name; // All marks in a group are the same type

    infoText.textContent =
      type === 'suggestion_delete'
        ? `Deleted by ${Array.from(usernames).join(', ')}`
        : `Added by ${Array.from(usernames).join(', ')}`;

    return { dom: infoText };
  },

  // Creates the buttons section with accept/reject
  createButtonsComponent(
    marks: Mark[],
    view: EditorView,
    pos: number
  ): MenuComponent {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'suggestion-buttons';

    const acceptButton = document.createElement('button');
    acceptButton.className = 'suggestion-accept';
    acceptButton.textContent = 'Accept';
    acceptButton.addEventListener('click', (e) => {
      e.stopPropagation();
      // Apply accept command for all marks in a single transaction
      acceptSuggestionsCommand(marks, pos)(view.state, view.dispatch);
    });

    const rejectButton = document.createElement('button');
    rejectButton.className = 'suggestion-reject';
    rejectButton.textContent = 'Reject';
    rejectButton.addEventListener('click', (e) => {
      e.stopPropagation();
      // Apply reject command for all marks in a single transaction
      rejectSuggestionsCommand(marks, pos)(view.state, view.dispatch);
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
      marks: Mark[],
      view: EditorView,
      pos: number
    ) => MenuComponent;
    createButtonsComponent?: (
      marks: Mark[],
      view: EditorView,
      pos: number
    ) => MenuComponent;
    // Add more component types as needed
  };
  // CSS classes
  menuClass?: string;
}

// Create a hover menu with the specified components
export function createSuggestionHoverMenu(
  marks: Mark[],
  view: EditorView,
  pos: number,
  options: SuggestionHoverMenuOptions = {}
): HTMLElement {
  // Create the menu container
  const menu = document.createElement('div');
  menu.className = options.menuClass || 'suggestion-hover-menu';

  // Use component factories or fall back to defaults
  const components = options.components || {};

  // Create and add the info component
  const createInfo =
    components.createInfoComponent || defaultComponents.createInfoComponent;
  const infoComponent = createInfo(marks, view, pos);
  menu.appendChild(infoComponent.dom);

  // Create and add the buttons component
  const createButtons =
    components.createButtonsComponent ||
    defaultComponents.createButtonsComponent;
  const buttonsComponent = createButtons(marks, view, pos);
  menu.appendChild(buttonsComponent.dom);

  // Add any custom data attributes from all marks
  const customData = marks.flatMap((mark) => mark.attrs.data || {});
  customData.forEach((data) => {
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        menu.setAttribute(`data-${key}`, String(value));
      });
    }
  });

  return menu;
}
