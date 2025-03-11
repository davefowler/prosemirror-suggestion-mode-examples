import { EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { SuggestionHoverMenuRenderer } from './menus/hoverMenu';

export function decorateSuggestion(
  decos: Decoration[],
  from: number,
  to: number,
  attrs: Record<string, any>,
  renderHoverMenu: SuggestionHoverMenuRenderer
) {
  decos.push(
    Decoration.widget(
      from,
      (view) => {
        const wrapper = document.createElement('span');
        wrapper.className = 'suggestion-menu-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.verticalAlign = 'text-top';
        wrapper.style.height = '0';
        wrapper.style.width = '0';
        wrapper.style.overflow = 'visible';

        const menu = renderHoverMenu(from, to, attrs, {
          dispatch: (command) => command(view.state, view.dispatch),
        });
        wrapper.appendChild(menu);
        return wrapper;
      },
      {
        key: `hover-${from}`,
        side: -1,
      }
    )
  );
}

export function createDecorations(
  state: EditorState,
  renderHoverMenu: SuggestionHoverMenuRenderer
): DecorationSet {
  const decos: Decoration[] = [];
  let groupStart: number | null = null;
  let groupEnd: number | null = null;
  let currentUsername: string | null = null;
  let currentAttrs: Record<string, any> | null = null;

  state.doc.descendants((node, pos, parent, index) => {
    const suggestionMark = node.marks.find(
      (m) =>
        m.type.name === 'suggestion_add' || m.type.name === 'suggestion_delete'
    );

    if (!suggestionMark && !groupStart) return;

    if (
      (suggestionMark && currentUsername !== suggestionMark.attrs.username) ||
      !suggestionMark
    ) {
      if (groupStart !== null) {
        decorateSuggestion(
          decos,
          groupStart,
          groupEnd!,
          currentAttrs!,
          renderHoverMenu
        );
      }
      groupStart = null;
      groupEnd = null;
      currentUsername = null;
      currentAttrs = null;
    }

    if (suggestionMark) {
      if (!groupStart) {
        groupStart = pos;
        currentUsername = suggestionMark.attrs.username;
        currentAttrs = suggestionMark.attrs;
      }
      groupEnd = pos + node.nodeSize;
    }

    const isLastNode = index === parent.childCount - 1;
    if (isLastNode && groupStart !== null) {
      decorateSuggestion(
        decos,
        groupStart,
        groupEnd!,
        currentAttrs!,
        renderHoverMenu
      );
    }
  });

  return DecorationSet.create(state.doc, decos);
}
