/**
 * GalEngine Editor — Preload Script.
 *
 * Exposes a secure `window.galengine` API to the renderer process
 * via Electron's contextBridge. All Node.js operations are proxied
 * through IPC to keep the renderer sandboxed.
 */

import { contextBridge, ipcRenderer } from 'electron';

// ---------------------------------------------------------------------------
// Type declarations (mirrors platform/ipc.ts but kept self-contained for preload)
// ---------------------------------------------------------------------------

interface VFSAPI {
  readTextFile(path: string): Promise<string>;
  readBinaryFile(path: string): Promise<ArrayBuffer>;
  writeTextFile(path: string, content: string): Promise<void>;
  writeBinaryFile(path: string, data: ArrayBuffer): Promise<void>;
  exists(path: string): Promise<boolean>;
  listDir(path: string): Promise<string[]>;
  listDirDetailed(path: string): Promise<DirEntry[]>;
  mkdir(path: string): Promise<void>;
  stat(path: string): Promise<FileStat>;
  delete(path: string): Promise<void>;
}

interface FileStat {
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  mtimeMs: number;
}

interface DirEntry {
  name: string;
  isDirectory: boolean;
}

interface DialogAPI {
  openFile(options?: { filters?: { name: string; extensions: string[] }[] }): Promise<string | null>;
  saveFile(defaultPath?: string): Promise<string | null>;
}

interface PlatformAPI {
  pathSep: Promise<string>;
  homeDir: Promise<string>;
}

interface EditorSettings {
  autoSave: { enabled: boolean; delay: number };
  language: 'zh-CN' | 'ja-JP' | 'en-US';
}

interface SettingsAPI {
  load(): Promise<EditorSettings>;
  save(settings: EditorSettings): Promise<void>;
}

interface DialogAPI {
  openFile(options?: { filters?: { name: string; extensions: string[] }[] }): Promise<string | null>;
  saveFile(defaultPath?: string): Promise<string | null>;
  openDirectory(title?: string): Promise<string | null>;
  about(): Promise<void>;
}

interface ViewAPI {
  toggleDevTools(): void;
}

interface GalEngineAPI {
  fs: VFSAPI;
  dialog: DialogAPI;
  platform: PlatformAPI;
  view: ViewAPI;
  settings: SettingsAPI;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

const api: GalEngineAPI = {
  fs: {
    readTextFile: (p) => ipcRenderer.invoke('fs:readTextFile', p),
    readBinaryFile: (p) => ipcRenderer.invoke('fs:readBinaryFile', p),
    writeTextFile: (p, c) => ipcRenderer.invoke('fs:writeTextFile', p, c),
    writeBinaryFile: (p, d) => ipcRenderer.invoke('fs:writeBinaryFile', p, d),
    exists: (p) => ipcRenderer.invoke('fs:exists', p),
    listDir: (p) => ipcRenderer.invoke('fs:listDir', p),
    listDirDetailed: (p) => ipcRenderer.invoke('fs:listDirDetailed', p),
    mkdir: (p) => ipcRenderer.invoke('fs:mkdir', p),
    stat: (p) => ipcRenderer.invoke('fs:stat', p),
    delete: (p) => ipcRenderer.invoke('fs:delete', p),
  },
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (s) => ipcRenderer.invoke('settings:save', s),
  },
  dialog: {
    openFile: (opts) => ipcRenderer.invoke('dialog:openFile', opts),
    saveFile: (dp) => ipcRenderer.invoke('dialog:saveFile', dp),
    openDirectory: (title) => ipcRenderer.invoke('dialog:openDirectory', title),
    about: () => ipcRenderer.invoke('dialog:about'),
  },
  view: {
    toggleDevTools: () => ipcRenderer.send('view:toggleDevTools'),
  },
  platform: {
    pathSep: ipcRenderer.invoke('platform:pathSep'),
    homeDir: ipcRenderer.invoke('platform:homeDir'),
  },
};

contextBridge.exposeInMainWorld('galengine', api);
