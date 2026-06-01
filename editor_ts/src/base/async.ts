/**
 * Async utilities — zero-dependency.
 */

// ---------------------------------------------------------------------------
// Deferred
// ---------------------------------------------------------------------------

/** A promise that can be resolved/rejected externally. */
export class Deferred<T> {
  promise: Promise<T>;
  resolve!: (value: T | PromiseLike<T>) => void;
  reject!: (reason?: unknown) => void;

  constructor() {
    this.promise = new Promise<T>((res, rej) => {
      this.resolve = res;
      this.reject = rej;
    });
  }
}

// ---------------------------------------------------------------------------
// CancellationToken
// ---------------------------------------------------------------------------

/** Token that signals cancellation. */
export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  onCancellationRequested(listener: () => void): { dispose(): void };
}

export class CancellationTokenSource {
  private _cancelled = false;
  private _listeners: (() => void)[] = [];

  readonly token: CancellationToken;

  constructor() {
    const self = this;
    this.token = {
      get isCancellationRequested(): boolean {
        return self._cancelled;
      },
      onCancellationRequested: (listener: () => void) => {
        self._listeners.push(listener);
        return { dispose: () => { /* noop in this simple impl */ } };
      },
    };
  }

  cancel(): void {
    if (this._cancelled) return;
    this._cancelled = true;
    for (const fn of this._listeners) fn();
  }
}

/** Never-cancelled token. */
export const CancellationTokenNone: CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose() {} }),
};

// ---------------------------------------------------------------------------
// Delay
// ---------------------------------------------------------------------------

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
