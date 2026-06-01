/**
 * Renderer entry point — mounts React app into DOM.
 *
 * Also wires up Electron menu events (Ctrl+N / Ctrl+O) so they work
 * regardless of which component is currently rendered.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './workbench/App';
import { useProjectStore } from './workbench/contrib/project/ProjectStore';
import './workbench/styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);

// Initial render
root.render(
  React.createElement(React.StrictMode, null,
    React.createElement(App)
  )
);

// ---------------------------------------------------------------------------
// Wire up Electron menu events to ProjectStore
// (Do this AFTER initial render so the store is ready)
// ---------------------------------------------------------------------------

const galApi = (window as any).galengine;

if (galApi?.menu) {
  // Open Project menu item (Ctrl+O)
  galApi.menu.onOpenProject((dirPath: string) => {
    useProjectStore.getState().setProjectPath(dirPath);
  });

  // New Project — nothing to do on "New" menu click because the dialog
  // flow requires user interaction in the WelcomeScreen. Instead we just
  // ensure the WelcomeScreen is visible.
  galApi.menu.onNewProject(() => {
    // Clear current project to force WelcomeScreen
    useProjectStore.getState().setProjectPath(null);
  });
}
