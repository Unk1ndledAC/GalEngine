/**
 * Sprite Manager — character sprite state, positioning, transitions.
 * Python: galengine/scene/sprite_manager.py
 */

import type { SpriteState, SpritePosition } from './types';

export interface SpriteDisplay {
  characterId: string;
  variant: string;
  x: number;
  y: number;
  opacity: number;
  scale: number;
  flipped: boolean;
  zOrder: number;
  visible: boolean;
}

const POSITION_COORDS: Record<string, { x: number; y: number }> = {
  left:         { x: 160, y: 360 },
  left_center:  { x: 320, y: 360 },
  center:       { x: 640, y: 360 },
  right_center: { x: 960, y: 360 },
  right:        { x: 1120, y: 360 },
};

export class SpriteManager {
  private _sprites = new Map<string, SpriteState>();

  /** Register a character's sprite variants from directory listing. */
  registerCharacter(characterId: string, variants: string[]): void {
    // Store variant list in metadata
    const state = this._sprites.get(characterId);
    if (state) {
      (state as any)._variants = variants;
    }
  }

  /** Show a sprite at a position. */
  show(characterId: string, variant: string, position?: SpritePosition): SpriteDisplay {
    const pos = POSITION_COORDS[position ?? 'center'] ?? POSITION_COORDS.center;

    const state: SpriteState = {
      characterId,
      currentVariant: variant,
      position: (position as SpritePosition) ?? 'center',
      x: pos.x,
      y: pos.y,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      zOrder: this._sprites.size,
      visible: true,
      flipped: false,
      entranceEffect: 'fade',
      entranceDuration: 0.3,
    };

    this._sprites.set(characterId, state);
    return this.toDisplay(state);
  }

  /** Hide a character's sprite. */
  hide(characterId: string): void {
    const state = this._sprites.get(characterId);
    if (state) {
      state.visible = false;
    }
  }

  /** Get all visible sprites sorted by z-order. */
  getVisibleSprites(): SpriteDisplay[] {
    return [...this._sprites.values()]
      .filter((s) => s.visible)
      .sort((a, b) => a.zOrder - b.zOrder)
      .map((s) => this.toDisplay(s));
  }

  /** Get a single sprite by character ID. */
  getSprite(characterId: string): SpriteDisplay | null {
    const state = this._sprites.get(characterId);
    return state ? this.toDisplay(state) : null;
  }

  /** Reset all sprites. */
  reset(): void {
    this._sprites.clear();
  }

  private toDisplay(s: SpriteState): SpriteDisplay {
    return {
      characterId: s.characterId,
      variant: s.currentVariant,
      x: s.x,
      y: s.y,
      opacity: s.opacity,
      scale: s.scaleX,
      flipped: s.flipped,
      zOrder: s.zOrder,
      visible: s.visible,
    };
  }
}
