import { EditorView } from 'prosemirror-view';

/**
 * Initialize hover listeners for all suggestions and menus in the editor
 * This should be called whenever decorations are updated
 */
export function initSuggestionHoverListeners(view: EditorView) {
  // Find all suggestion elements in the document
  const suggestionElements = view.dom.querySelectorAll(
    '.suggestion-add, .suggestion-delete'
  );
  const menuWrappers = view.dom.querySelectorAll('.suggestion-menu-wrapper');

  // Store references to functions so they can be removed later
  const listeners = new WeakMap();

  // Add listeners to suggestion elements
  suggestionElements.forEach((element) => {
    const el = element as HTMLElement;

    // Find the preceding menu wrapper
    const menuWrapper = findPrecedingMenuWrapper(el);
    if (!menuWrapper) return;

    const menu = menuWrapper.querySelector(
      '.suggestion-hover-menu'
    ) as HTMLElement;
    if (!menu) return;

    // Create functions with closure over the specific menu
    const mouseEnter = () => {
      menu.style.display = 'block';
    };

    const mouseLeave = (event: MouseEvent) => {
      // Only hide if not moving to the menu
      if (!menuWrapper.contains(event.relatedTarget as Node)) {
        menu.style.display = 'none';
      }
    };

    // Store for cleanup
    listeners.set(el, { mouseEnter, mouseLeave });

    // Attach listeners
    el.addEventListener('mouseenter', mouseEnter);
    el.addEventListener('mouseleave', mouseLeave);
  });

  // Add listeners to menu wrappers
  menuWrappers.forEach((wrapper) => {
    const el = wrapper as HTMLElement;
    const menu = el.querySelector('.suggestion-hover-menu') as HTMLElement;
    if (!menu) return;

    const mouseEnter = () => {
      menu.style.display = 'block';
    };

    const mouseLeave = () => {
      menu.style.display = 'none';
    };

    // Store for cleanup
    listeners.set(el, { mouseEnter, mouseLeave });

    // Attach listeners
    el.addEventListener('mouseenter', mouseEnter);
    el.addEventListener('mouseleave', mouseLeave);
  });

  return listeners; // Return for cleanup purposes
}

/**
 * Find the menu wrapper that belongs to a suggestion element
 */
function findPrecedingMenuWrapper(element: HTMLElement): HTMLElement | null {
  // Look for immediate previous sibling first
  let sibling = element.previousElementSibling as HTMLElement | null;
  if (sibling && sibling.classList.contains('suggestion-menu-wrapper')) {
    return sibling;
  }

  // If we're within a larger element (like a <strong>), we need to check
  // if there's a menu wrapper right before our parent's child elements
  const parent = element.parentElement;
  if (parent) {
    // Find the position of our element among its siblings
    const allChildren = Array.from(parent.childNodes);
    const index = allChildren.indexOf(element);

    // Check if there's a menu wrapper right before our element
    if (index > 0) {
      const previousNode = allChildren[index - 1];
      if (
        previousNode.nodeType === Node.ELEMENT_NODE &&
        (previousNode as HTMLElement).classList.contains(
          'suggestion-menu-wrapper'
        )
      ) {
        return previousNode as HTMLElement;
      }
    }
  }

  // If still not found and we're in a special case (like inside a formatted element)
  // we need to look for menu wrappers that belong specifically to our suggestion context
  // This is important for nested elements like <strong> with suggestions inside
  let currentNode = element;
  while (currentNode.previousElementSibling) {
    currentNode = currentNode.previousElementSibling as HTMLElement;
    if (currentNode.classList.contains('suggestion-menu-wrapper')) {
      return currentNode;
    }
  }

  return null;
}

/**
 * Find suggestion element in event path
 */
function findSuggestionInPath(event: MouseEvent): HTMLElement | null {
  // Use composedPath to get all elements in the event path
  const path = event.composedPath();

  for (let i = 0; i < path.length; i++) {
    const el = path[i] as HTMLElement;
    if (
      el.classList &&
      (el.classList.contains('suggestion-add') ||
        el.classList.contains('suggestion-delete'))
    ) {
      return el;
    }
  }

  return null;
}

/**
 * Generic function to handle hover events on suggestions
 * Works for both mouseenter and mouseleave
 */
function handleSuggestionHover(
  view: EditorView,
  event: MouseEvent,
  isEnter: boolean
): boolean {
  // First check if a suggestion element is in the event path
  const suggestionElement = findSuggestionInPath(event);
  if (suggestionElement) {
    const menuWrapper = findPrecedingMenuWrapper(suggestionElement);

    if (menuWrapper) {
      const menu = menuWrapper.querySelector(
        '.suggestion-hover-menu'
      ) as HTMLElement;
      if (menu) {
        if (isEnter) {
          menu.style.display = 'block';
        } else {
          menu.style.display = 'none';
        }
        return true;
      }
    } else {
      console.warn('No menu wrapper found for suggestion', suggestionElement);
    }
  }

  return false; // Let other handlers run
}

// Export the unified hover handlers for use in the plugin
export const suggestionHoverHandlers = {
  mouseenter: (view: EditorView, event: MouseEvent) =>
    handleSuggestionHover(view, event, true),
  mouseleave: (view: EditorView, event: MouseEvent) =>
    handleSuggestionHover(view, event, false),
};
