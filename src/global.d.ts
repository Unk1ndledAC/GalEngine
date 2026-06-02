/**
 * Global type declarations for the renderer process.
 */

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

interface DialogAPI {
  openFile(options?: {
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | null>;
  saveFile(defaultPath?: string): Promise<string | null>;
  openDirectory(title?: string): Promise<string | null>;
  about(): Promise<void>;
}

interface PlatformAPI {
  pathSep: Promise<string>;
  homeDir: Promise<string>;
}

interface ViewAPI {
  toggleDevTools(): void;
}

interface EditorSettings {
  autoSave: { enabled: boolean; delay: number };
  language: 'zh-CN' | 'ja-JP' | 'en-US';
}

interface SettingsAPI {
  load(): Promise<EditorSettings>;
  save(settings: EditorSettings): Promise<void>;
}

interface GalEngineBridge {
  fs: VFSAPI;
  dialog: DialogAPI;
  platform: PlatformAPI;
  view: ViewAPI;
  settings: SettingsAPI;
}

interface Window {
  galengine?: GalEngineBridge;
}
