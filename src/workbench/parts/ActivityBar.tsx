/**
 * Activity Bar — left icon rail.
 * Pattern: VS Code src/vs/workbench/browser/parts/activitybar/
 */

import React from 'react';
import { Files, Puzzle, Bot, Bug } from 'lucide-react';
import type { SidebarView, BottomPanelView } from '../App';

interface Props {
  activeView: SidebarView;
  onViewClick: (view: SidebarView) => void;
  bottomViews: {
    activeBottom: BottomPanelView;
    onToggle: (view: BottomPanelView) => void;
  };
}

const topItems: { id: SidebarView; icon: React.ReactNode; label: string }[] = [
  { id: 'explorer', icon: <Files size={24} />, label: 'Explorer' },
  { id: 'plugins', icon: <Puzzle size={24} />, label: 'Plugins' },
  { id: 'llm',     icon: <Bot size={24} />,    label: 'LLM Chat' },
  { id: 'debug',   icon: <Bug size={24} />,    label: 'Debug' },
];

export const ActivityBar: React.FC<Props> = ({ activeView, onViewClick }) => {
  return (
    <div className="activitybar">
      <div className="activitybar-top">
        {topItems.map((item) => (
          <button
            key={item.id}
            className={`activitybar-btn ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewClick(item.id)}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div className="activitybar-bottom">
        {/* Settings / Accounts */}
      </div>
    </div>
  );
};
