/**
 * MonacoEditor — Wraps @monaco-editor/react for the GalEngine IDE.
 *
 * Features:
 *   - Syntax highlighting for JSON & Markdown
 *   - Auto-loads file content from EditorStore
 *   - Reports content changes back to EditorStore
 *   - Dark theme (VS Code dark default)
 *   - Read-only mode for binary/large files
 */

import React, { useCallback, useRef, useEffect } from 'react';
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEditorStore } from './EditorStore';
import { getElectronVFS } from '@platform/electron-vfs';

// ---------------------------------------------------------------------------
// JSON validation schema for GalEngine scene files (simplified)
// ---------------------------------------------------------------------------

const SCENE_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Unique scene identifier' },
    name: { type: 'string', description: 'Display name' },
    version: { type: 'string' },
    commands: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'dialogue', 'narration', 'show_sprite', 'hide_sprite',
              'background', 'bgm', 'stop_bgm', 'sfx', 'voice',
              'show_cg', 'hide_cg', 'choice', 'jump',
              'set_flag', 'conditional', 'wait', 'transition',
              'label', 'call_scene', 'return', 'end_scene',
            ],
          },
          data: { type: 'object' },
        },
        required: ['type', 'data'],
      },
    },
  },
  required: ['id', 'commands'],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const MonacoEditor: React.FC = () => {
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const tabs = useEditorStore((s) => s.tabs);
  const fileContents = useEditorStore((s) => s.fileContents);
  const updateContent = useEditorStore((s) => s.updateContent);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Load file content from disk when a new tab becomes active
  useEffect(() => {
    if (!activeTab || fileContents[activeTab.path] !== undefined) return;

    let cancelled = false;
    const vfs = getElectronVFS();

    vfs.readTextFile(activeTab.path).then((content) => {
      if (cancelled) return;
      useEditorStore.setState((s) => ({
        fileContents: { ...s.fileContents, [activeTab.path]: content },
        tabs: s.tabs.map((t) =>
          t.id === activeTab.id ? { ...t, loading: false } : t
        ),
      }));
    }).catch(() => {
      if (cancelled) return;
      useEditorStore.setState((s) => ({
        fileContents: { ...s.fileContents, [activeTab.path]: '[Error loading file]' },
        tabs: s.tabs.map((t) =>
          t.id === activeTab.id ? { ...t, loading: false } : t
        ),
      }));
    });

    return () => { cancelled = true; };
  }, [activeTab?.id]);

  // Monaco mount hook
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Register JSON schema for scene files
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: 'galengine://schemas/scene.json',
          fileMatch: ['*.scene.json'],
          schema: SCENE_JSON_SCHEMA,
        },
      ],
      allowComments: true,
      trailingCommas: 'ignore',
    });

    // Markdown options
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      trailingCommas: 'ignore',
    });

    // Focus the editor
    editor.focus();
  }, []);

  // Before mount — set up Monaco
  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    // Register additional language features if needed
    void monaco;
  }, []);

  // Track content changes
  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined && activeTab) {
      updateContent(activeTab.path, value);
    }
  }, [activeTab, updateContent]);

  // No active tab
  if (!activeTab) {
    return (
      <div className="monaco-placeholder">
        <div className="monaco-empty-icon">📝</div>
        <p>No file open</p>
        <p className="muted">Click a file in the Explorer to open it, or use Ctrl+O.</p>
      </div>
    );
  }

  // Tab is loading
  if (activeTab.loading) {
    return (
      <div className="monaco-placeholder">
        <p>Loading {activeTab.name}...</p>
      </div>
    );
  }

  const content = fileContents[activeTab.path];

  return (
    <div className="monaco-editor-wrapper">
      <Editor
        height="100%"
        language={activeTab.language}
        value={content}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleEditorMount}
        beforeMount={handleBeforeMount}
        loading={<div className="monaco-placeholder">Loading editor...</div>}
        options={{
          minimap: { enabled: true, scale: 1, showSlider: 'mouseover' },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 8 },
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Export save helper for use by menu commands
// ---------------------------------------------------------------------------

/** Save the current active file to disk. */
export async function saveActiveFile(): Promise<void> {
  const state = useEditorStore.getState();
  const { activeTabId, fileContents, dirtyFiles } = state;
  if (!activeTabId) return;

  const content = fileContents[activeTabId];
  if (content === undefined) return;

  const vfs = getElectronVFS();
  await vfs.writeTextFile(activeTabId, content);

  const newDirty = new Set(dirtyFiles);
  newDirty.delete(activeTabId);
  useEditorStore.setState({ dirtyFiles: newDirty });
}
