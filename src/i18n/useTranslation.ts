/**
 * useTranslation — React hook for i18n.
 *
 * Usage:
 *   const { t } = useTranslation();
 *   return <span>{t('filetree.title')}</span>;
 */

import { useCallback } from 'react';
import { useSettingsStore } from '@workbench/settings/SettingsStore';
import translations, { type TranslationKey } from './translations';

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);

  const t = useCallback(
    (key: TranslationKey): string => {
      const langMap = translations[language];
      if (langMap && key in langMap) {
        return langMap[key];
      }
      // Fallback to English
      const enMap = translations['en-US'];
      return enMap[key] ?? key;
    },
    [language]
  );

  return { t, language };
}
