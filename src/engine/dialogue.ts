/**
 * Dialogue System — typewriter effect, history.
 * Python: galengine/dialogue/dialogue_system.py
 */

import type { DialogueData, DialogueHistoryEntry } from './types';
import type { ConfigManager } from './config';

export class DialogueSystem {
  private _history: DialogueHistoryEntry[] = [];
  private _historyMax = 500;

  constructor(private _config: ConfigManager) {}

  /** Show dialogue with typewriter effect. Returns when complete (or skipped). */
  async show(data: DialogueData): Promise<void> {
    const text = data.text;
    const charName = data.display_name ?? data.character;
    const speed = this._config.get('textSpeed'); // chars/sec

    // Add to history
    this._history.push({
      character: charName,
      text,
      timestamp: Date.now(),
    });
    if (this._history.length > this._historyMax) {
      this._history.shift();
    }

    // Typewriter (caller handles actual rendering)
    // For engine use, this is a signal; rendering is done by platform layer
    const delayPerChar = 1000 / speed; // ms per char
    await this._typewriterDelay(text.length, delayPerChar);
  }

  private async _typewriterDelay(chars: number, msPerChar: number): Promise<void> {
    // In browser context, this would animate progressively
    // For pure engine, just simulate the delay
    const totalMs = chars * msPerChar;
    return new Promise((r) => setTimeout(r, Math.min(totalMs, 5000)));
  }

  /** Get dialogue history. */
  getHistory(): DialogueHistoryEntry[] {
    return [...this._history];
  }

  /** Clear history. */
  clearHistory(): void {
    this._history = [];
  }
}
