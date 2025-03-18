import { ResolvedPos } from 'prosemirror-model';

/**
 * Finds a position that is not the very start of a block node by traversing up
 * until it finds a block-node where it is not the starting position
 *
 * Needed for putting removed text back in before a block node was applied
 *
 * @param $pos - A resolved position in the document
 * @returns The adjusted position after traversing up through container nodes
 */
export const findNonStartingPos = ($pos: ResolvedPos): number => {
  if ($pos.parentOffset !== 0) {
    return $pos.pos;
  }

  let depth = $pos.depth;
  let position = $pos.pos;

  while (depth > 0) {
    const node = $pos.node(depth);
    // If we're in a list item or similar container, keep going up
    if (
      node.type.name === 'list_item' ||
      node.type.name === 'bullet_list' ||
      node.type.name === 'ordered_list'
    ) {
      position = $pos.before(depth);
      depth--;
    } else {
      break;
    }
  }

  return position;
};
