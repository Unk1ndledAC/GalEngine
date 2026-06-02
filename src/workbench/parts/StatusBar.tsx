/**
 * StatusBar — Bottom status bar showing editor state.
 */
import React from 'react';
import { useEditorStore } from '../contrib/editor/EditorStore';
import { useSettingsStore } from '../settings/SettingsStore';
import { useTranslation } from '@i18n/useTranslation';

interface StatusBarProps {
  onOpenSettings?: () => void;
}

const LANGUAGE_SHORT: Record<string, string> = {
  'zh-CN': 'CN',
  'ja-JP': 'JP',
  'en-US': 'EN',
};

export const StatusBar: React.FC<StatusBarProps> = ({ onOpenSettings }) => {
  const tabs = useEditorStore((s) => s.tabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const dirtyFiles = useEditorStore((s) => s.dirtyFiles);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const autoSave = useSettingsStore((s) => s.autoSave);
  const language = useSettingsStore((s) => s.language);

  const dirtyCount = dirtyFiles.size;
  const { t } = useTranslation();

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        {activeTab && (
          <>
            <span className="status-item">
              {activeTab.language.toUpperCase()}
              {dirtyFiles.has(activeTab.path) && ' \u25CF'}
            </span>
          </>
        )}
      </div>
      <div className="statusbar-right">
        {autoSave.enabled && (
          <span className="status-item" title={`${t('statusbar.autosave')}: ${autoSave.delay / 1000}s`}>
            {t('statusbar.autosave')}: {autoSave.delay / 1000}s
          </span>
        )}
        {dirtyCount > 0 && (
          <span className="status-item">{dirtyCount} {t('statusbar.unsaved')}</span>
        )}
        <span className="status-item">{LANGUAGE_SHORT[language] || 'EN'}</span>
        <span className="status-item">{t('statusbar.utf8')}</span>
        {onOpenSettings && (
          <span
            className="status-item settings-gear"
            onClick={onOpenSettings}
            title={t('settings.title')}
            style={{ fontWeight: 'bold', fontSize: '13px' }}
          >
            &#9881;
          </span>
        )}
      </div>
    </div>
  );
};
