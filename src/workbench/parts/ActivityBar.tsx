/**
 * Activity Bar — left icon rail.
 * Pattern: VS Code src/vs/workbench/browser/parts/activitybar/
 */

import React from 'react';
import { Files, Puzzle, Bot, Bug, Settings } from 'lucide-react';
import { useTranslation } from '@i18n/useTranslation';
import type { SidebarView, BottomPanelView } from '../App';

interface Props {
  activeView: SidebarView;
  onViewClick: (view: SidebarView) => void;
  bottomViews: {
    activeBottom: BottomPanelView;
    onToggle: (view: BottomPanelView) => void;
  };
  onOpenSettings?: () => void;
}

const topItems: { id: SidebarView; icon: React.ReactNode; labelKey: string }[] = [
  { id: 'explorer', icon: <Files size={24} />, labelKey: 'activitybar.explorer' },
  { id: 'plugins', icon: <Puzzle size={24} />, labelKey: 'activitybar.plugins' },
  { id: 'llm',     icon: <Bot size={24} />,    labelKey: 'activitybar.llm' },
  { id: 'debug',   icon: <Bug size={24} />,    labelKey: 'activitybar.debug' },
];

export const ActivityBar: React.FC<Props> = ({ activeView, onViewClick, onOpenSettings }) => {
  const { t } = useTranslation();

  return (
    <div className="activitybar">
      <div className="activitybar-top">
        {topItems.map((item) => (
          <button
            key={item.id}
            className={`activitybar-btn ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewClick(item.id)}
            title={t(item.labelKey as any)}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div className="activitybar-bottom">
        {onOpenSettings && (
          <button
            className="activitybar-btn"
            onClick={onOpenSettings}
            title={t('settings.title')}
          >
            <Settings size={24} />
          </button>
        )}
      </div>
    </div>
  );
};
