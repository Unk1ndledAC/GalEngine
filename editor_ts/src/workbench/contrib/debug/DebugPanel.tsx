/**
 * Debug Panel — scene inspector, variable watch, breakpoints.
 */

import React from 'react';
import { useTranslation } from '@i18n/useTranslation';

export const DebugPanel: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="debug-panel">
      <div className="debug-section">
        <h4>{t('debug.variables')}</h4>
        <p className="muted">{t('debug.noSession')}</p>
      </div>
      <div className="debug-section">
        <h4>{t('debug.breakpoints')}</h4>
        <p className="muted">{t('debug.noBreakpoints')}</p>
      </div>
      <div className="debug-section">
        <h4>{t('debug.callStack')}</h4>
        <p className="muted">{t('debug.notRunning')}</p>
      </div>
    </div>
  );
};
