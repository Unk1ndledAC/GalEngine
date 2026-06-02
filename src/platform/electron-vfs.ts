/**
 * ElectronVFS — VFS implementation backed by Electron IPC.
 *
 * Wraps window.galengine.fs calls to implement the engine's VFS interface.
 * Works in Electron renderer context only.
 */

import type { VFS } from '@engine/loader';
import type { GalEngineBridge, FileStat } from './ipc';

/**
 * Virtual file system that delegates all operations to the Electron
 * main process via IPC (contextBridge).
 */
export class ElectronVFS implements VFS {
  private get _bridge(): GalEngineBridge {
    if (!window.galengine) {
      throw new Error(
        'ElectronVFS: window.galengine not available. ' +
        'Are you running inside Electron with the preload script?'
      );
    }
    return window.galengine;
  }

  /** Timeout wrapper for IPC calls that may never settle. */
  private _withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 8000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
      promise
        .then((v) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(v);
          }
        })
        .catch((e) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(e);
          }
        });
    });
  }

  async readTextFile(path: string): Promise<string> {
    return this._withTimeout(this._bridge.fs.readTextFile(path), `readTextFile(${path})`);
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    const bufPromise = this._bridge.fs.readBinaryFile(path);
    return this._withTimeout(bufPromise.then((buf) => new Uint8Array(buf)), `readBinaryFile(${path})`);
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    await this._bridge.fs.writeTextFile(path, content);
  }

  async writeBinaryFile(path: string, data: Uint8Array): Promise<void> {
    // Create a standalone ArrayBuffer for IPC transfer
    const buf = new Uint8Array(data);
    await this._bridge.fs.writeBinaryFile(path, buf.buffer as ArrayBuffer);
  }

  async exists(path: string): Promise<boolean> {
    return this._bridge.fs.exists(path);
  }

  async listDir(path: string): Promise<string[]> {
    return this._bridge.fs.listDir(path);
  }

  async mkdir(path: string): Promise<void> {
    await this._bridge.fs.mkdir(path);
  }

  /** List directory entries with name + isDirectory in a single IPC call. */
  async listDirDetailed(path: string): Promise<{ name: string; isDirectory: boolean }[]> {
    return this._withTimeout(
      this._bridge.fs.listDirDetailed(path),
      `listDirDetailed(${path})`
    );
  }

  /** Get detailed stats for a file or directory. */
  async stat(path: string): Promise<FileStat> {
    return this._bridge.fs.stat(path);
  }

  /** Delete a file or directory (recursively). */
  async delete(path: string): Promise<void> {
    await this._bridge.fs.delete(path);
  }
}

/** Singleton instance — created once at app startup. */
let _instance: ElectronVFS | null = null;

export function getElectronVFS(): ElectronVFS {
  if (!_instance) {
    _instance = new ElectronVFS();
  }
  return _instance;
}
