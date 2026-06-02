/**
 * Workbench root — IDE shell layout.
 * Pattern: VS Code src/vs/workbench/browser/workbench.ts
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { ActivityBar } from './parts/ActivityBar';
import { Sidebar } from './parts/Sidebar';
import { EditorArea } from './parts/EditorArea';
import { BottomPanel } from './parts/BottomPanel';
import { StatusBar } from './parts/StatusBar';
import { MenuBar } from './parts/MenuBar';
import { SettingsPanel } from './settings/SettingsPanel';
import { useSettingsStore } from './settings/SettingsStore';
import { useProjectStore } from './contrib/project/ProjectStore';
import { useEditorStore } from './contrib/editor/EditorStore';
import { saveActiveFile } from './contrib/editor/MonacoEditor';
import type { VFS } from '../engine/loader';

export type SidebarView = 'explorer' | 'plugins' | 'llm' | 'debug' | 'search';
export type BottomPanelView = 'output' | 'problems' | 'terminal';

export const App: React.FC = () => {
  const [activeSidebar, setActiveSidebar] = useState<SidebarView>('explorer');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [bottomVisible, setBottomVisible] = useState(true);
  const [activeBottom, setActiveBottom] = useState<BottomPanelView>('output');
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const projectPath = useProjectStore((s) => s.projectPath);
  const setProjectPath = useProjectStore((s) => s.setProjectPath);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const openFile = useEditorStore((s) => s.openFile);

  // Load persisted settings once on startup
  useEffect(() => {
    if (!settingsLoaded) {
      loadSettings();
    }
  }, [settingsLoaded, loadSettings]);

  // Get the VFS from the window bridge (set by renderer.tsx)
  const galApi = window.galengine;
  const vfs: VFS | undefined = galApi?.fs ? {
    readTextFile: (p: string) => galApi.fs.readTextFile(p),
    readBinaryFile: (p: string) => galApi.fs.readBinaryFile(p).then((b: ArrayBuffer) => new Uint8Array(b)),
    writeTextFile: (p: string, c: string) => galApi.fs.writeTextFile(p, c),
    writeBinaryFile: (p: string, d: Uint8Array) => galApi.fs.writeBinaryFile(p, d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) as ArrayBuffer),
    exists: (p: string) => galApi.fs.exists(p),
    listDir: (p: string) => galApi.fs.listDir(p),
    listDirDetailed: (p: string) => galApi.fs.listDirDetailed(p),
    mkdir: (p: string) => galApi.fs.mkdir(p),
  } : undefined;

  // ---- Menu callbacks ----

  // Find: dispatch Ctrl+F to Monaco (its keyboard listener picks it up)
  const handleFind = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'f', code: 'KeyF', ctrlKey: true, bubbles: true }));
  }, []);

  // Replace: dispatch Ctrl+H to Monaco
  const handleReplace = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'h', code: 'KeyH', ctrlKey: true, bubbles: true }));
  }, []);

  // Find in Files: open search sidebar
  const handleFindInFiles = useCallback(() => {
    setShowSearch(true);
    setActiveSidebar('search');
    setSidebarVisible(true);
  }, []);

  // Save: call Monaco's save function
  const handleSave = useCallback(() => {
    void saveActiveFile();
  }, []);

  // Save As: same as save for now (full Save As requires path dialog — can extend later)
  const handleSaveAs = useCallback(() => {
    void saveActiveFile();
  }, []);

  // New Project: trigger the "New Project" dialog (open the New Project dialog via settings panel)
  const handleNewProject = useCallback(async () => {
    // Show settings panel with new-project tab active, or reuse WelcomeScreen's flow.
    // For now, prompt for project location via dialog, then delegate to handleNewProjectPath.
    if (!vfs || !galApi?.dialog) return;
    const dir = await galApi.dialog.openDirectory('New Project Location');
    if (!dir) return;
    await handleNewProjectPath(dir, 'MyProject');
  }, [vfs, galApi]);

  // Open Project: use native dialog to pick directory
  const handleOpenProject = useCallback(async () => {
    if (!galApi?.dialog) return;
    const dir = await galApi.dialog.openDirectory('Open Project');
    if (!dir) return;
    setProjectPath(dir);
  }, [setProjectPath]);

  // Close Project
  const handleCloseProject = useCallback(() => {
    setProjectPath('');
    setActiveSidebar('explorer');
  }, [setProjectPath]);

  // Toggle DevTools
  const handleToggleDevTools = useCallback(() => {
    galApi?.view?.toggleDevTools();
  }, [galApi]);

  // ---- New Project path handler (called from WelcomeScreen and menu) ----
  const handleNewProjectPath = useCallback(async (dirPath: string, name: string) => {
    if (!vfs) {
      console.warn('No VFS available, cannot create project');
      return;
    }
    try {
      await vfs.mkdir(dirPath);
      await vfs.mkdir(`${dirPath}\\scripts`);
      await vfs.mkdir(`${dirPath}\\assets`);
      await vfs.mkdir(`${dirPath}\\assets\\backgrounds`);
      await vfs.mkdir(`${dirPath}\\assets\\sprites`);
      await vfs.mkdir(`${dirPath}\\assets\\cgs`);
      await vfs.mkdir(`${dirPath}\\assets\\audio`);
      await vfs.mkdir(`${dirPath}\\assets\\ui`);
      await vfs.mkdir(`${dirPath}\\assets\\fonts`);

      const settings = {
        name,
        version: '1.0.0',
        resolution: { width: 1920, height: 1080 },
        assets: {
          backgrounds: 'assets/backgrounds',
          sprites: 'assets/sprites',
          cgs: 'assets/cgs',
          audio: 'assets/audio',
          fonts: 'assets/fonts',
          ui: 'assets/ui',
        },
        scenes: {} as Record<string, string>,
      };
      await vfs.writeTextFile(
        `${dirPath}\\settings.json`,
        JSON.stringify(settings, null, 2)
      );

      setProjectPath(dirPath);
      const settingsPath = `${dirPath}\\settings.json`;
      openFile(settingsPath, 'settings.json');
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  }, [vfs, setProjectPath, openFile]);

  // ---- Sidebar / panel toggles ----
  const toggleSidebar = useCallback((view: SidebarView) => {
    if (activeSidebar === view && sidebarVisible) {
      setSidebarVisible(false);
    } else {
      setActiveSidebar(view);
      setSidebarVisible(true);
    }
  }, [activeSidebar, sidebarVisible]);

  const toggleBottom = useCallback((view: BottomPanelView) => {
    if (activeBottom === view && bottomVisible) {
      setBottomVisible(false);
    } else {
      setActiveBottom(view);
      setBottomVisible(true);
    }
  }, [activeBottom, bottomVisible]);

  // Close search panel — switch back to explorer
  const handleCloseSearch = useCallback(() => {
    setActiveSidebar('explorer');
  }, []);

  return (
    <div className="workbench">
      {/* React Menu Bar — replaces native Electron menu */}
      <MenuBar
        onFind={handleFind}
        onReplace={handleReplace}
        onFindInFiles={handleFindInFiles}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onCloseProject={handleCloseProject}
        onToggleDevTools={handleToggleDevTools}
      />
      <div className="workbench-top">
        <ActivityBar
          activeView={activeSidebar}
          onViewClick={toggleSidebar}
          bottomViews={{ activeBottom, onToggle: toggleBottom }}
          onOpenSettings={() => setShowSettings(true)}
        />
        <Allotment>
          {sidebarVisible && projectPath && (
            <Allotment.Pane preferredSize={260} minSize={180} maxSize={500}>
              <Sidebar activeView={activeSidebar} onCloseSearch={handleCloseSearch} />
            </Allotment.Pane>
          )}
          <Allotment.Pane>
            <Allotment vertical>
              <Allotment.Pane>
                <EditorArea
                  projectPath={projectPath}
                  vfs={vfs}
                  onNewProject={handleNewProjectPath}
                  onOpenProject={(dirPath) => setProjectPath(dirPath)}
                />
              </Allotment.Pane>
              {bottomVisible && (
                <Allotment.Pane preferredSize={200} minSize={100}>
                  <BottomPanel activeView={activeBottom} />
                </Allotment.Pane>
              )}
            </Allotment>
          </Allotment.Pane>
        </Allotment>
      </div>
      <StatusBar onOpenSettings={() => setShowSettings(true)} />
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};
