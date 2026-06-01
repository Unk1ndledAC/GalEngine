/**
 * Disposable pattern — zero-dependency.
 * Pattern: VS Code src/vs/base/common/lifecycle.ts (simplified).
 */

import type { Disposable } from './event';

// ---------------------------------------------------------------------------
// DisposableStore
// ---------------------------------------------------------------------------

/** Manages a collection of disposables, disposing them all at once. */
export class DisposableStore implements Disposable {
  private _disposables: Disposable[] = [];
  private _disposed = false;

  /** Add a disposable or a cleanup function. */
  add(d: Disposable | (() => void)): void {
    if (this._disposed) return;
    if (typeof d === 'function') {
      this._disposables.push({ dispose: d });
    } else {
      this._disposables.push(d);
    }
  }

  /** Dispose all tracked items. */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    for (const d of this._disposables) d.dispose();
    this._disposables = [];
  }
}

// ---------------------------------------------------------------------------
// Disposable base class
// ---------------------------------------------------------------------------

/** Base class with built-in store. */
export abstract class DisposableBase implements Disposable {
  protected readonly _store = new DisposableStore();
  private _disposed = false;

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._store.dispose();
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Create a disposable from a function. */
export function toDisposable(fn: () => void): Disposable {
  return { dispose: fn };
}
