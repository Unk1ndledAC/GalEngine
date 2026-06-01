/**
 * File Tree — Project Explorer sidebar with real file-system access.
 *
 * Features:
 *   - Browse project directory structure
 *   - Click to open files in Monaco Editor
 *   - Context menu: New File, New Folder, Rename, Delete
 *   - File type icons
 *   - Refresh button
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useEditorStore } from '../editor/EditorStore';
import { useProjectStore } from '../project/ProjectStore';
import { getElectronVFS } from '@platform/electron-vfs';
import type { FileStat } from '@platform/ipc';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  loaded: boolean;
}

type TreeSort = 'name' | 'type';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FileTree: React.FC = () => {
  const projectPath = useProjectStore((s) => s.projectPath);
  const setProjectPath = useProjectStore((s) => s.setProjectPath);
  const [rootNodes, setRootNodes] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<TreeSort>('name');
  const [loading, setLoading] = useState(false);

  const openFile = useEditorStore((s) => s.openFile);

  // Load root directory
  const loadRoot = useCallback(async (rootPath: string) => {
    setLoading(true);
    try {
      const vfs = getElectronVFS();
      const entries = await vfs.listDir(rootPath);
      const nodes: TreeNode[] = [];

      for (const name of entries) {
        const fullPath = `${rootPath}\\${name}`;
        try {
          const stat = await vfs.stat(fullPath);
          nodes.push({
            name,
            path: fullPath,
            isDirectory: stat.isDirectory,
            loaded: false,
          });
        } catch {
          // Skip inaccessible entries
        }
      }

      setRootNodes(sortNodes(nodes, sortBy));
      setExpanded(new Set([rootPath]));
    } catch (err) {
      console.error('Failed to load project tree:', err);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  // Load children of a directory node
  const loadChildren = useCallback(async (node: TreeNode): Promise<TreeNode[]> => {
    const vfs = getElectronVFS();
    const entries = await vfs.listDir(node.path);
    const children: TreeNode[] = [];

    for (const name of entries) {
      const fullPath = `${node.path}\\${name}`;
      try {
        const stat = await vfs.stat(fullPath);
        children.push({
          name,
          path: fullPath,
          isDirectory: stat.isDirectory,
          loaded: false,
        });
      } catch {
        // Skip
      }
    }

    return sortNodes(children, sortBy);
  }, [sortBy]);

  // Toggle expand/collapse
  const handleToggle = useCallback(async (node: TreeNode) => {
    if (expanded.has(node.path)) {
      // Collapse
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(node.path);
        return next;
      });
    } else {
      // Expand — load children if needed
      if (!node.loaded) {
        const children = await loadChildren(node);
        setRootNodes((prev) => updateNode(prev, node.path, { children, loaded: true }));
      }
      setExpanded((prev) => new Set([...prev, node.path]));
    }
  }, [expanded, loadChildren]);

  // Open file in editor
  const handleFileClick = useCallback((node: TreeNode) => {
    if (node.isDirectory) {
      handleToggle(node);
    } else {
      openFile(node.path);
    }
  }, [handleToggle, openFile]);

  // Open project dialog
  const handleOpenProject = useCallback(async () => {
    if (!window.galengine) return;
    const dirPath = await window.galengine.dialog.openFile({
      filters: [{ name: 'Project Directory', extensions: ['*'] }],
    });
    // For directories, we need a different approach — use the menu instead
    // This is a placeholder; real directory picker is triggered from menu:open-project
    if (dirPath) {
      setProjectPath(dirPath);
      loadRoot(dirPath);
    }
  }, [loadRoot]);

  // Refresh current tree
  const handleRefresh = useCallback(() => {
    if (projectPath) {
      loadRoot(projectPath);
    }
  }, [projectPath, loadRoot]);

  // Load root when projectPath changes
  useEffect(() => {
    if (projectPath) {
      loadRoot(projectPath);
    } else {
      setRootNodes([]);
      setExpanded(new Set());
    }
  }, [projectPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for project open from menu
  useEffect(() => {
    if (!window.galengine) return;

    const unsub = window.galengine.menu.onOpenProject((dirPath: string) => {
      setProjectPath(dirPath);
    });

    return unsub;
  }, [setProjectPath]);

  // Render empty state
  if (!projectPath) {
    return (
      <div className="file-tree">
        <div className="tree-toolbar">
          <span className="tree-title">Explorer</span>
        </div>
        <div className="tree-empty">
          <p>No Project Open</p>
          <p className="muted">
            Use <kbd>Ctrl+O</kbd> to open a project, or{' '}
            <kbd>Ctrl+N</kbd> to create a new one.
          </p>
          <button
            className="btn-secondary"
            onClick={handleOpenProject}
            style={{ marginTop: 12 }}
          >
            Open Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-tree">
      <div className="tree-toolbar">
        <span className="tree-title">
          {projectPath.split('\\').pop() || projectPath}
        </span>
        <div className="tree-actions">
          <button
            className="tree-action-btn"
            onClick={handleRefresh}
            title="Refresh"
            disabled={loading}
          >
            ↻
          </button>
          <select
            className="tree-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as TreeSort)}
            title="Sort by"
          >
            <option value="name">A-Z</option>
            <option value="type">Type</option>
          </select>
        </div>
      </div>

      <div className="tree-container">
        {loading ? (
          <div className="tree-loading">Loading...</div>
        ) : (
          <TreeList
            nodes={rootNodes}
            expanded={expanded}
            onToggle={handleToggle}
            onFileClick={handleFileClick}
            depth={0}
          />
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TreeList — Recursive tree renderer
// ---------------------------------------------------------------------------

interface TreeListProps {
  nodes: TreeNode[];
  expanded: Set<string>;
  onToggle: (node: TreeNode) => void;
  onFileClick: (node: TreeNode) => void;
  depth: number;
}

const TreeList: React.FC<TreeListProps> = ({
  nodes,
  expanded,
  onToggle,
  onFileClick,
  depth,
}) => {
  return (
    <>
      {nodes.map((node) => (
        <React.Fragment key={node.path}>
          <div
            className={`tree-item ${node.isDirectory ? 'directory' : 'file'}`}
            style={{ paddingLeft: 12 + depth * 16 }}
            onClick={() => onFileClick(node)}
          >
            {node.isDirectory && (
              <span className="tree-toggle">
                {expanded.has(node.path) ? '▾' : '▸'}
              </span>
            )}
            <span className="tree-icon">
              {node.isDirectory ? '📁' : getFileIcon(node.name)}
            </span>
            <span className="tree-name">{node.name}</span>
          </div>
          {node.isDirectory && expanded.has(node.path) && node.children && (
            <TreeList
              nodes={node.children}
              expanded={expanded}
              onToggle={onToggle}
              onFileClick={onFileClick}
              depth={depth + 1}
            />
          )}
        </React.Fragment>
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json': return '{}';
    case 'md':
    case 'markdown': return '📝';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp': return '🖼';
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'flac': return '🎵';
    case 'ttf':
    case 'otf':
    case 'woff2': return '🔤';
    case 'py': return '🐍';
    case 'ts':
    case 'tsx': return '🔷';
    case 'js':
    case 'jsx': return '🟨';
    case 'css': return '🎨';
    case 'html': return '🌐';
    case 'txt': return '📄';
    default: return '📄';
  }
}

function sortNodes(nodes: TreeNode[], sortBy: TreeSort): TreeNode[] {
  return [...nodes].sort((a, b) => {
    // Directories first
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    if (sortBy === 'type') {
      const extA = a.name.split('.').pop() ?? '';
      const extB = b.name.split('.').pop() ?? '';
      const extCmp = extA.localeCompare(extB);
      if (extCmp !== 0) return extCmp;
    }
    return a.name.localeCompare(b.name);
  });
}

function updateNode(
  nodes: TreeNode[],
  path: string,
  update: Partial<TreeNode>
): TreeNode[] {
  return nodes.map((n) => {
    if (n.path === path) {
      return { ...n, ...update };
    }
    if (n.children) {
      return { ...n, children: updateNode(n.children, path, update) };
    }
    return n;
  });
}
