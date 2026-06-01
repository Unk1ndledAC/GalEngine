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
  mkdir(path: string): Promise<void>;
  stat(path: string): Promise<FileStat>;
}

interface FileStat {
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  mtimeMs: number;
}

interface DialogAPI {
  openFile(options?: { filters?: { name: string; extensions: string[] }[] }): Promise<string | null>;
  saveFile(defaultPath?: string): Promise<string | null>;
}

interface PlatformAPI {
  pathSep: Promise<string>;
  homeDir: Promise<string>;
}

interface MenuEvents {
  onNewProject(callback: () => void): () => void;
  onOpenProject(callback: (path: string) => void): () => void;
  onSave(callback: () => void): () => void;
  onSaveAs(callback: () => void): () => void;
}

interface GalEngineAPI {
  fs: VFSAPI;
  dialog: DialogAPI;
  platform: PlatformAPI;
  menu: MenuEvents;
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
    mkdir: (p) => ipcRenderer.invoke('fs:mkdir', p),
    stat: (p) => ipcRenderer.invoke('fs:stat', p),
  },

  dialog: {
    openFile: (opts) => ipcRenderer.invoke('dialog:openFile', opts),
    saveFile: (dp) => ipcRenderer.invoke('dialog:saveFile', dp),
  },

  platform: {
    pathSep: ipcRenderer.invoke('platform:pathSep'),
    homeDir: ipcRenderer.invoke('platform:homeDir'),
  },

  menu: {
    onNewProject(cb) {
      const handler = () => cb();
      ipcRenderer.on('menu:new-project', handler);
      return () => ipcRenderer.removeListener('menu:new-project', handler);
    },
    onOpenProject(cb) {
      const handler = (_e: Electron.IpcRendererEvent, p: string) => cb(p);
      ipcRenderer.on('menu:open-project', handler);
      return () => ipcRenderer.removeListener('menu:open-project', handler);
    },
    onSave(cb) {
      const handler = () => cb();
      ipcRenderer.on('menu:save', handler);
      return () => ipcRenderer.removeListener('menu:save', handler);
    },
    onSaveAs(cb) {
      const handler = () => cb();
      ipcRenderer.on('menu:save-as', handler);
      return () => ipcRenderer.removeListener('menu:save-as', handler);
    },
  },
};

contextBridge.exposeInMainWorld('galengine', api);
