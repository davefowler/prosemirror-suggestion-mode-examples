// Type definitions for ProseMirror extensions
import { EditorView } from "prosemirror-view";
import { Mark, Node } from "prosemirror-model";

declare module "prosemirror-view" {
  interface EditorProps {
    handleTextInput?: (view: EditorView, from: number, to: number, text: string) => boolean;
    handleDOMEvents?: {
      [key: string]: (view: EditorView, event: Event) => boolean;
    };
  }
}

// Extend Window interface to include our global view
interface Window {
  view: any;
}

// Add InputEvent to lib.dom.d.ts
interface InputEvent extends UIEvent {
  readonly inputType: string;
  readonly data: string | null;
  readonly isComposing: boolean;
  getTargetRanges?(): Range[];
}
