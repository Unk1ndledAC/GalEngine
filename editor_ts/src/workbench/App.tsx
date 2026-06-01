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
import { SettingsPanel } from './settings/SettingsPanel';
import { useSettingsStore } from './settings/SettingsStore';
import { useProjectStore } from './contrib/project/ProjectStore';
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

  // Load persisted settings once on startup
  useEffect(() => {
    if (!settingsLoaded) {
      loadSettings();
    }
  }, [settingsLoaded, loadSettings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+F → Find in Files
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowSearch(true);
        setActiveSidebar('search');
        setSidebarVisible(true);
      }
      // Ctrl+F → Monaco's built-in find (handled in MonacoEditor)
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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

  // New Project handler — called from WelcomeScreen
  const handleNewProject = useCallback(async (dirPath: string, name: string) => {
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

      // Create a default settings.json
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
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  }, [vfs, setProjectPath]);

  // Open Project handler
  const handleOpenProject = useCallback((dirPath: string) => {
    setProjectPath(dirPath);
  }, [setProjectPath]);

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

  return (
    <div className="workbench">
      <div className="workbench-top">
        <ActivityBar
          activeView={activeSidebar}
          onViewClick={toggleSidebar}
          bottomViews={{ activeBottom, onToggle: toggleBottom }}
        />
        <Allotment>
          {sidebarVisible && projectPath && (
            <Allotment.Pane preferredSize={260} minSize={180} maxSize={500}>
              <Sidebar activeView={activeSidebar} />
            </Allotment.Pane>
          )}
          <Allotment.Pane>
            <Allotment vertical>
              <Allotment.Pane>
                <EditorArea
                  projectPath={projectPath}
                  vfs={vfs}
                  onNewProject={handleNewProject}
                  onOpenProject={handleOpenProject}
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
