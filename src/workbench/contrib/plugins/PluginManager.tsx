/**
 * PluginManager — Workbench panel for managing plugins.
 *
 * Features:
 *   - List installed plugins with status (enabled/disabled/error)
 *   - Install from .galplugin file
 *   - Enable / Disable toggle
 *   - Uninstall with confirmation
 *   - Show plugin details (manifest, contributed commands)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { getPluginHost, type PluginDescriptor } from '../../../platform/plugin/PluginHost';

export const PluginManager: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginDescriptor[]>([]);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Refresh plugin list
  const refresh = useCallback(() => {
    try {
      const host = getPluginHost();
      setPlugins([...host.descriptors.values()]);
    } catch {
      // PluginHost not yet initialized
      setPlugins([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Toggle enable/disable
  const handleToggle = useCallback(async (id: string) => {
    const host = getPluginHost();
    const desc = host.getDescriptor(id);
    if (desc?.enabled) {
      await host.deactivate(id);
    } else {
      await host.activate(id);
    }
    refresh();
  }, [refresh]);

  // Uninstall
  const handleUninstall = useCallback((id: string) => {
    if (!confirm(`Uninstall plugin "${id}"? This cannot be undone.`)) return;
    const host = getPluginHost();
    host.uninstall(id);
    refresh();
  }, [refresh]);

  // Install from file
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInstalling(true);
    setInstallError(null);

    try {
      // Read file as text (simplified — real impl would unzip .galplugin)
      const text = await file.text();

      // Parse: first JSON chunk is manifest, rest is code
      // Format: ---MANIFEST---\n{...}\n---CODE---\n...
      let manifest: any;
      let code: string;

      if (text.includes('---MANIFEST---')) {
        const parts = text.split('---CODE---');
        const manifestStr = parts[0].replace('---MANIFEST---', '').trim();
        manifest = JSON.parse(manifestStr);
        code = parts[1]?.trim() ?? '';
      } else {
        // Assume whole file is code + manifest embedded
        const match = text.match(/\/\*\s*manifest\s*\*\/([\s\S]*?)\/\*\s*end-manifest\s*\*\//);
        if (match) {
          manifest = JSON.parse(match[1]);
          code = text.replace(match[0], '').trim();
        } else {
          throw new Error('Invalid plugin format. Expected MANIFEST/CODE sections or /* manifest */ comment.');
        }
      }

      if (!manifest.name || !manifest.version) {
        throw new Error('Plugin manifest missing required fields (name, version).');
      }

      const host = getPluginHost();
      host.install(manifest, code);
      refresh();
    } catch (e) {
      setInstallError((e as Error).message);
    } finally {
      setInstalling(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [refresh]);

  return (
    <div className="plugin-manager">
      {/* Header */}
      <div className="plugin-manager-header">
        <span className="plugin-manager-title">Plugins</span>
        <div className="plugin-manager-actions">
          <button
            className="plugin-install-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={installing}
          >
            {installing ? 'Installing...' : '+ Install'}
          </button>
          <button className="plugin-refresh-btn" onClick={refresh} title="Refresh">
            ↻
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".galplugin,.js"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Error */}
      {installError && (
        <div className="plugin-error">
          {installError}
          <button onClick={() => setInstallError(null)}>×</button>
        </div>
      )}

      {/* Plugin list */}
      <div className="plugin-list">
        {plugins.length === 0 ? (
          <div className="plugin-empty">
            <p>No plugins installed.</p>
            <p className="plugin-empty-hint">
              Click "+ Install" to add a .galplugin file,<br />
              or create one with manifest + code.
            </p>
          </div>
        ) : (
          plugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              onToggle={() => handleToggle(plugin.id)}
              onUninstall={() => handleUninstall(plugin.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="plugin-manager-footer">
        <span>{plugins.length} plugin{plugins.length !== 1 ? 's' : ''}</span>
        <span>{plugins.filter((p) => p.enabled).length} active</span>
      </div>
    </div>
  );
};

// =========================================================================
// PluginCard
// =========================================================================

const PluginCard: React.FC<{
  plugin: PluginDescriptor;
  onToggle: () => void;
  onUninstall: () => void;
}> = ({ plugin, onToggle, onUninstall }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = () => {
    if (plugin.errors.length > 0) return '#ff6666';
    if (plugin.enabled) return '#75b798';
    return 'var(--text-muted)';
  };

  const getStatusLabel = () => {
    if (plugin.errors.length > 0) return 'Error';
    if (plugin.enabled) return 'Active';
    return 'Disabled';
  };

  return (
    <div className={`plugin-card ${plugin.enabled ? 'plugin-enabled' : ''}`}>
      <div className="plugin-card-main" onClick={() => setExpanded(!expanded)}>
        <div className="plugin-card-left">
          <span className="plugin-card-name">{plugin.manifest.name}</span>
          <span className="plugin-card-version">v{plugin.manifest.version}</span>
          <span className="plugin-card-status" style={{ color: getStatusColor() }}>
            ● {getStatusLabel()}
          </span>
        </div>
        <div className="plugin-card-right">
          <button
            className="plugin-toggle-btn"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
          >
            {plugin.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            className="plugin-remove-btn"
            onClick={(e) => { e.stopPropagation(); onUninstall(); }}
            title="Uninstall"
          >
            ×
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="plugin-card-details">
          <div className="plugin-detail-row">
            <label>Main:</label>
            <span>{plugin.manifest.main}</span>
          </div>
          {plugin.manifest.activationEvents?.length > 0 && (
            <div className="plugin-detail-row">
              <label>Activates on:</label>
              <span>{plugin.manifest.activationEvents.join(', ')}</span>
            </div>
          )}
          {plugin.manifest.contributes?.commands && (
            <div className="plugin-detail-row">
              <label>Commands:</label>
              <span>{plugin.manifest.contributes.commands.map((c) => c.title).join(', ')}</span>
            </div>
          )}
          {plugin.errors.length > 0 && (
            <div className="plugin-detail-errors">
              {plugin.errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
