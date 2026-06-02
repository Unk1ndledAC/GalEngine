/**
 * EditorCommands — thin shared ref for menu bar access to the Monaco editor instance.
 *
 * MonacoEditor registers itself on mount; MenuBar reads it to dispatch
 * built-in Monaco commands (undo/redo/cut/copy/paste/selectAll/find/replace).
 */

import type { editor } from 'monaco-editor';

let _editor: editor.IStandaloneCodeEditor | null = null;

export function setActiveEditor(ed: editor.IStandaloneCodeEditor | null): void {
  _editor = ed;
}

export function getActiveEditor(): editor.IStandaloneCodeEditor | null {
  return _editor;
}

/** Dispatch a built-in Monaco editor action by ID, silently ignoring if no editor. */
export function dispatchEditorCommand(actionId: string): void {
  const ed = _editor;
  if (!ed) return;
  ed.getAction(actionId)?.run();
}
