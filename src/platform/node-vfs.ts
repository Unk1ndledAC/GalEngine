/**
 * NodeVFS — VFS implementation backed by Node.js fs/promises.
 *
 * This file is ONLY imported by the Electron main process.
 * It MUST NOT be imported by any renderer-bundled code.
 */
import type { VFS } from '../engine/loader';
import { dirname } from '../base/uri';

export class NodeVFS implements VFS {
  async readTextFile(path: string): Promise<string> {
    const { readFile } = await import('fs/promises');
    return readFile(path, 'utf-8');
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    const { readFile } = await import('fs/promises');
    const buf = await readFile(path);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    const { writeFile, mkdir: mkdirAsync } = await import('fs/promises');
    await mkdirAsync(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf-8');
  }

  async writeBinaryFile(path: string, data: Uint8Array): Promise<void> {
    const { writeFile, mkdir: mkdirAsync } = await import('fs/promises');
    await mkdirAsync(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async exists(path: string): Promise<boolean> {
    try {
      const { access } = await import('fs/promises');
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  async listDir(path: string): Promise<string[]> {
    const { readdir } = await import('fs/promises');
    return readdir(path);
  }

  async listDirDetailed(path: string): Promise<{ name: string; isDirectory: boolean }[]> {
    const { readdir } = await import('fs/promises');
    const entries = await readdir(path, { withFileTypes: true });
    return entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
  }

  async mkdir(path: string): Promise<void> {
    const { mkdir: mkdirAsync } = await import('fs/promises');
    await mkdirAsync(path, { recursive: true });
  }
}
