/**
 * Platform IPC — Channel name constants and type-safe wrappers.
 *
 * These channel names must match exactly with main.ts handlers
 * and preload.ts invocations.
 */

// ---------------------------------------------------------------------------
// Channel Names
// ---------------------------------------------------------------------------

export const IPC = {
  // File system
  FS_READ_TEXT: 'fs:readTextFile',
  FS_READ_BINARY: 'fs:readBinaryFile',
  FS_WRITE_TEXT: 'fs:writeTextFile',
  FS_WRITE_BINARY: 'fs:writeBinaryFile',
  FS_EXISTS: 'fs:exists',
  FS_LIST_DIR: 'fs:listDir',
  FS_LIST_DIR_DETAILED: 'fs:listDirDetailed',
  FS_MKDIR: 'fs:mkdir',
  FS_STAT: 'fs:stat',
  FS_DELETE: 'fs:delete',

  // Settings
  SETTINGS_LOAD: 'settings:load',
  SETTINGS_SAVE: 'settings:save',

  // Dialogs
  DIALOG_OPEN_FILE: 'dialog:openFile',
  DIALOG_SAVE_FILE: 'dialog:saveFile',

  // Platform
  PLATFORM_PATH_SEP: 'platform:pathSep',
  PLATFORM_HOME_DIR: 'platform:homeDir',

  // Menu events (main → renderer)
  MENU_NEW_PROJECT: 'menu:new-project',
  MENU_OPEN_PROJECT: 'menu:open-project',
  MENU_SAVE: 'menu:save',
  MENU_SAVE_AS: 'menu:save-as',
} as const;

// ---------------------------------------------------------------------------
// Type-safe Channel Maps (for request/response typing)
// ---------------------------------------------------------------------------

export interface IpcChannelMap {
  [IPC.FS_READ_TEXT]: { args: [string]; result: string };
  [IPC.FS_READ_BINARY]: { args: [string]; result: ArrayBuffer };
  [IPC.FS_WRITE_TEXT]: { args: [string, string]; result: void };
  [IPC.FS_WRITE_BINARY]: { args: [string, ArrayBuffer]; result: void };
  [IPC.FS_EXISTS]: { args: [string]; result: boolean };
  [IPC.FS_LIST_DIR]: { args: [string]; result: string[] };
  [IPC.FS_LIST_DIR_DETAILED]: { args: [string]; result: DirEntry[] };
  [IPC.FS_MKDIR]: { args: [string]; result: void };
  [IPC.FS_STAT]: { args: [string]; result: FileStat };
  [IPC.FS_DELETE]: { args: [string]; result: void };
  [IPC.SETTINGS_LOAD]: { args: []; result: EditorSettings };
  [IPC.SETTINGS_SAVE]: { args: [EditorSettings]; result: void };
  [IPC.DIALOG_OPEN_FILE]: { args: [DialogOpenOptions?]; result: string | null };
  [IPC.DIALOG_SAVE_FILE]: { args: [string?]; result: string | null };
  [IPC.PLATFORM_PATH_SEP]: { args: []; result: string };
  [IPC.PLATFORM_HOME_DIR]: { args: []; result: string };
}

export interface FileStat {
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  mtimeMs: number;
}

export interface DirEntry {
  name: string;
  isDirectory: boolean;
}

export interface DialogOpenOptions {
  filters?: { name: string; extensions: string[] }[];
}

/** Persistent editor settings stored in ~/.galengine/settings.json */
export interface EditorSettings {
  autoSave: {
    enabled: boolean;
    delay: number; // milliseconds, default 10000
  };
  language: 'zh-CN' | 'ja-JP' | 'en-US';
}

export const DEFAULT_SETTINGS: EditorSettings = {
  autoSave: { enabled: true, delay: 10000 },
  language: 'en-US',
};

// ---------------------------------------------------------------------------
// Renderer-side type declaration for window.galengine
// ---------------------------------------------------------------------------

export interface GalEngineBridge {
  fs: {
    readTextFile(path: string): Promise<string>;
    readBinaryFile(path: string): Promise<ArrayBuffer>;
    writeTextFile(path: string, content: string): Promise<void>;
    writeBinaryFile(path: string, data: ArrayBuffer): Promise<void>;
    exists(path: string): Promise<boolean>;
    listDir(path: string): Promise<string[]>;
    mkdir(path: string): Promise<void>;
    stat(path: string): Promise<FileStat>;
    listDirDetailed(path: string): Promise<DirEntry[]>;
    delete(path: string): Promise<void>;
  };
  dialog: {
    openFile(options?: DialogOpenOptions): Promise<string | null>;
    saveFile(defaultPath?: string): Promise<string | null>;
  };
  settings: {
    load(): Promise<EditorSettings>;
    save(settings: EditorSettings): Promise<void>;
  };
  platform: {
    pathSep: Promise<string>;
    homeDir: Promise<string>;
  };
  menu: {
    onNewProject(cb: () => void): () => void;
    onOpenProject(cb: (path: string) => void): () => void;
    onSave(cb: () => void): () => void;
    onSaveAs(cb: () => void): () => void;
  };
}

declare global {
  interface Window {
    galengine?: GalEngineBridge;
  }
}
