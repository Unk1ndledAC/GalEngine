/**
 * EngineConfig management.
 * Python: galengine/core/config.py
 */

import type { EngineConfig, DeepPartial } from './types';
import { createDefaultConfig } from './types';

// ---------------------------------------------------------------------------
// Config Manager
// ---------------------------------------------------------------------------

export class ConfigManager {
  private _config: EngineConfig;

  constructor(initial?: DeepPartial<EngineConfig>) {
    this._config = createDefaultConfig(initial as Partial<EngineConfig>);
  }

  /** Read-only snapshot of current config. */
  get snapshot(): Readonly<EngineConfig> {
    return this._config;
  }

  /** Get a single key. */
  get<K extends keyof EngineConfig>(key: K): EngineConfig[K] {
    return this._config[key];
  }

  /** Set a single key. */
  set<K extends keyof EngineConfig>(key: K, value: EngineConfig[K]): void {
    this._config[key] = value;
  }

  /** Bulk update. */
  patch(patch: Partial<EngineConfig>): void {
    Object.assign(this._config, patch);
  }

  /** Reset to defaults. */
  reset(): void {
    this._config = createDefaultConfig();
  }
}
