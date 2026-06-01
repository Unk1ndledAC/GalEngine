/**
 * URI / path utilities — zero-dependency.
 * Pattern: VS Code src/vs/base/common/uri.ts (simplified).
 */

// ---------------------------------------------------------------------------
// Path helpers (Node-compatible subset)
// ---------------------------------------------------------------------------

const sep = '/';
const winSep = '\\';

/** Normalize path separators to forward slash. */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/** Get the directory part of a path. */
export function dirname(p: string): string {
  p = normalizePath(p);
  const idx = p.lastIndexOf('/');
  return idx >= 0 ? p.slice(0, idx) : '.';
}

/** Get the filename part of a path. */
export function basename(p: string, ext?: string): string {
  p = normalizePath(p);
  let name = p.slice(p.lastIndexOf('/') + 1);
  if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length);
  return name;
}

/** Get file extension (with dot, lowercase). */
export function extname(p: string): string {
  p = normalizePath(p);
  const name = basename(p);
  const idx = name.lastIndexOf('.');
  return idx >= 1 ? name.slice(idx).toLowerCase() : '';
}

/** Join path segments. */
export function joinPath(...segments: string[]): string {
  return normalizePath(segments
    .map((s) => s.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/'));
}

/** Resolve a relative path against a base. */
export function resolvePath(base: string, ...segments: string[]): string {
  return joinPath(base, ...segments);
}

// ---------------------------------------------------------------------------
// URI class (simplified)
// ---------------------------------------------------------------------------

export class URI {
  constructor(
    readonly scheme: string,
    readonly path: string,
  ) {}

  static file(p: string): URI {
    return new URI('file', normalizePath(p));
  }

  toString(): string {
    return `${this.scheme}:///${this.path}`;
  }

  get fsPath(): string {
    return this.path;
  }
}
