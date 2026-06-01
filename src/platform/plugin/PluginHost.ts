/**
 * PluginHost — Plugin lifecycle manager.
 *
 * Loads .galplugin packages (zip with manifest.json + main.js).
 * Provides sandboxed API to plugins for extending the workbench.
 *
 * Pattern: VS Code Extension Host (simplified)
 */

import type { PluginManifest, PluginAPI } from '../../engine/types';
import type { Disposable } from '../../base/event';
import { Emitter } from '../../base/event';

// =========================================================================
// Types
// =========================================================================

export interface PluginDescriptor {
  id: string;
  manifest: PluginManifest;
  packagePath: string;
  sourcePath: string;
  enabled: boolean;
  errors: string[];
}

type PluginModule = { activate: (api: PluginAPI) => Promise<void> | void; deactivate?: () => void };

// =========================================================================
// PluginHost
// =========================================================================

export class PluginHost {
  private _plugins = new Map<string, PluginDescriptor>();
  private _modules = new Map<string, PluginModule>();
  private _api: PluginAPI;
  private _registry = {
    commands: new Map<string, () => void>(),
    views: new Map<string, unknown>(),
  };

  private readonly _onPluginActivated = new Emitter<string>();
  readonly onPluginActivated = this._onPluginActivated.event;

  private readonly _onPluginDeactivated = new Emitter<string>();
  readonly onPluginDeactivated = this._onPluginDeactivated.event;

  private readonly _onPluginError = new Emitter<{ pluginId: string; error: string }>();
  readonly onPluginError = this._onPluginError.event;

  constructor(api: PluginAPI) {
    this._api = api;
  }

  // ---- CRUD ----

  get descriptors(): ReadonlyMap<string, PluginDescriptor> {
    return this._plugins;
  }

  getDescriptor(id: string): PluginDescriptor | undefined {
    return this._plugins.get(id);
  }

  /** Install a plugin from source JS string + manifest. */
  install(manifest: PluginManifest, sourceCode: string, packagePath?: string): PluginDescriptor {
    const descriptor: PluginDescriptor = {
      id: manifest.name,
      manifest,
      packagePath: packagePath ?? `~/.galengine/plugins/${manifest.name}`,
      sourcePath: `${manifest.name}/main.js`,
      enabled: false,
      errors: [],
    };

    this._plugins.set(manifest.name, descriptor);

    try {
      // Create sandboxed module
      const moduleFn = new Function('require', 'module', 'exports', sourceCode);
      const mod = { exports: {} as PluginModule };
      // Minimal require for plugins (no filesystem access)
      const mockRequire = (name: string) => {
        if (name === 'galengine') return this._api;
        throw new Error(`Plugin "${manifest.name}" tried to require("${name}"), which is not allowed.`);
      };
      moduleFn(mockRequire, mod, mod.exports);
      this._modules.set(manifest.name, mod.exports);
    } catch (e) {
      descriptor.errors.push(`Compile error: ${(e as Error).message}`);
    }

    return descriptor;
  }

  /** Activate a plugin by ID. */
  async activate(id: string): Promise<void> {
    const descriptor = this._plugins.get(id);
    if (!descriptor) throw new Error(`Plugin not found: ${id}`);
    if (descriptor.enabled) return;

    const mod = this._modules.get(id);
    if (!mod) {
      descriptor.errors.push('Module not loaded');
      this._onPluginError.fire({ pluginId: id, error: 'Module not loaded' });
      return;
    }

    try {
      await mod.activate(this._api);
      descriptor.enabled = true;
      descriptor.errors = [];
      this._onPluginActivated.fire(id);
    } catch (e) {
      const msg = (e as Error).message;
      descriptor.errors.push(`Activation error: ${msg}`);
      this._onPluginError.fire({ pluginId: id, error: msg });
    }
  }

  /** Deactivate a plugin by ID. */
  async deactivate(id: string): Promise<void> {
    const descriptor = this._plugins.get(id);
    if (!descriptor) return;
    if (!descriptor.enabled) return;

    const mod = this._modules.get(id);
    try {
      mod?.deactivate?.();
    } catch (e) {
      descriptor.errors.push(`Deactivation error: ${(e as Error).message}`);
    }

    descriptor.enabled = false;
    this._onPluginDeactivated.fire(id);
  }

  /** Activate all installed plugins. */
  async activateAll(): Promise<void> {
    const promises = [...this._plugins.keys()].map((id) => this.activate(id).catch(() => {}));
    await Promise.allSettled(promises);
  }

  /** Uninstall a plugin. */
  uninstall(id: string): void {
    this.deactivate(id);
    this._plugins.delete(id);
    this._modules.delete(id);
  }

  /** Get all registered commands contributed by plugins. */
  getCommands(): Map<string, () => void> {
    return this._registry.commands;
  }

  /** Execute a contributed command. */
  executeCommand(id: string): boolean {
    const handler = this._registry.commands.get(id);
    if (handler) {
      handler();
      return true;
    }
    return false;
  }
}

/** Singleton */
let _host: PluginHost | null = null;

export function getPluginHost(api?: PluginAPI): PluginHost {
  if (!_host && api) {
    _host = new PluginHost(api);
  }
  if (!_host) throw new Error('PluginHost not initialized — call getPluginHost(api) first.');
  return _host;
}
