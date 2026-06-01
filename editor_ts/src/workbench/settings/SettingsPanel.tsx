/**
 * SettingsPanel — Modal popup for editor settings.
 *
 * Controls:
 *   - Auto-save toggle + delay input
 *   - Language selector
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore, type Language } from './SettingsStore';
import { useTranslation } from '@i18n/useTranslation';

interface SettingsPanelProps {
  onClose: () => void;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  'zh-CN': '\u7b80\u4f53\u4e2d\u6587 (Chinese)',
  'ja-JP': '\u65e5\u672c\u8a9e (Japanese)',
  'en-US': 'English',
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const autoSave = useSettingsStore((s) => s.autoSave);
  const language = useSettingsStore((s) => s.language);
  const setAutoSaveEnabled = useSettingsStore((s) => s.setAutoSaveEnabled);
  const setAutoSaveDelay = useSettingsStore((s) => s.setAutoSaveDelay);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const { t } = useTranslation();

  const [delayInput, setDelayInput] = useState(String(autoSave.delay / 1000));

  // Sync delay input when store changes externally
  useEffect(() => {
    setDelayInput(String(autoSave.delay / 1000));
  }, [autoSave.delay]);

  const handleDelayChange = (value: string) => {
    setDelayInput(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      setAutoSaveDelay(num * 1000);
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">{t('settings.title')}</h2>
          <button className="settings-close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Auto-Save Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t('settings.autoSave')}</h3>
          <div className="settings-row">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={autoSave.enabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              />
              <span>{t('settings.autoSaveEnable')}</span>
            </label>
          </div>
          <div className="settings-row">
            <label className="settings-label">
              {t('settings.autoSaveDelay')}
            </label>
            <input
              type="number"
              className="settings-input settings-input-narrow"
              value={delayInput}
              min={1}
              max={60}
              disabled={!autoSave.enabled}
              onChange={(e) => handleDelayChange(e.target.value)}
            />
          </div>
          {autoSave.enabled && (
            <p className="settings-hint">
              {t('settings.autoSaveHint')}
            </p>
          )}
        </div>

        {/* Language Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t('settings.language')}</h3>
          <div className="settings-row">
            <select
              className="settings-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <p className="settings-hint">
            {t('settings.languageHint')}
          </p>
        </div>

        <div className="settings-footer">
          <button className="settings-btn-close" onClick={onClose}>{t('settings.close')}</button>
        </div>
      </div>
    </div>
  );
};
