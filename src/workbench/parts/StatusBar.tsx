import React from 'react';

export const StatusBar: React.FC = () => {
  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <span className="status-item">main</span>
      </div>
      <div className="statusbar-right">
        <span className="status-item">Ln 1, Col 1</span>
        <span className="status-item">UTF-8</span>
        <span className="status-item">JSON</span>
      </div>
    </div>
  );
};
