/**
 * WelcomeScreen — Landing page shown when no project is loaded.
 *
 * Uses an in-app modal for project creation (NOT browser prompt()
 * which is unreliable in Electron and appears behind the window).
 */

import React, { useState, useCallback, useEffect } from 'react';

const RECENT_KEY = 'galengine_recent_projects';

export interface WelcomeScreenProps {
  onOpenProject: (path: string) => void;
  onNewProject: (path: string, name: string) => void;
}

// ---------------------------------------------------------------------------
// New Project Modal
// ---------------------------------------------------------------------------

interface NewProjectModalProps {
  onConfirm: (parentDir: string, name: string) => void;
  onCancel: () => void;
  creating: boolean;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  onConfirm,
  onCancel,
  creating,
}) => {
  const [projectName, setProjectName] = useState('my-visual-novel');
  const [parentDir, setParentDir] = useState('');
  const [error, setError] = useState('');
  const [loadingDir, setLoadingDir] = useState(false);

  // Auto-populate parent dir from Electron homeDir on mount
  useEffect(() => {
    (async () => {
      const api = (window as any).galengine;
      if (api) {
        try {
          const home = await api.platform.homeDir;
          setParentDir(home);
        } catch {
          setParentDir('C:\\Projects');
        }
      } else {
        setParentDir('C:\\Projects');
      }
    })();
  }, []);

  const handleBrowse = useCallback(async () => {
    setLoadingDir(true);
    setError('');
    try {
      const api = (window as any).galengine;
      if (api?.dialog) {
        // Ask user to pick a parent directory via "save" as path hint
        // Electron doesn't have a direct directory picker via IPC in this setup,
        // so we use the save dialog as a proxy — user navigates to target and
        // the returned path's parent becomes our parentDir.
        const picked = await api.dialog.saveFile(
          projectName || 'new_project',
        );
        if (picked) {
          // Extract directory part
          const sep = (await api.platform.pathSep) || '\\';
          const lastSep = picked.lastIndexOf(sep);
          const dir = lastSep >= 0 ? picked.slice(0, lastSep) : picked;
          setParentDir(dir);
        }
      }
    } catch (err: any) {
      setError(`Browse failed: ${err?.message || err}`);
    } finally {
      setLoadingDir(false);
    }
  }, [projectName]);

  const handleSubmit = useCallback(() => {
    const name = projectName.trim();
    if (!name) {
      setError('Please enter a project name.');
      return;
    }
    if (!/^[a-zA-Z0-9_\-. ]+$/.test(name)) {
      setError('Project name can only contain letters, numbers, spaces, hyphens, underscores and dots.');
      return;
    }
    if (!parentDir.trim()) {
      setError('Please select a parent directory.');
      return;
    }
    setError('');
    onConfirm(parentDir.trim(), name);
  }, [projectName, parentDir, onConfirm]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !creating) {
        handleSubmit();
      }
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [handleSubmit, onCancel, creating],
  );

  return (
    <div className="newproject-overlay" onClick={onCancel}>
      <div
        className="newproject-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 className="newproject-title">Create New Project</h2>

        <div className="newproject-field">
          <label className="newproject-label">Project Name</label>
          <input
            className="newproject-input"
            type="text"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              setError('');
            }}
            placeholder="my-visual-novel"
            autoFocus
            disabled={creating}
          />
        </div>

        <div className="newproject-field">
          <label className="newproject-label">Parent Directory</label>
          <div className="newproject-dir-row">
            <input
              className="newproject-input"
              type="text"
              value={parentDir}
              onChange={(e) => {
                setParentDir(e.target.value);
                setError('');
              }}
              placeholder="C:\Projects"
              disabled={creating}
            />
            <button
              className="newproject-browse-btn"
              onClick={handleBrowse}
              disabled={creating || loadingDir}
            >
              {loadingDir ? '...' : 'Browse'}
            </button>
          </div>
        </div>

        {error && <p className="newproject-error">{error}</p>}

        <p className="newproject-hint">
          Will be created as: {parentDir || '(select directory)'}\{projectName || '(name)'}
        </p>

        <div className="newproject-actions">
          <button
            className="newproject-btn newproject-btn-cancel"
            onClick={onCancel}
            disabled={creating}
          >
            Cancel
          </button>
          <button
            className="newproject-btn newproject-btn-create"
            onClick={handleSubmit}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// WelcomeScreen
// ---------------------------------------------------------------------------

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onOpenProject,
  onNewProject,
}) => {
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load recent projects
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        setRecentProjects((JSON.parse(raw) as string[]).filter(Boolean));
      }
    } catch { /* ignore */ }
  }, []);

  // --- New Project ---
  const handleNewProjectClick = useCallback(() => {
    setShowNewProjectModal(true);
  }, []);

  const handleNewProjectCancel = useCallback(() => {
    setShowNewProjectModal(false);
  }, []);

  const handleNewProjectConfirm = useCallback(
    async (parentDir: string, name: string) => {
      setCreating(true);
      try {
        const fullPath = `${parentDir}\\${name}`;
        onNewProject(fullPath, name);
        addRecent(fullPath);
        setRecentProjects(getRecent());
        setShowNewProjectModal(false);
      } catch (err) {
        console.error('New project failed:', err);
      } finally {
        setCreating(false);
      }
    },
    [onNewProject],
  );

  // --- Open Project ---
  const handleOpenProject = useCallback(async () => {
    const api = (window as any).galengine;
    if (api) {
      try {
        const result = await api.dialog.openFile({
          filters: [{ name: 'settings.json', extensions: ['json'] }],
        });
        if (result) {
          const projectDir = result.replace(/[\\/]settings\.json$/i, '');
          onOpenProject(projectDir);
          addRecent(projectDir);
          setRecentProjects(getRecent());
        }
      } catch {
        // dialog cancelled or unavailable
      }
    } else {
      const path = prompt('Enter project path:');
      if (path) {
        onOpenProject(path);
        addRecent(path);
        setRecentProjects(getRecent());
      }
    }
  }, [onOpenProject]);

  // --- Recent ---
  const handleOpenRecent = useCallback(
    (path: string) => {
      onOpenProject(path);
      addRecent(path);
      setRecentProjects(getRecent());
    },
    [onOpenProject],
  );

  const handleClearRecent = useCallback(() => {
    localStorage.removeItem(RECENT_KEY);
    setRecentProjects([]);
  }, []);

  const hasElectron = !!(window as any).galengine;

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-header">
          <h1 className="welcome-logo">GalEngine</h1>
          <p className="welcome-subtitle">Visual Novel Engine &amp; IDE</p>
          <p className="welcome-version">v0.2.0</p>
        </div>

        <div className="welcome-actions">
          <button
            className="welcome-btn welcome-btn-primary"
            onClick={handleNewProjectClick}
          >
            <span className="welcome-btn-icon">+</span>
            <span className="welcome-btn-label">New Project</span>
            <span className="welcome-btn-shortcut">Ctrl+N</span>
          </button>

          <button
            className="welcome-btn"
            onClick={handleOpenProject}
          >
            <span className="welcome-btn-icon">&#x1F4C2;</span>
            <span className="welcome-btn-label">Open Project</span>
            <span className="welcome-btn-shortcut">Ctrl+O</span>
          </button>
        </div>

        {recentProjects.length > 0 && (
          <div className="welcome-recent">
            <div className="welcome-recent-header">
              <h3>Recent Projects</h3>
              <button className="welcome-clear-btn" onClick={handleClearRecent}>
                Clear
              </button>
            </div>
            <div className="welcome-recent-list">
              {recentProjects.slice(0, 10).map((p) => (
                <button
                  key={p}
                  className="welcome-recent-item"
                  onClick={() => handleOpenRecent(p)}
                  title={p}
                >
                  <span className="welcome-recent-icon">&#x1F4C1;</span>
                  <span className="welcome-recent-name">
                    {p.split('\\').pop() || p.split('/').pop() || p}
                  </span>
                  <span className="welcome-recent-path">{p}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!hasElectron && (
          <p className="welcome-note">
            Running in browser mode. File system features require the Electron desktop app.
          </p>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          onConfirm={handleNewProjectConfirm}
          onCancel={handleNewProjectCancel}
          creating={creating}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function addRecent(path: string): void {
  const list = getRecent().filter((p) => p !== path);
  list.unshift(path);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 20)));
}
