/**
 * Project Loader — parses settings.json and resolves asset paths.
 * Python: galengine/loader/project_loader.py
 */

import type { ProjectSettings } from './types';
import { joinPath, dirname } from '../base/uri';

// ---------------------------------------------------------------------------
// Project Loader
// ---------------------------------------------------------------------------

export interface LoadedProject {
  settings: ProjectSettings;
  projectRoot: string;
  scriptDir: string;
  assetDirs: {
    backgrounds: string;
    sprites: string;
    cgs: string;
    audio: string;
    fonts: string;
    ui: string;
  };
}

export class ProjectLoader {
  private _fs: VFS;

  constructor(fs: VFS) {
    this._fs = fs;
  }

  /** Load a project from directory path. */
  async load(projectPath: string): Promise<LoadedProject> {
    const settingsPath = joinPath(projectPath, 'settings.json');
    const raw = await this._fs.readTextFile(settingsPath);
    const settings = JSON.parse(raw) as ProjectSettings;

    const scriptDir = joinPath(projectPath, 'scripts');
    const assetRoot = (p: string) => joinPath(projectPath, p);

    return {
      settings,
      projectRoot: projectPath,
      scriptDir,
      assetDirs: {
        backgrounds: assetRoot(settings.assets.backgrounds),
        sprites: assetRoot(settings.assets.sprites),
        cgs: assetRoot(settings.assets.cgs),
        audio: assetRoot(settings.assets.audio),
        fonts: assetRoot(settings.assets.fonts),
        ui: assetRoot(settings.assets.ui),
      },
    };
  }

  /** Load a scene file by ID. */
  async loadScene(project: LoadedProject, sceneId: string): Promise<string> {
    const filePath = project.settings.scenes[sceneId];
    if (!filePath) throw new Error(`Scene not found: ${sceneId}`);
    const fullPath = joinPath(project.scriptDir, filePath);
    return this._fs.readTextFile(fullPath);
  }

  /** List all scene IDs. */
  listScenes(project: LoadedProject): string[] {
    return Object.keys(project.settings.scenes);
  }
}

// ---------------------------------------------------------------------------
// Virtual File System abstraction
// ---------------------------------------------------------------------------

export interface VFS {
  readTextFile(path: string): Promise<string>;
  readBinaryFile(path: string): Promise<Uint8Array>;
  writeTextFile(path: string, content: string): Promise<void>;
  writeBinaryFile(path: string, data: Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  listDir(path: string): Promise<string[]>;
  mkdir(path: string): Promise<void>;
}

// NodeVFS moved to src/platform/node-vfs.ts (main-process only).
// Renderer should use ElectronVFS (IPC bridge) or InMemoryVFS.
