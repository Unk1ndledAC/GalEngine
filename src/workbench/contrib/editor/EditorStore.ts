/**
 * EditorStore — Zustand store managing open editor tabs and their state.
 *
 * Tracks:
 *   - Open files (tabs)
 *   - Active (focused) file
 *   - Dirty (unsaved) state per file
 *   - File content cache
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EditorTab {
  /** Unique identifier — typically the absolute file path. */
  id: string;
  /** Display name — just the filename. */
  name: string;
  /** Full file path. */
  path: string;
  /** Language mode for Monaco ('json' | 'markdown' | 'plaintext'). */
  language: EditorLanguage;
  /** Whether the tab is currently loading content. */
  loading: boolean;
}

export type EditorLanguage = 'json' | 'markdown' | 'plaintext';

export interface EditorState {
  // Data
  tabs: EditorTab[];
  activeTabId: string | null;
  fileContents: Record<string, string>;   // file path → content
  dirtyFiles: Set<string>;                 // set of file paths with unsaved changes

  // Actions
  openFile: (path: string, name?: string) => void;
  closeFile: (path: string) => void;
  closeAllFiles: () => void;
  setActive: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  markClean: (path: string) => void;
  markDirty: (path: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectLanguage(filePath: string): EditorLanguage {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json': return 'json';
    case 'md':
    case 'markdown': return 'markdown';
    default: return 'plaintext';
  }
}

function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  fileContents: {},
  dirtyFiles: new Set(),

  openFile: (path, name) => {
    const state = get();
    const exists = state.tabs.find((t) => t.id === path);
    if (exists) {
      // Already open — just switch to it
      set({ activeTabId: path });
      return;
    }

    const tab: EditorTab = {
      id: path,
      name: name ?? getFileName(path),
      path,
      language: detectLanguage(path),
      loading: true,
    };

    set({
      tabs: [...state.tabs, tab],
      activeTabId: path,
    });

    // If content not yet loaded, trigger async load
    if (!(path in state.fileContents)) {
      // Content loading is handled externally (by the MonacoEditor component)
      // Set loading:false after content is received
    }
  },

  closeFile: (path) => {
    const state = get();
    const idx = state.tabs.findIndex((t) => t.id === path);
    if (idx === -1) return;

    const newTabs = state.tabs.filter((t) => t.id !== path);
    let newActive = state.activeTabId;

    // If closing the active tab, switch to adjacent
    if (state.activeTabId === path) {
      if (newTabs.length > 0) {
        const nextIdx = Math.min(idx, newTabs.length - 1);
        newActive = newTabs[nextIdx].id;
      } else {
        newActive = null;
      }
    }

    set({ tabs: newTabs, activeTabId: newActive });
  },

  closeAllFiles: () => {
    set({ tabs: [], activeTabId: null });
  },

  setActive: (path) => {
    set({ activeTabId: path });
  },

  updateContent: (path, content) => {
    set((s) => ({
      fileContents: { ...s.fileContents, [path]: content },
    }));
    const dirty = new Set(get().dirtyFiles);
    dirty.add(path);
    set({ dirtyFiles: dirty });
  },

  markClean: (path) => {
    const dirty = new Set(get().dirtyFiles);
    dirty.delete(path);
    set({ dirtyFiles: dirty });
  },

  markDirty: (path) => {
    const dirty = new Set(get().dirtyFiles);
    dirty.add(path);
    set({ dirtyFiles: dirty });
  },
}));
