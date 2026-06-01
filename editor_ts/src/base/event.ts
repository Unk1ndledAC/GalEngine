/**
 * Typed event emitter — zero-dependency.
 * Pattern: VS Code src/vs/base/common/event.ts (simplified).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Function that can be disposed to unsubscribe. */
export type Disposable = { dispose(): void };

/** Listener callback for event T. */
export type Listener<T> = (event: T) => void;

// ---------------------------------------------------------------------------
// Emitter
// ---------------------------------------------------------------------------

export class Emitter<T> {
  private _listeners: Listener<T>[] = [];
  private _disposed = false;

  /** The public event — only exposes `on()`. */
  readonly event: Event<T> = (listener: Listener<T>, thisArg?: unknown): Disposable => {
    const bound = thisArg ? listener.bind(thisArg) : listener;
    this._listeners.push(bound);
    let disposed = false;
    return {
      dispose: () => {
        if (disposed) return;
        disposed = true;
        const idx = this._listeners.indexOf(bound);
        if (idx >= 0) this._listeners.splice(idx, 1);
      },
    };
  };

  /** Fire event to all listeners. */
  fire(data: T): void {
    if (this._disposed) return;
    // copy array so mutations during iteration are safe
    for (const fn of [...this._listeners]) {
      fn(data);
    }
  }

  dispose(): void {
    this._disposed = true;
    this._listeners = [];
  }
}

/** Event: subscribe-only interface. */
export type Event<T> = (listener: Listener<T>, thisArg?: unknown) => Disposable;
