/**
 * Save Manager — multi-slot save/load with compression.
 * Python: galengine/save/save_manager.py
 *
 * Uses pako for zlib-compatible compression (matches Python zlib format).
 */

import pako from 'pako';
import type { SaveData } from './types';

export interface SaveSlot {
  slotId: number;
  timestamp: number;
  dateString: string;
  sceneName: string;
  chapter: string;
  route: string | null;
  empty: boolean;
}

export class SaveManager {
  private _saves = new Map<number, SaveData>();
  private _maxSlots = 100;
  private _quickSaveSlot = 999;

  /** Save game to a slot. */
  async save(slotId: number, data: SaveData): Promise<void> {
    this._saves.set(slotId, { ...data, slotId });

    // Serialize and compress
    const json = JSON.stringify(data);
    const compressed = pako.deflate(json, { level: 6 });

    // Store compressed (in browser: localStorage, in Electron: file)
    const base64 = btoa(String.fromCharCode(...compressed));
    this._persist(slotId, base64);
  }

  /** Load game from a slot. */
  async load(slotId: number): Promise<SaveData> {
    const cached = this._saves.get(slotId);
    if (cached) return cached;

    const base64 = this._restore(slotId);
    if (!base64) throw new Error(`No save in slot ${slotId}`);

    const compressed = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const json = pako.inflate(compressed, { to: 'string' });
    const data = JSON.parse(json) as SaveData;

    this._saves.set(slotId, data);
    return data;
  }

  /** Quick save. */
  async quickSave(data: SaveData): Promise<void> {
    await this.save(this._quickSaveSlot, data);
  }

  /** Quick load. */
  async quickLoad(): Promise<SaveData> {
    return this.load(this._quickSaveSlot);
  }

  /** List all save slots with metadata. */
  listSlots(): SaveSlot[] {
    const slots: SaveSlot[] = [];
    for (let i = 0; i < this._maxSlots; i++) {
      const save = this._saves.get(i);
      if (save) {
        slots.push({
          slotId: i,
          timestamp: save.timestamp,
          dateString: save.dateString,
          sceneName: save.sceneName,
          chapter: save.chapter,
          route: save.route,
          empty: false,
        });
      } else if (this._restore(i)) {
        slots.push({
          slotId: i,
          timestamp: 0,
          dateString: '',
          sceneName: 'Unknown',
          chapter: '',
          route: null,
          empty: false,
        });
      } else {
        slots.push({
          slotId: i,
          timestamp: 0,
          dateString: '',
          sceneName: '',
          chapter: '',
          route: null,
          empty: true,
        });
      }
    }
    return slots;
  }

  /** Delete a save slot. */
  deleteSlot(slotId: number): void {
    this._saves.delete(slotId);
    this._removePersisted(slotId);
  }

  // ---- Storage Backend (pluggable) ----

  private _storageKey(slotId: number): string {
    return `galengine_save_${slotId}`;
  }

  private _persist(slotId: number, base64: string): void {
    try { localStorage.setItem(this._storageKey(slotId), base64); } catch {}
  }

  private _restore(slotId: number): string | null {
    try { return localStorage.getItem(this._storageKey(slotId)); } catch { return null; }
  }

  private _removePersisted(slotId: number): void {
    try { localStorage.removeItem(this._storageKey(slotId)); } catch {}
  }
}
