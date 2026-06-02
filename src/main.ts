/**
 * GalEngine Editor — Electron Main Process.
 *
 * Responsibilities:
 *   - Create and manage BrowserWindow
 *   - Register IPC handlers for file-system operations
 *   - Handle native menus and dialogs
 *   - Dev/Prod mode detection (Vite dev server vs built files)
 */

import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { readdirSync, existsSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Dev mode: use Vite dev server at localhost:5173
// Prod mode: load built files from dist/renderer/index.html
// Detection: if the built index.html exists, use prod mode.
// Otherwise fall back to dev server (Vite must be running separately).
const RENDERER_INDEX = path.join(__dirname, 'renderer', 'index.html');
const isDev = !app.isPackaged && !existsSync(RENDERER_INDEX);
const VITE_DEV_URL = 'http://localhost:5173';

// ---------------------------------------------------------------------------
// Window Management
// ---------------------------------------------------------------------------

let win: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'GalEngine Editor',
    icon: path.join(__dirname, '../resources/icons/icon.png'),
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load content
  if (isDev) {
    win.loadURL(VITE_DEV_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  }

  win.on('closed', () => {
    win = null;
  });

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

// ---------------------------------------------------------------------------
// Application Menu — managed entirely in React (MenuBar.tsx).
// Hide the native menu bar to avoid duplication.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// IPC Handlers — File System
// ---------------------------------------------------------------------------

function registerIpcHandlers(): void {
  // Read text file
  ipcMain.handle('fs:readTextFile', async (_event, filePath: string) => {
    return fs.readFile(filePath, 'utf-8');
  });

  // Read binary file
  ipcMain.handle('fs:readBinaryFile', async (_event, filePath: string) => {
    const buf = await fs.readFile(filePath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  });

  // Write text file
  ipcMain.handle('fs:writeTextFile', async (_event, filePath: string, content: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  });

  // Write binary file
  ipcMain.handle('fs:writeBinaryFile', async (_event, filePath: string, data: ArrayBuffer) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, Buffer.from(data));
  });

  // Check if file/dir exists
  ipcMain.handle('fs:exists', async (_event, filePath: string) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  // List directory contents
  ipcMain.handle('fs:listDir', async (_event, dirPath: string) => {
    return fs.readdir(dirPath);
  });

  // List directory with file type info (avoids N separate stat() calls)
  ipcMain.handle('fs:listDirDetailed', async (_event, dirPath: string) => {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    return entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
  });

  // Create directory
  ipcMain.handle('fs:mkdir', async (_event, dirPath: string) => {
    await fs.mkdir(dirPath, { recursive: true });
  });

  // Get file stats (for file tree)
  ipcMain.handle('fs:stat', async (_event, filePath: string) => {
    const s = await fs.stat(filePath);
    return {
      isDirectory: s.isDirectory(),
      isFile: s.isFile(),
      size: s.size,
      mtimeMs: s.mtimeMs,
    };
  });

  // Show open file dialog
  ipcMain.handle('dialog:openFile', async (_event, options: { filters?: { name: string; extensions: string[] }[] }) => {
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openFile'],
      filters: options.filters ?? [
        { name: 'All Supported', extensions: ['json', 'md', 'markdown', 'txt'] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Show open directory dialog (for "Open Project")
  ipcMain.handle('dialog:openDirectory', async (_event, title?: string) => {
    const result = await dialog.showOpenDialog(win!, {
      title: title ?? 'Open Project',
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Show save file dialog
  ipcMain.handle('dialog:saveFile', async (_event, defaultPath?: string) => {
    const result = await dialog.showSaveDialog(win!, {
      defaultPath,
      filters: [
        { name: 'Scene Files', extensions: ['json', 'md'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePath;
  });

  // Show about dialog
  ipcMain.handle('dialog:about', async () => {
    await dialog.showMessageBox(win!, {
      type: 'info',
      title: 'About GalEngine Editor',
      message: 'GalEngine Editor v0.2.0',
      detail: 'A Visual Novel Engine & IDE built with Electron + React + Monaco.',
    });
  });

  // Toggle DevTools (requested by React menu)
  ipcMain.on('view:toggleDevTools', () => {
    win?.webContents.toggleDevTools();
  });

  // Get path separator for the platform
  ipcMain.handle('platform:pathSep', () => path.sep);
  ipcMain.handle('platform:homeDir', () => app.getPath('home'));

  // ---- Settings ----

  const settingsDir = path.join(app.getPath('home'), '.galengine');
  const settingsPath = path.join(settingsDir, 'settings.json');

  function getDefaultSettings() {
    const locale = app.getLocale();
    let language: 'zh-CN' | 'ja-JP' | 'en-US' = 'en-US';
    if (locale.startsWith('zh')) language = 'zh-CN';
    else if (locale.startsWith('ja')) language = 'ja-JP';
    return {
      autoSave: { enabled: true, delay: 10000 },
      language,
    };
  }

  ipcMain.handle('settings:load', async () => {
    try {
      const raw = await fs.readFile(settingsPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return getDefaultSettings();
    }
  });

  ipcMain.handle('settings:save', async (_event, settings: { autoSave: { enabled: boolean; delay: number }; language: string }) => {
    await fs.mkdir(settingsDir, { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  });

  // ---- Delete ----

  ipcMain.handle('fs:delete', async (_event, filePath: string) => {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.unlink(filePath);
    }
  });
}

// ---------------------------------------------------------------------------
// App Lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  registerIpcHandlers();
  // Hide native Electron menu bar — the React MenuBar component handles all menus.
  // On macOS the system menu is mandatory; only hide it on Windows/Linux.
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
