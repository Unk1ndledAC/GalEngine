/**
 * Global type declarations for the renderer process.
 */

interface FileStat {
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  mtimeMs: number;
}

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

interface DialogAPI {
  openFile(options?: {
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | null>;
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

interface GalEngineBridge {
  fs: VFSAPI;
  dialog: DialogAPI;
  platform: PlatformAPI;
  menu: MenuEvents;
}

interface Window {
  galengine?: GalEngineBridge;
}
