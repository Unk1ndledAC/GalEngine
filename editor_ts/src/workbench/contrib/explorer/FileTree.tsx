/**
 * File Tree — Project Explorer sidebar with real file-system access.
 *
 * Features:
 *   - Browse project directory structure
 *   - Click to open files in Monaco Editor
 *   - Right-click context menu: New File, Delete
 *   - Toolbar: New File, New Folder, Refresh
 *   - File type icons
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditorStore } from '../editor/EditorStore';
import { useProjectStore } from '../project/ProjectStore';
import { getElectronVFS } from '@platform/electron-vfs';
import { useTranslation } from '@i18n/useTranslation';

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

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: TreeNode | null; // null = context menu on empty space (root)
}

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
  const [newFileParent, setNewFileParent] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<TreeNode | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, node: null,
  });
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const openFile = useEditorStore((s) => s.openFile);
  const vfs = getElectronVFS();
  const { t } = useTranslation();

  // Load root directory
  const loadRoot = useCallback(async (rootPath: string) => {
    setLoading(true);
    try {
      const entries = await vfs.listDirDetailed(rootPath);
      const nodes: TreeNode[] = entries.map((e) => ({
        name: e.name,
        path: `${rootPath}\\${e.name}`,
        isDirectory: e.isDirectory,
        loaded: false,
      }));
      setRootNodes(sortNodes(nodes, sortBy));
      setExpanded(new Set([rootPath]));
    } catch (err) {
      console.error('Failed to load project tree:', err);
      // Fallback to legacy listDir + stat
      try {
        const entries = await loadLegacy(rootPath);
        const nodes: TreeNode[] = entries.map((e) => ({
          name: e.name,
          path: `${rootPath}\\${e.name}`,
          isDirectory: e.isDirectory,
          loaded: false,
        }));
        setRootNodes(sortNodes(nodes, sortBy));
        setExpanded(new Set([rootPath]));
      } catch (err2) {
        console.error('Legacy fallback also failed:', err2);
      }
    } finally {
      setLoading(false);
    }
  }, [sortBy, vfs]);

  // Load children of a directory node
  const loadChildren = useCallback(async (node: TreeNode): Promise<TreeNode[]> => {
    try {
      const entries = await vfs.listDirDetailed(node.path);
      return sortNodes(entries.map((e) => ({
        name: e.name,
        path: `${node.path}\\${e.name}`,
        isDirectory: e.isDirectory,
        loaded: false,
      })), sortBy);
    } catch {
      return loadLegacyChildren(node.path).then((entries) =>
        sortNodes(entries.map((e) => ({
          name: e.name,
          path: `${node.path}\\${e.name}`,
          isDirectory: e.isDirectory,
          loaded: false,
        })), sortBy)
      );
    }
  }, [sortBy, vfs]);

  // Reload children of a specific node (for after CRUD operations)
  const reloadNodeChildren = useCallback(async (nodePath: string) => {
    const children = await loadChildren({ name: '', path: nodePath, isDirectory: true, loaded: false });
    setRootNodes((prev) => updateNode(prev, nodePath, { children, loaded: true }));
  }, [loadChildren]);

  // Toggle expand/collapse
  const handleToggle = useCallback(async (node: TreeNode) => {
    if (expanded.has(node.path)) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(node.path);
        return next;
      });
    } else {
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

  // ---- Context Menu ----

  const handleContextMenu = useCallback((e: React.MouseEvent, node: TreeNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, node });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // Close context menu on any click outside
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handler = () => closeContextMenu();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu.visible, closeContextMenu]);

  // ---- New File ----

  const startNewFile = useCallback((parentNode: TreeNode | null) => {
    closeContextMenu();
    const parentPath = parentNode?.path || projectPath;
    if (!parentPath) return;
    // If target is a file, use its parent directory
    const targetPath = parentNode && !parentNode.isDirectory
      ? parentPath.substring(0, parentPath.lastIndexOf('\\'))
      : parentPath;
    setNewFileParent(targetPath);
    setNewFileName('');
    setTimeout(() => newFileInputRef.current?.focus(), 50);
  }, [closeContextMenu, projectPath]);

  const confirmNewFile = useCallback(async () => {
    if (!newFileParent || !newFileName.trim()) {
      setNewFileParent(null);
      return;
    }
    const name = newFileName.trim();
    const fullPath = `${newFileParent}\\${name}`;
    try {
      await vfs.writeTextFile(fullPath, '');
      // Refresh the parent node
      if (newFileParent === projectPath) {
        loadRoot(projectPath);
      } else {
        reloadNodeChildren(newFileParent);
        setExpanded((prev) => new Set([...prev, newFileParent]));
      }
    } catch (err) {
      console.error('Failed to create file:', err);
    }
    setNewFileParent(null);
    setNewFileName('');
  }, [newFileParent, newFileName, vfs, projectPath, loadRoot]);

  const cancelNewFile = useCallback(() => {
    setNewFileParent(null);
    setNewFileName('');
  }, []);

  // Handle Enter/Escape in new-file input
  const handleNewFileKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirmNewFile();
    if (e.key === 'Escape') cancelNewFile();
  }, [confirmNewFile, cancelNewFile]);

  // ---- Delete ----

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm || !projectPath) return;
    try {
      await vfs.delete(deleteConfirm.path);
      loadRoot(projectPath);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
    setDeleteConfirm(null);
  }, [deleteConfirm, vfs, projectPath, loadRoot]);

  // ---- Toolbar actions ----

  const handleToolbarNewFile = useCallback(() => {
    startNewFile(null); // root level
  }, [startNewFile]);

  const handleToolbarNewFolder = useCallback(async () => {
    if (!projectPath) return;
    const name = 'new-folder';
    let folderPath = `${projectPath}\\${name}`;
    let counter = 1;
    while (await vfs.exists(folderPath)) {
      folderPath = `${projectPath}\\${name}-${counter}`;
      counter++;
    }
    try {
      await vfs.mkdir(folderPath);
      loadRoot(projectPath);
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  }, [projectPath, vfs, loadRoot]);

  // Open project dialog
  const handleOpenProject = useCallback(async () => {
    if (!window.galengine) return;
    const dirPath = await window.galengine.dialog.openFile({
      filters: [{ name: 'Project Directory', extensions: ['*'] }],
    });
    if (dirPath) {
      setProjectPath(dirPath);
      loadRoot(dirPath);
    }
  }, [loadRoot]);

  // Refresh current tree
  const handleRefresh = useCallback(() => {
    if (projectPath) loadRoot(projectPath);
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

  // Re-sort when sortBy changes (no refetch needed)
  useEffect(() => {
    setRootNodes((prev) => sortNodes(prev, sortBy));
  }, [sortBy]);

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
          <span className="tree-title">{t('filetree.title')}</span>
        </div>
        <div className="tree-empty">
          <p>{t('filetree.noProject')}</p>
          <p className="muted">{t('filetree.openHint')}</p>
          <button
            className="btn-secondary"
            onClick={handleOpenProject}
            style={{ marginTop: 12 }}
          >
            {t('filetree.openProject')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-tree" onContextMenu={(e) => { e.preventDefault(); }}>
      <div className="tree-toolbar">
        <span className="tree-title">
          {projectPath.split('\\').pop() || projectPath}
        </span>
        <div className="tree-actions">
          <button className="tree-action-btn" onClick={handleToolbarNewFile} title={t('filetree.newFile')}>+</button>
          <button className="tree-action-btn" onClick={handleToolbarNewFolder} title={t('filetree.newFolder')}>&#128193;</button>
          <button className="tree-action-btn" onClick={handleRefresh} title={t('filetree.refresh')} disabled={loading}>↻</button>
          <select
            className="tree-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as TreeSort)}
            title={t('filetree.sortByName')}
          >
            <option value="name">{t('filetree.sortByName')}</option>
            <option value="type">{t('filetree.sortByType')}</option>
          </select>
        </div>
      </div>

      <div className="tree-container">
        {loading ? (
          <div className="tree-loading">{t('filetree.loading')}</div>
        ) : (
          <TreeList
            nodes={rootNodes}
            expanded={expanded}
            onToggle={handleToggle}
            onFileClick={handleFileClick}
            onContextMenu={handleContextMenu}
            depth={0}
            newFileParent={newFileParent}
            newFileName={newFileName}
            onNewFileNameChange={setNewFileName}
            onNewFileKeyDown={handleNewFileKeyDown}
            newFileInputRef={newFileInputRef}
            filenamePlaceholder={t('filetree.filenamePlaceholder')}
          />
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="tree-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="tree-context-item"
            onClick={() => startNewFile(contextMenu.node)}
          >
            {t('filetree.contextNewFile')}
          </button>
          {contextMenu.node && (
            <button
              className="tree-context-item tree-context-item-danger"
              onClick={() => {
                closeContextMenu();
                setDeleteConfirm(contextMenu.node);
              }}
            >
              {t('filetree.contextDelete')} "{contextMenu.node.name}"
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="tree-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="tree-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="tree-dialog-title">{t('filetree.delete')}</p>
            <p className="tree-dialog-msg">
              {t('filetree.confirmDelete')} <strong>"{deleteConfirm.name}"</strong>?
              {deleteConfirm.isDirectory && ` ${t('filetree.confirmDeleteDir')}`}
            </p>
            <p className="tree-dialog-path">{deleteConfirm.path}</p>
            <div className="tree-dialog-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>{t('filetree.cancel')}</button>
              <button className="tree-btn-danger" onClick={confirmDelete}>{t('filetree.delete')}</button>
            </div>
          </div>
        </div>
      )}
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
  onContextMenu: (e: React.MouseEvent, node: TreeNode | null) => void;
  depth: number;
  newFileParent: string | null;
  newFileName: string;
  onNewFileNameChange: (v: string) => void;
  onNewFileKeyDown: (e: React.KeyboardEvent) => void;
  newFileInputRef: React.RefObject<HTMLInputElement | null>;
  filenamePlaceholder: string;
}

const TreeList: React.FC<TreeListProps> = ({
  nodes,
  expanded,
  onToggle,
  onFileClick,
  onContextMenu,
  depth,
  newFileParent,
  newFileName,
  onNewFileNameChange,
  onNewFileKeyDown,
  newFileInputRef,
  filenamePlaceholder,
}) => {
  return (
    <>
      {nodes.map((node) => (
        <React.Fragment key={node.path}>
          <div
            className={`tree-item ${node.isDirectory ? 'directory' : 'file'}`}
            style={{ paddingLeft: 12 + depth * 16 }}
            onClick={() => onFileClick(node)}
            onContextMenu={(e) => onContextMenu(e, node)}
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
              onContextMenu={onContextMenu}
              depth={depth + 1}
              newFileParent={newFileParent}
              newFileName={newFileName}
              onNewFileNameChange={onNewFileNameChange}
              onNewFileKeyDown={onNewFileKeyDown}
              newFileInputRef={newFileInputRef}
              filenamePlaceholder={filenamePlaceholder}
            />
          )}
      {/* New file inline input */}
      {newFileParent === node.path && (
        <div style={{ paddingLeft: 12 + (depth + 1) * 16 }}>
          <input
            ref={newFileInputRef as React.RefObject<HTMLInputElement>}
            className="tree-new-file-input"
            type="text"
            value={newFileName}
            placeholder={filenamePlaceholder}
            onChange={(e) => onNewFileNameChange(e.target.value)}
            onKeyDown={onNewFileKeyDown}
            onBlur={() => {
              if (!newFileName.trim()) {
                onNewFileKeyDown({ key: 'Escape' } as React.KeyboardEvent);
              }
            }}
          />
        </div>
      )}
        </React.Fragment>
      ))}
      {/* New file at root level */}
      {newFileParent && depth === 0 && nodes.length === 0 && (
        <div style={{ paddingLeft: 12 }}>
          <input
            ref={newFileInputRef as React.RefObject<HTMLInputElement>}
            className="tree-new-file-input"
            type="text"
            value={newFileName}
            placeholder={filenamePlaceholder}
            onChange={(e) => onNewFileNameChange(e.target.value)}
            onKeyDown={onNewFileKeyDown}
          />
        </div>
      )}
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

/** Legacy fallback: listDir + stat for each file (slow, used when listDirDetailed unavailable). */
async function loadLegacy(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
  const vfs = getElectronVFS();
  const names = await vfs.listDir(dirPath);
  const results: { name: string; isDirectory: boolean }[] = [];
  for (const name of names) {
    try {
      const s = await vfs.stat(`${dirPath}\\${name}`);
      results.push({ name, isDirectory: s.isDirectory });
    } catch { /* skip */ }
  }
  return results;
}

async function loadLegacyChildren(dirPath: string): Promise<{ name: string; isDirectory: boolean }[]> {
  return loadLegacy(dirPath);
}
