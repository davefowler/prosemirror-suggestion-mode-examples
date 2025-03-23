// Helper function to check if a mark exists at an exact position
export function hasMarkAtPosition(doc, position, markName) {
  const node = doc.nodeAt(position);
  if (!node) return false;
  return node.marks.some((mark) => mark.type.name === markName);
}

// Return a string with all the letters of a document,
// but characters with a delete mark are replaced with a '-' and characters with an add mark are replaced with a '+'
export function getMarkString(doc) {
  let result = '';

  // Use nodesBetween to properly traverse the document
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.isText) {
      // Process each character in the text node
      for (let i = 0; i < node.text.length; i++) {
        const absPos = pos + i;
        const marks = node.marks;

        if (marks.some((mark) => mark.type.name === 'suggestion_delete')) {
          result += '-';
        } else if (
          marks.some((mark) => mark.type.name === 'suggestion_insert')
        ) {
          result += '+';
        } else {
          result += node.text[i];
        }
      }
    }
    // Return true to continue traversal
    return true;
  });

  return result;
}
