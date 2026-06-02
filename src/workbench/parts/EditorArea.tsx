/**
 * EditorArea — Main editor panel with tab management.
 *
 * Supports:
 *   - Code tabs (Monaco Editor for JSON/MD files)
 *   - Preview tab (Canvas2D game preview)
 *   - Welcome screen (when no project is open)
 */

import React, { useCallback, useState } from 'react';
import { useEditorStore } from '../contrib/editor/EditorStore';
import { MonacoEditor } from '../contrib/editor/MonacoEditor';
import { PreviewPanel } from '../contrib/preview/PreviewPanel';
import { WelcomeScreen } from '../contrib/welcome/WelcomeScreen';
import { useTranslation } from '@i18n/useTranslation';
import type { VFS } from '../../engine/loader';

const PREVIEW_TAB_ID = '__galengine_preview__';

interface EditorAreaProps {
  projectPath: string | null;
  vfs?: VFS;
  onNewProject: (path: string, name: string) => void;
  onOpenProject: (path: string) => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  projectPath,
  vfs,
  onNewProject,
  onOpenProject,
}) => {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const dirtyFiles = useEditorStore((s) => s.dirtyFiles);
  const setActive = useEditorStore((s) => s.setActive);
  const closeFile = useEditorStore((s) => s.closeFile);

  const [showPreview, setShowPreview] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const { t } = useTranslation();

  const handleTabClose = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      closeFile(path);
    },
    [closeFile]
  );

  const handlePreviewClick = useCallback(() => {
    if (!projectPath || !vfs) return;
    if (previewActive) {
      // Toggle preview OFF — switch back to code editor
      setPreviewActive(false);
    } else {
      setShowPreview(true);
      setPreviewActive(true);
      setActive(''); // deselect code tabs
    }
  }, [projectPath, vfs, previewActive, setActive]);

  const handleCodeTabClick = useCallback((tabId: string) => {
    setPreviewActive(false);
    setActive(tabId);
  }, [setActive]);

  // --- Welcome Screen (no project open) ---
  if (!projectPath) {
    return (
      <div className="editor-area">
        <WelcomeScreen
          onNewProject={onNewProject}
          onOpenProject={onOpenProject}
        />
      </div>
    );
  }

  // --- No tabs open but project loaded ---
  if (tabs.length === 0 && !showPreview) {
    return (
      <div className="editor-area">
        <div className="monaco-placeholder">
          <div className="monaco-empty-icon">📁</div>
          <p>{t('editor.project')} {projectPath.split('\\').pop() || projectPath}</p>
          <p className="muted">
            {t('editor.clickToOpen')}
          </p>
        </div>
      </div>
    );
  }

  const isCodeActive = !previewActive && activeTabId !== '';

  return (
    <div className="editor-area">
      {/* Tab bar */}
      <div className="editor-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`editor-tab ${tab.id === activeTabId && !previewActive ? 'active' : ''}`}
            onClick={() => handleCodeTabClick(tab.id)}
            title={tab.path}
          >
            <span className="tab-icon">
              {tab.language === 'json' ? '{}' : tab.language === 'markdown' ? 'MD' : '📋'}
            </span>
            <span className="tab-name">
              {tab.name}
              {dirtyFiles.has(tab.path) && ' \u25CF'}
            </span>
            <button
              className="tab-close"
              onClick={(e) => handleTabClose(e, tab.id)}
              title={t('editor.closeTab')}
            >
              ×
            </button>
          </div>
        ))}

        {/* Preview toggle button */}
        {projectPath && vfs && (
          <div className="editor-tab-right">
            <button
              className={`preview-toggle-btn ${previewActive ? 'active' : ''}`}
              onClick={handlePreviewClick}
              title={previewActive ? t('editor.closePreview') : t('editor.previewGame')}
            >
              {previewActive ? t('editor.closePreviewBtn') : t('editor.previewBtn')}
            </button>
          </div>
        )}
      </div>

      {/* Editor content */}
      <div className="editor-content">
        {showPreview && previewActive && projectPath && vfs ? (
          <PreviewPanel
            key={projectPath}
            projectPath={projectPath}
            vfs={vfs}
          />
        ) : (
          <MonacoEditor />
        )}
      </div>
    </div>
  );
};
