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
// Application Menu
// ---------------------------------------------------------------------------

function createMenu(lang?: string): void {
  // Menu label translations — must stay in sync with src/i18n/translations.ts
  const L: Record<string, Record<string, string>> = {
    'zh-CN': {
      file: '文件', edit: '编辑', view: '视图', help: '帮助',
      newProject: '新建项目', openProject: '打开项目...',
      save: '保存', saveAs: '另存为...',
      about: '关于 GalEngine Editor',
      undo: '撤销', redo: '重做',
      cut: '剪切', copy: '复制', paste: '粘贴', selectAll: '全选',
      exit: '退出',
      reload: '重新加载', forceReload: '强制重新加载',
      toggleDevTools: '切换开发者工具',
      resetZoom: '重置缩放', zoomIn: '放大', zoomOut: '缩小',
      toggleFullscreen: '切换全屏',
    },
    'ja-JP': {
      file: 'ファイル', edit: '編集', view: '表示', help: 'ヘルプ',
      newProject: '新規プロジェクト', openProject: 'プロジェクトを開く...',
      save: '保存', saveAs: '名前を付けて保存...',
      about: 'GalEngine Editor について',
      undo: '元に戻す', redo: 'やり直し',
      cut: '切り取り', copy: 'コピー', paste: '貼り付け', selectAll: 'すべて選択',
      exit: '終了',
      reload: '再読み込み', forceReload: '強制再読み込み',
      toggleDevTools: '開発者ツールを切り替え',
      resetZoom: 'ズームをリセット', zoomIn: 'ズームイン', zoomOut: 'ズームアウト',
      toggleFullscreen: '全画面切り替え',
    },
    'en-US': {
      file: 'File', edit: 'Edit', view: 'View', help: 'Help',
      newProject: 'New Project', openProject: 'Open Project…',
      save: 'Save', saveAs: 'Save As…',
      about: 'About GalEngine Editor',
      undo: 'Undo', redo: 'Redo',
      cut: 'Cut', copy: 'Copy', paste: 'Paste', selectAll: 'Select All',
      exit: 'Exit',
      reload: 'Reload', forceReload: 'Force Reload',
      toggleDevTools: 'Toggle Developer Tools',
      resetZoom: 'Reset Zoom', zoomIn: 'Zoom In', zoomOut: 'Zoom Out',
      toggleFullscreen: 'Toggle Full Screen',
    },
  };
  const l = (L[lang ?? 'en-US']) ?? L['en-US'];

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: l.file,
      submenu: [
        {
          label: l.newProject,
          accelerator: 'Ctrl+N',
          click: () => win?.webContents.send('menu:new-project'),
        },
        {
          label: l.openProject,
          accelerator: 'Ctrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(win!, {
              title: l.openProject,
              properties: ['openDirectory'],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              win?.webContents.send('menu:open-project', result.filePaths[0]);
            }
          },
        },
        { type: 'separator' },
        {
          label: l.save,
          accelerator: 'Ctrl+S',
          click: () => win?.webContents.send('menu:save'),
        },
        {
          label: l.saveAs,
          accelerator: 'Ctrl+Shift+S',
          click: () => win?.webContents.send('menu:save-as'),
        },
        { type: 'separator' },
        { label: l.exit, role: 'quit' },
      ],
    },
    {
      label: l.edit,
      submenu: [
        { role: 'undo', label: l.undo },
        { role: 'redo', label: l.redo },
        { type: 'separator' },
        { role: 'cut', label: l.cut },
        { role: 'copy', label: l.copy },
        { role: 'paste', label: l.paste },
        { role: 'selectAll', label: l.selectAll },
      ],
    },
    {
      label: l.view,
      submenu: [
        { role: 'reload', label: l.reload },
        { role: 'forceReload', label: l.forceReload },
        { role: 'toggleDevTools', label: l.toggleDevTools },
        { type: 'separator' },
        { role: 'resetZoom', label: l.resetZoom },
        { role: 'zoomIn', label: l.zoomIn },
        { role: 'zoomOut', label: l.zoomOut },
        { type: 'separator' },
        { role: 'togglefullscreen', label: l.toggleFullscreen },
      ],
    },
    {
      label: l.help,
      submenu: [
        {
          label: l.about,
          click: () => {
            void dialog.showMessageBox(win!, {
              type: 'info',
              title: l.about,
              message: 'GalEngine Editor v0.2.0',
              detail:
                'A Visual Novel Engine & IDE built with Electron + React + Monaco.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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

  // Renderer notifies main process of language change → rebuild menu
  ipcMain.on('settings:language-changed', (_event, lang: string) => {
    createMenu(lang);
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
  createMenu();
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
