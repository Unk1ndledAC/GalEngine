/**
 * SettingsStore — Global editor settings persisted to ~/.galengine/settings.json
 *
 * Tracks:
 *   - autoSave (enabled + delay in ms)
 *   - language (zh-CN | ja-JP | en-US)
 *
 * Settings are loaded once on app startup and persisted on every change.
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Language = 'zh-CN' | 'ja-JP' | 'en-US';

export interface AutoSaveSettings {
  enabled: boolean;
  /** Delay in milliseconds before auto-saving after the last keystroke. */
  delay: number;
}

export interface EditorSettings {
  autoSave: AutoSaveSettings;
  language: Language;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  autoSave: { enabled: true, delay: 10000 },
  language: 'en-US',
};

export interface SettingsState extends EditorSettings {
  loaded: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveDelay: (delay: number) => void;
  setLanguage: (lang: Language) => void;
  loadSettings: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Persistence helper (module-level, debounced)
// ---------------------------------------------------------------------------

let _persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(settings: EditorSettings): void {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    const api = (window as any).galengine;
    api?.settings?.save(settings).catch(() => {});
  }, 300);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  setAutoSaveEnabled: (enabled) => {
    const next = { ...get().autoSave, enabled };
    set({ autoSave: next });
    schedulePersist({ autoSave: next, language: get().language });
  },

  setAutoSaveDelay: (delay) => {
    const clamped = Math.max(1000, Math.min(60000, delay));
    const next = { ...get().autoSave, delay: clamped };
    set({ autoSave: next });
    schedulePersist({ autoSave: next, language: get().language });
  },

  setLanguage: (lang) => {
    set({ language: lang });
    schedulePersist({ autoSave: get().autoSave, language: lang });
  },

  loadSettings: async () => {
    const api = (window as any).galengine;
    if (!api) {
      set({ loaded: true });
      return;
    }
    try {
      const settings: EditorSettings = await api.settings.load();
      set({
        autoSave: settings.autoSave ?? DEFAULT_SETTINGS.autoSave,
        language: settings.language ?? DEFAULT_SETTINGS.language,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
}));
