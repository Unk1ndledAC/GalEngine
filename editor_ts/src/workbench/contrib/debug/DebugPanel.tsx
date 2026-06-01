/**
 * Debug Panel — scene inspector, variable watch, breakpoints.
 */

import React from 'react';

export const DebugPanel: React.FC = () => {
  return (
    <div className="debug-panel">
      <div className="debug-section">
        <h4>Variables</h4>
        <p className="muted">No active game session.</p>
      </div>
      <div className="debug-section">
        <h4>Breakpoints</h4>
        <p className="muted">No breakpoints set.</p>
      </div>
      <div className="debug-section">
        <h4>Call Stack</h4>
        <p className="muted">Not running.</p>
      </div>
    </div>
  );
};
