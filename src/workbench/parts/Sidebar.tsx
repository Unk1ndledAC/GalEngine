import React from 'react';
import type { SidebarView } from '../App';
import { FileTree } from '../contrib/explorer/FileTree';
import { PluginManager } from '../contrib/plugins/PluginManager';
import { LLMPanel } from '../contrib/llm/LLMPanel';
import { DebugPanel } from '../contrib/debug/DebugPanel';
import { SearchPanel } from '../contrib/search/SearchPanel';

interface Props {
  activeView: SidebarView;
  onCloseSearch?: () => void;
}

export const Sidebar: React.FC<Props> = ({ activeView, onCloseSearch }) => {
  const renderView = () => {
    switch (activeView) {
      case 'explorer': return <FileTree />;
      case 'plugins':  return <PluginManager />;
      case 'llm':      return <LLMPanel />;
      case 'debug':    return <DebugPanel />;
      case 'search':   return <SearchPanel onClose={onCloseSearch ?? (() => {})} />;
      default:         return <div className="sidebar-empty">Select a view</div>;
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">{activeView.toUpperCase()}</div>
      <div className="sidebar-content">{renderView()}</div>
    </div>
  );
};
