// Type definitions for ProseMirror extensions
declare module "prosemirror-view" {
  interface EditorProps {
    handleTextInput?: (view: EditorView, from: number, to: number, text: string) => boolean;
  }
}

// Extend Window interface to include our global view
interface Window {
  view: any;
}
