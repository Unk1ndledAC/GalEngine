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

import React, { useCallback, useRef, useEffect, useState } from 'react';
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEditorStore } from './EditorStore';
import { useSettingsStore } from '@workbench/settings/SettingsStore';
import { getElectronVFS } from '@platform/electron-vfs';
import { useTranslation } from '@i18n/useTranslation';

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
  const setFileContent = useEditorStore((s) => s.setFileContent);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save settings
  const autoSaveEnabled = useSettingsStore((s) => s.autoSave.enabled);
  const autoSaveDelay = useSettingsStore((s) => s.autoSave.delay);

  const { t } = useTranslation();

  // Local loading state — avoids Zustand staleness bugs
  const [loadingPath, setLoadingPath] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Load file content from disk when a new tab becomes active
  useEffect(() => {
    if (!activeTab) {
      setLoadingPath(null);
      return;
    }

    const path = activeTab.path;
    if (fileContents[path] !== undefined) {
      setLoadingPath(null);
      return;
    }

    let cancelled = false;
    let resolved = false;
    setLoadingPath(path);
    const vfs = getElectronVFS();

    /** Idempotent: clear loading state exactly once. */
    const clearLoading = () => {
      if (resolved) return;
      resolved = true;
      setLoadingPath(null);
    };

    // 3s timeout — file reads should be near-instant
    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      console.error(`[MonacoEditor] Timeout reading: ${path}`);
      try {
        useEditorStore.getState().setFileContent(path, `[${t('editor.loadTimeout')}]`);
      } catch {
        // Never let translation errors block loading clearance
      }
      clearLoading();
    }, 3_000);

    vfs.readTextFile(path)
      .then((content: string) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        useEditorStore.getState().setFileContent(path, content);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        console.error(`[MonacoEditor] Failed to read: ${path}`, err);
        try {
          useEditorStore.getState().setFileContent(path, `[${t('editor.loadError')}]`);
        } catch {
          useEditorStore.getState().setFileContent(path, '[Error loading file]');
        }
      })
      .finally(() => {
        // Guaranteed: loading state is cleared regardless of
        // whether setFileContent or t() threw an exception.
        clearLoading();
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [activeTab?.id]);

  // Monaco mount hook
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Ctrl+F → Monaco built-in find widget
    editor.addAction({
      id: 'galengine-find',
      label: 'Find',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: (ed) => {
        ed.getAction('actions.find')?.run();
      },
    });

    // Ctrl+H → Monaco built-in replace widget
    editor.addAction({
      id: 'galengine-replace',
      label: 'Replace',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
      run: (ed) => {
        ed.getAction('editor.action.startFindReplaceAction')?.run();
      },
    });

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

  // Auto-save: debounced save after content changes
  const dirtyFiles = useEditorStore((s) => s.dirtyFiles);
  useEffect(() => {
    if (!autoSaveEnabled || !activeTab) return;
    const isDirty = dirtyFiles.has(activeTab.path);
    if (!isDirty) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveActiveFile();
    }, autoSaveDelay);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [dirtyFiles, activeTab?.path, autoSaveEnabled, autoSaveDelay]);

  // No active tab
  if (!activeTab) {
    return (
      <div className="monaco-placeholder">
        <div className="monaco-empty-icon">📝</div>
        <p>{t('editor.noFileOpen')}</p>
        <p className="muted">{t('editor.clickToOpen')}</p>
      </div>
    );
  }

  // File is loading (local state, not store — avoids staleness)
  if (loadingPath === activeTab.path) {
    return (
      <div className="monaco-placeholder">
        <p>{t('editor.loading')} {activeTab.name}...</p>
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
  const { activeTabId, fileContents } = state;
  if (!activeTabId) return;

  const content = fileContents[activeTabId];
  if (content === undefined) return;

  const vfs = getElectronVFS();
  await vfs.writeTextFile(activeTabId, content);

  state.markClean(activeTabId);
}
