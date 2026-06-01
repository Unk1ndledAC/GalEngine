/**
 * ProjectStore — Shared project state across the workbench.
 *
 * Keeps track of the currently open project path and creation state,
 * so FileTree, EditorArea, and WelcomeScreen all agree on what's open.
 */

import { create } from 'zustand';

export interface ProjectState {
  /** Currently open project path (null if no project) */
  projectPath: string | null;

  /** Whether a new project is being created */
  isCreating: boolean;

  /** Set the current project path */
  setProjectPath: (path: string | null) => void;

  /** Mark project creation in progress */
  setCreating: (creating: boolean) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectPath: null,
  isCreating: false,

  setProjectPath: (path: string | null) => set({ projectPath: path }),
  setCreating: (creating: boolean) => set({ isCreating: creating }),
}));
