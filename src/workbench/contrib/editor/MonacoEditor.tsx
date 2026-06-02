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
import Editor, { type OnMount, type BeforeMount, loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import { useEditorStore } from './EditorStore';
import { useSettingsStore } from '@workbench/settings/SettingsStore';
import { getElectronVFS } from '@platform/electron-vfs';
import { useTranslation } from '@i18n/useTranslation';
import { setActiveEditor } from './EditorCommands';

// Configure Monaco loader to use the locally installed package instead of CDN.
// Without this, Electron apps without internet access will hang on "Loading editor..." forever.
loader.config({ monaco });

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
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tRef = useRef(useTranslation().t);
  // Keep tRef current — t() is called inside async callbacks where closure matters
  const { t } = useTranslation();
  tRef.current = t;

  // Local loading state — avoids Zustand staleness bugs
  const [loadingPath, setLoadingPath] = useState<string | null>(null);

  // Auto-save settings
  const autoSaveEnabled = useSettingsStore((s) => s.autoSave.enabled);
  const autoSaveDelay = useSettingsStore((s) => s.autoSave.delay);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Load file content from disk when a new tab becomes active.
  // Uses tRef.current to avoid stale-closure issues in async callbacks.
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
    setLoadingPath(path);
    const vfs = getElectronVFS();

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      console.error(`[MonacoEditor] Timeout reading: ${path}`);
      useEditorStore.getState().setFileContent(path, `[${tRef.current('editor.loadTimeout')}]`);
      setLoadingPath(null);
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
        useEditorStore.getState().setFileContent(path, `[${tRef.current('editor.loadError')}]`);
      })
      .finally(() => {
        setLoadingPath(null);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [activeTab?.id, activeTab?.path]);

  // Monaco mount hook — t() via tRef to avoid stale closure
  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    // Register this editor instance so the MenuBar can dispatch commands to it
    setActiveEditor(editor);

    // Ctrl+F → Monaco built-in find widget
    editor.addAction({
      id: 'galengine-find',
      label: tRef.current('editor.find'),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: (ed) => { ed.getAction('actions.find')?.run(); },
    });

    // Ctrl+H → Monaco built-in replace widget
    editor.addAction({
      id: 'galengine-replace',
      label: tRef.current('editor.replace'),
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
      run: (ed) => { ed.getAction('editor.action.startFindReplaceAction')?.run(); },
    });

    // Register JSON schema for scene files
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [{
        uri: 'galengine://schemas/scene.json',
        fileMatch: ['*.scene.json'],
        schema: SCENE_JSON_SCHEMA,
      }],
      allowComments: true,
      trailingCommas: 'ignore',
    });

    // Focus the editor
    editor.focus();

    // Force initial layout now that Monaco's DOM is fully constructed.
    // This is the single point of truth for layout — no automaticLayout conflict.
    requestAnimationFrame(() => {
      try { editor.layout(); } catch { /* ignore layout errors */ }
    });
  }, []);

  // Unregister editor instance when component unmounts
  useEffect(() => {
    return () => {
      setActiveEditor(null);
    };
  }, []);

  // Before mount — set up Monaco (stable, no closure issues)
  const handleBeforeMount: BeforeMount = useCallback((m) => {
    m.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [{
        uri: 'galengine://schemas/scene.json',
        fileMatch: ['*.scene.json'],
        schema: SCENE_JSON_SCHEMA,
      }],
      allowComments: true,
      trailingCommas: 'ignore',
    });
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

  // ResizeObserver-driven manual layout.
  // Replaces automaticLayout (which locks at 0px on first mount due to
  // React+Allotment timing) with explicit layout calls on container size change.
  // This is the ONLY layout trigger — handleEditorMount fires the initial one.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const ed = editorRef.current;

    const observer = new ResizeObserver(() => {
      if (ed) {
        try { ed.layout(); } catch { /* ignore */ }
      }
    });
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

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

  const content = fileContents[activeTab.path] ?? '';

  return (
    <div className="monaco-editor-wrapper" ref={wrapperRef}>
      <Editor
        height="100%"
        language={activeTab.language}
        value={content}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleEditorMount}
        beforeMount={handleBeforeMount}
        loading={<div className="monaco-placeholder">{t('editor.loadingEditor')}</div>}
        options={{
          minimap: { enabled: true, scale: 1, showSlider: 'mouseover' },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          // automaticLayout: false — layout is handled exclusively by ResizeObserver above.
          automaticLayout: false,
          tabSize: 2,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: { top: 8 },
          readOnly: false,
          domReadOnly: false,
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
