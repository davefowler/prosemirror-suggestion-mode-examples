// Type definitions for ProseMirror extensions
import { EditorView } from "prosemirror-view";
import { Mark, Node, MarkSpec } from "prosemirror-model";

declare module "prosemirror-view" {
  interface EditorProps {
    handleTextInput?: (
      view: EditorView,
      from: number,
      to: number,
      text: string
    ) => boolean;
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

// Extend Selection constructor
declare module "prosemirror-state" {
  interface Selection {
    constructor: {
      create(doc: Node, pos: number): Selection;
    };
  }
}

// Extend MarkSpec to allow any return type from toDOM
declare module "prosemirror-model" {
  interface MarkSpec {
    toDOM?: (node?: any) => any;
  }
}

// Module declarations for webpack alias
declare module "prosemirror-suggest-mode" {
  export * from "./index";
}

declare module "prosemirror-suggest-mode/suggestions" {
  export * from "./suggestions";
}

declare module "prosemirror-suggest-mode/schema" {
  export * from "./schema";
}

declare module "prosemirror-suggest-mode/styles/default.css" {
  const content: any;
  export default content;
}

declare module "prosemirror-suggest-mode/styles/inkAndSwitch.css" {
  const content: any;
  export default content;
}
