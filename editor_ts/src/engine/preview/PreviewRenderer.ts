/**
 * PreviewRenderer — Canvas2D game preview renderer.
 *
 * Renders the visual novel state to an HTML Canvas:
 *   Layer 0: Background image (with transition effects)
 *   Layer 1: CG image (full-screen overlay)
 *   Layer 2: Sprite layer (character images at positions)
 *   Layer 3: Text box (dialogue / narration with typewriter)
 *   Layer 4: Choice buttons (overlay)
 *
 * Design: engine-agnostic. Receives render commands through public methods,
 * not coupled to GalEngine internals. The PreviewPanel bridges them.
 */

// =========================================================================
// Types
// =========================================================================

export interface PreviewSprite {
  characterId: string;
  image: HTMLImageElement | null;
  position: SpritePos;
  x: number;
  y: number;
  opacity: number;
  zOrder: number;
  visible: boolean;
  transition?: string;
  transitionProgress: number; // 0→1
}

export type SpritePos = 'left' | 'left_center' | 'center' | 'right_center' | 'right' | 'custom';

export interface PreviewState {
  background: HTMLImageElement | null;
  backgroundTransition: string | null;
  backgroundTransitionProgress: number; // 0→1
  cgImage: HTMLImageElement | null;
  cgTransitionProgress: number;
  showCG: boolean;
  sprites: Map<string, PreviewSprite>;
  dialogueText: string;
  dialogueDisplayed: number; // typewriter char count
  dialogueSpeaker: string;
  dialogueSpeakerDisplayed: number;
  showDialogue: boolean;
  choices: { text: string; target: string }[];
  font: string;
  fontSize: number;
  textColor: string;
  nameColor: string;
  resolution: [number, number];
}

export interface TransitionRunner {
  type: string;
  duration: number; // seconds
  elapsed: number;
  onComplete?: () => void;
}

// =========================================================================
// Renderer
// =========================================================================

export class PreviewRenderer {
  private _ctx: CanvasRenderingContext2D;
  private _canvas: HTMLCanvasElement;
  private _state: PreviewState;
  private _transitions: TransitionRunner[] = [];
  private _rafId = 0;
  private _lastTime = 0;
  private _running = false;
  private _playing = false;   // user intent: set by start(), cleared by stop()
  private _dirty = true;
  private _disposed = false;

  // Object URLs created for images — must be revoked on stop/dispose
  private _objectUrls: string[] = [];

  // Offscreen canvas for double-buffering (prevents flicker)
  private _offscreen: HTMLCanvasElement | null = null;
  private _offscreenCtx: CanvasRenderingContext2D | null = null;
  private _offscreenW = -1;
  private _offscreenH = -1;

  // Cached default background gradient (avoid per-frame allocation)
  private _defaultBgGradient: CanvasGradient | null = null;
  private _defaultBgResW = -1;
  private _defaultBgResH = -1;

  // Click callback
  onClick?: () => void;

  // Choice callback
  onChoice?: (target: string) => void;

  // Hit testing for choices
  private _choiceRects: { x: number; y: number; w: number; h: number; target: string }[] = [];

  // Bound event handlers (so they can be removed on dispose)
  private _boundOnClick: ((e: MouseEvent) => void) | null = null;
  private _boundOnMouseMove: ((e: MouseEvent) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d')!;
    this._state = this._createDefaultState();

    // Attach event handlers (idempotent, detached by stop/dispose, re-attached by start)
    this._attachEvents();
  }

  // ---- Public API ----

  /** Start the render loop and attach input events. */
  start(): void {
    if (this._playing || this._disposed) return;
    this._playing = true;
    this._running = true;
    this._lastTime = performance.now();
    this._attachEvents();
    this._loop();
  }

  /** Stop the render loop, release resources, detach events. */
  stop(): void {
    this._playing = false;
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
    this._dirty = false;
    this._transitions = [];
    this._releaseObjectUrls();
    this._detachEvents();
  }

  /** Completely dispose this renderer — call once, never reuse. */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.stop();
    this._detachEvents();
    this._offscreen = null;
    this._offscreenCtx = null;
  }

  /** Remove canvas event listeners. Safe to call multiple times. */
  private _detachEvents(): void {
    if (this._boundOnClick) {
      this._canvas.removeEventListener('click', this._boundOnClick);
      this._boundOnClick = null;
    }
    if (this._boundOnMouseMove) {
      this._canvas.removeEventListener('mousemove', this._boundOnMouseMove);
      this._boundOnMouseMove = null;
    }
  }

  /** Attach canvas event listeners (idempotent — safe to call after _detachEvents). */
  private _attachEvents(): void {
    if (this._boundOnClick) return; // already attached
    this._boundOnClick = (e: MouseEvent) => {
      if (!this.onClick && !this.onChoice) return;
      const rect = this._canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this._canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (this._canvas.height / rect.height);

      if (this._state.choices.length > 0) {
        for (const cr of this._choiceRects) {
          if (mx >= cr.x && mx <= cr.x + cr.w && my >= cr.y && my <= cr.y + cr.h) {
            this.onChoice?.(cr.target);
            return;
          }
        }
      }
      this.onClick?.();
    };

    this._boundOnMouseMove = (e: MouseEvent) => {
      const rect = this._canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this._canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (this._canvas.height / rect.height);
      let over = false;
      for (const cr of this._choiceRects) {
        if (mx >= cr.x && mx <= cr.x + cr.w && my >= cr.y && my <= cr.y + cr.h) {
          over = true;
          break;
        }
      }
      this._canvas.style.cursor = over ? 'pointer' : 'default';
    };

    this._canvas.addEventListener('click', this._boundOnClick);
    this._canvas.addEventListener('mousemove', this._boundOnMouseMove);
  }

  /** Draw a blank black canvas (used after Stop to release visual state). */
  drawBlank(): void {
    const ctx = this._ctx;
    const cw = this._canvas.width / (window.devicePixelRatio || 1);
    const ch = this._canvas.height / (window.devicePixelRatio || 1);
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    this._dirty = false;
  }

  /** Resize canvas to match container. Avoids unnecessary buffer reset. */
  resize(w: number, h: number): void {
    const dpr = window.devicePixelRatio || 1;
    const newW = Math.round(w * dpr);
    const newH = Math.round(h * dpr);
    if (this._canvas.width === newW && this._canvas.height === newH) return;
    this._canvas.width = newW;
    this._canvas.height = newH;
    this._canvas.style.width = w + 'px';
    this._canvas.style.height = h + 'px';
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._markDirty();
  }

  /** Set canvas logical resolution. */
  setResolution(w: number, h: number): void {
    this._state.resolution = [w, h];
  }

  // ---- Asset Loading ----

  /** Register an object URL for later cleanup. */
  addObjectUrl(url: string): void {
    this._objectUrls.push(url);
  }

  /** Release all object URLs created by this renderer. */
  private _releaseObjectUrls(): void {
    for (const url of this._objectUrls) {
      try { URL.revokeObjectURL(url); } catch {}
    }
    this._objectUrls = [];
  }

  async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${src}`));
      img.src = src;
    });
  }

  // ---- Render Commands ----

  setBackground(image: HTMLImageElement | null, transition?: string, duration?: number): void {
    if (transition && duration && this._state.background) {
      this._transitions.push({
        type: transition,
        duration,
        elapsed: 0,
        onComplete: () => {
          this._state.background = image;
          this._state.backgroundTransitionProgress = 1;
          this._state.backgroundTransition = null;
          this._markDirty();
        },
      });
      this._state.backgroundTransition = transition;
      this._state.backgroundTransitionProgress = 0;
      this._markDirty();
    } else {
      this._state.background = image;
      this._state.backgroundTransition = null;
      this._state.backgroundTransitionProgress = 1;
      this._markDirty();
    }
  }

  showSprite(
    characterId: string,
    image: HTMLImageElement | null,
    position: SpritePos,
    transition?: string,
    duration?: number,
  ): void {
    const pos = this._positionToCoord(position);
    const existing = this._state.sprites.get(characterId);
    const zOrder = existing ? existing.zOrder : this._state.sprites.size;

    const sprite: PreviewSprite = {
      characterId,
      image,
      position,
      x: pos[0],
      y: pos[1],
      opacity: existing?.opacity ?? 1,
      zOrder,
      visible: true,
      transition: transition ?? 'fade',
      transitionProgress: transition ? 0 : 1,
    };

    this._state.sprites.set(characterId, sprite);

    if (transition && duration) {
      this._transitions.push({
        type: `sprite_${transition}`,
        duration,
        elapsed: 0,
        onComplete: () => {
          sprite.transitionProgress = 1;
          this._markDirty();
        },
      });
    }
    this._markDirty();
  }

  hideSprite(characterId: string, transition?: string, duration?: number): void {
    const sprite = this._state.sprites.get(characterId);
    if (!sprite) return;

    if (transition && duration) {
      this._transitions.push({
        type: `sprite_hide_${transition}`,
        duration,
        elapsed: 0,
        onComplete: () => {
          this._state.sprites.delete(characterId);
          this._markDirty();
        },
      });
      sprite.transition = transition;
      sprite.transitionProgress = 1;
      this._markDirty();
    } else {
      this._state.sprites.delete(characterId);
      this._markDirty();
    }
  }

  showCG(image: HTMLImageElement | null, duration?: number): void {
    this._state.showCG = true;
    this._state.cgImage = image;
    if (duration) {
      this._state.cgTransitionProgress = 0;
      this._transitions.push({
        type: 'cg_fade_in',
        duration,
        elapsed: 0,
        onComplete: () => { this._state.cgTransitionProgress = 1; this._markDirty(); },
      });
    } else {
      this._state.cgTransitionProgress = 1;
    }
    this._markDirty();
  }

  hideCG(duration?: number): void {
    if (duration) {
      this._transitions.push({
        type: 'cg_fade_out',
        duration,
        elapsed: 0,
        onComplete: () => {
          this._state.showCG = false;
          this._state.cgImage = null;
          this._state.cgTransitionProgress = 0;
          this._markDirty();
        },
      });
    } else {
      this._state.showCG = false;
      this._state.cgImage = null;
      this._markDirty();
    }
  }

  showDialogue(speaker: string, text: string): void {
    this._state.dialogueSpeaker = speaker;
    this._state.dialogueText = text;
    this._state.dialogueDisplayed = 0;
    this._state.dialogueSpeakerDisplayed = 0;
    this._state.showDialogue = true;
    this._state.choices = [];
    this._markDirty();
  }

  showNarration(text: string): void {
    this.showDialogue('', text);
    this._state.dialogueSpeakerDisplayed = -1; // mark as narration
  }

  showChoices(choices: { text: string; target: string }[]): void {
    this._state.choices = choices;
    this._state.showDialogue = true;
    this._markDirty();
  }

  hideDialogue(): void {
    this._state.showDialogue = false;
    this._state.choices = [];
    this._markDirty();
  }

  /** Instantly display full dialogue text. */
  completeText(): void {
    this._state.dialogueDisplayed = this._state.dialogueText.length;
    this._markDirty();
  }

  /** Set font styles. */
  setFont(font: string, size: number, textColor: string, nameColor: string): void {
    this._state.font = font;
    this._state.fontSize = size;
    this._state.textColor = textColor;
    this._state.nameColor = nameColor;
    this._markDirty();
  }

  /** Get current state snapshot. */
  getState(): Readonly<PreviewState> {
    return this._state;
  }

  /** Reset to default. */
  reset(): void {
    this._state = this._createDefaultState();
    this._transitions = [];
    this._choiceRects = [];
    this._defaultBgGradient = null;
    this._markDirty();
  }

  /** Check if render loop is active. */
  isRunning(): boolean {
    return this._running;
  }

  // ---- Private Render Loop ----

  /** Mark the canvas as needing a redraw. Only restarts loop when playback is active. */
  private _markDirty(): void {
    if (this._disposed) return;
    this._dirty = true;
    // Only auto-restart the loop if the user explicitly started playback.
    // The _playing flag prevents _markDirty() from resurrecting the loop
    // after stop() — the previous root cause of the memory leak.
    if (this._playing && !this._running) {
      this._running = true;
      this._lastTime = performance.now();
      this._loop();
    }
  }

  /** Main render loop — only runs while _playing and there is work to do. */
  private _loop(): void {
    if (!this._playing || this._disposed) {
      this._rafId = 0;
      this._running = false;
      return;
    }

    const now = performance.now();
    const dt = (now - this._lastTime) / 1000;
    this._lastTime = now;

    const hasTransitions = this._transitions.length > 0;
    const hasTypewriter = this._state.showDialogue
      && this._state.dialogueDisplayed < this._state.dialogueText.length;
    const needsRedraw = this._dirty || hasTransitions || hasTypewriter;

    if (needsRedraw) {
      this._update(dt);
      this._draw();
      // Remain dirty if transitions or typewriter are still active
      this._dirty = hasTransitions || hasTypewriter;
    }

    // Schedule next frame only if there is still work to do.
    // When idle, keep _playing true (user intent) but clear _running.
    if (needsRedraw) {
      this._rafId = requestAnimationFrame(() => this._loop());
    } else {
      this._rafId = 0;
      this._running = false;
    }
  }

  private _update(dt: number): void {
    // Update transitions
    for (let i = this._transitions.length - 1; i >= 0; i--) {
      const t = this._transitions[i];
      t.elapsed += dt;
      const progress = Math.min(t.elapsed / t.duration, 1);

      if (t.type === 'fade' || t.type === 'crossfade') {
        this._state.backgroundTransitionProgress = progress;
      } else if (t.type.startsWith('sprite_')) {
        // Handled in draw
      } else if (t.type === 'cg_fade_in') {
        this._state.cgTransitionProgress = progress;
      } else if (t.type === 'cg_fade_out') {
        this._state.cgTransitionProgress = 1 - progress;
      }

      if (progress >= 1) {
        t.onComplete?.();
        this._transitions.splice(i, 1);
      }
    }

    // Update sprite transitions
    for (const sprite of this._state.sprites.values()) {
      if (sprite.transition && sprite.transitionProgress < 1) {
        sprite.transitionProgress = Math.min(sprite.transitionProgress + dt * 3, 1);
      }
    }

    // Typewriter effect
    if (this._state.showDialogue && this._state.dialogueDisplayed < this._state.dialogueText.length) {
      const cps = 40; // chars per second
      this._state.dialogueDisplayed = Math.min(
        this._state.dialogueDisplayed + Math.ceil(cps * dt),
        this._state.dialogueText.length,
      );
      // Also reveal speaker
      if (this._state.dialogueSpeakerDisplayed >= 0
        && this._state.dialogueSpeakerDisplayed < this._state.dialogueSpeaker.length) {
        this._state.dialogueSpeakerDisplayed = this._state.dialogueSpeaker.length;
      }
    }
  }

  private _draw(): void {
    const ctx = this._ctx;
    const [W, H] = this._state.resolution;

    // Scale canvas to fit
    const cw = this._canvas.width / (window.devicePixelRatio || 1);
    const ch = this._canvas.height / (window.devicePixelRatio || 1);
    const scale = Math.min(cw / W, ch / H);
    const ox = (cw - W * scale) / 2;
    const oy = (ch - H * scale) / 2;

    // Use offscreen canvas for double-buffering (prevents flicker)
    // Only allocate/resize when dimensions change
    const canvasW = this._canvas.width;
    const canvasH = this._canvas.height;

    if (!this._offscreen) {
      this._offscreen = document.createElement('canvas');
      this._offscreenCtx = null; // force re-init
    }
    const oc = this._offscreen;

    if (oc.width !== canvasW || oc.height !== canvasH || !this._offscreenCtx) {
      oc.width = canvasW;
      oc.height = canvasH;
      this._offscreenCtx = oc.getContext('2d')!;
      this._offscreenW = canvasW;
      this._offscreenH = canvasH;
    }
    const octx = this._offscreenCtx;

    octx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

    // Single fillRect on offscreen — no intermediate visual state
    octx.fillStyle = '#000';
    octx.fillRect(0, 0, cw, ch);

    octx.save();
    octx.translate(ox, oy);
    octx.scale(scale, scale);

    // Layer 0: Background
    this._drawBackground(octx, W, H);

    // Layer 1: CG overlay
    if (this._state.showCG) {
      this._drawCG(octx, W, H);
    }

    // Layer 2: Sprites
    this._drawSprites(octx, W, H);

    // Layer 3: Textbox
    if (this._state.showDialogue) {
      this._drawTextBox(octx, W, H);
    }

    // Layer 4: Choices
    if (this._state.choices.length > 0) {
      this._drawChoices(octx, W, H);
    }

    octx.restore();

    // Copy offscreen canvas to main canvas in one operation
    ctx.drawImage(oc, 0, 0);
  }

  private _drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const bg = this._state.background;
    if (!bg) {
      // Default gradient background — cached to avoid per-frame allocation
      if (!this._defaultBgGradient || this._defaultBgResW !== W || this._defaultBgResH !== H) {
        this._defaultBgGradient = ctx.createLinearGradient(0, 0, 0, H);
        this._defaultBgGradient.addColorStop(0, '#1a1a2e');
        this._defaultBgGradient.addColorStop(0.5, '#16213e');
        this._defaultBgGradient.addColorStop(1, '#0f3460');
        this._defaultBgResW = W;
        this._defaultBgResH = H;
      }
      ctx.fillStyle = this._defaultBgGradient;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    const progress = this._state.backgroundTransitionProgress;

    if (this._state.backgroundTransition === 'fade') {
      ctx.globalAlpha = progress;
      ctx.drawImage(bg, 0, 0, W, H);
      ctx.globalAlpha = 1;
    } else if (this._state.backgroundTransition === 'crossfade') {
      // Crossfade from black
      ctx.globalAlpha = progress;
      ctx.drawImage(bg, 0, 0, W, H);
      ctx.globalAlpha = 1;
    } else if (this._state.backgroundTransition === 'slide_left') {
      const offset = (1 - progress) * W;
      ctx.drawImage(bg, -offset, 0, W, H);
    } else if (this._state.backgroundTransition === 'slide_right') {
      const offset = (1 - progress) * W;
      ctx.drawImage(bg, offset, 0, W, H);
    } else if (this._state.backgroundTransition === 'slide_up') {
      const offset = (1 - progress) * H;
      ctx.drawImage(bg, 0, -offset, W, H);
    } else if (this._state.backgroundTransition === 'slide_down') {
      const offset = (1 - progress) * H;
      ctx.drawImage(bg, 0, offset, W, H);
    } else {
      ctx.drawImage(bg, 0, 0, W, H);
    }
  }

  private _drawCG(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const cg = this._state.cgImage;
    if (!cg) return;

    ctx.globalAlpha = this._state.cgTransitionProgress;
    ctx.drawImage(cg, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  private _drawSprites(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const sprites = [...this._state.sprites.values()]
      .sort((a, b) => a.zOrder - b.zOrder);

    for (const s of sprites) {
      if (!s.visible || !s.image) continue;

      ctx.save();
      ctx.globalAlpha = s.opacity * s.transitionProgress;

      const imgW = s.image.width;
      const imgH = s.image.height;
      const desiredH = H * 0.75;
      const desiredW = imgW * (desiredH / imgH);
      const dx = s.x - desiredW / 2;
      const dy = H - desiredH - H * 0.1;

      ctx.drawImage(s.image, dx, dy, desiredW, desiredH);
      ctx.restore();
    }
  }

  private _drawTextBox(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const boxH = H * 0.22;
    const boxY = H - boxH;
    const pad = 12;

    // Semi-transparent box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, boxY, W, boxH);

    // Top border accent
    ctx.fillStyle = 'rgba(180, 160, 255, 0.4)';
    ctx.fillRect(0, boxY, W, 2);

    // Speaker name
    const s = this._state;
    const fontSize = s.fontSize;
    const fontFamily = s.font || 'Inter, sans-serif';

    if (s.dialogueSpeaker && s.dialogueSpeakerDisplayed >= 0) {
      ctx.font = `bold ${fontSize * 0.85}px ${fontFamily}`;
      ctx.fillStyle = s.nameColor;
      ctx.textBaseline = 'top';

      // Name background
      const nameMetrics = ctx.measureText(s.dialogueSpeaker);
      ctx.fillStyle = 'rgba(80, 60, 160, 0.5)';
      ctx.fillRect(pad, boxY - 24, nameMetrics.width + 16, 24);
      ctx.fillStyle = s.nameColor;
      ctx.fillText(s.dialogueSpeaker, pad + 8, boxY - 20);
    }

    // Dialogue text (with typewriter)
    const displayText = s.dialogueText.substring(0, s.dialogueDisplayed);
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = s.textColor;
    ctx.textBaseline = 'top';

    this._wrapText(ctx, displayText, pad, boxY + pad, W - pad * 2, fontSize * 1.5);
  }

  private _drawChoices(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const choices = this._state.choices;
    this._choiceRects = [];

    const choiceW = Math.min(W * 0.7, 500);
    const baseY = H * 0.3;
    const gap = 12;
    const btnH = 44;

    choices.forEach((c, i) => {
      const bx = (W - choiceW) / 2;
      const by = baseY + i * (btnH + gap);

      // Button background
      ctx.fillStyle = 'rgba(30, 30, 50, 0.92)';
      ctx.strokeStyle = 'rgba(160, 140, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const r = 6;
      this._roundRect(ctx, bx, by, choiceW, btnH, r);
      ctx.fill();
      ctx.stroke();

      // Choice text
      ctx.fillStyle = '#e0d8ff';
      ctx.font = `${this._state.fontSize * 0.9}px ${this._state.font || 'Inter, sans-serif'}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(c.text, bx + choiceW / 2, by + btnH / 2);
      ctx.textAlign = 'start';

      this._choiceRects.push({ x: bx, y: by, w: choiceW, h: btnH, target: c.target });
    });
  }

  private _wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number, y: number,
    maxW: number,
    lineH: number,
  ): void {
    // Simple word/char wrapping for CJK
    let line = '';
    let cy = y;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const testLine = line + ch;

      if (ctx.measureText(testLine).width > maxW && line.length > 0) {
        ctx.fillText(line, x, cy);
        line = ch;
        cy += lineH;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, x, cy);
    }
  }

  private _roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  private _createDefaultState(): PreviewState {
    return {
      background: null,
      backgroundTransition: null,
      backgroundTransitionProgress: 1,
      cgImage: null,
      cgTransitionProgress: 0,
      showCG: false,
      sprites: new Map(),
      dialogueText: '',
      dialogueDisplayed: 0,
      dialogueSpeaker: '',
      dialogueSpeakerDisplayed: 0,
      showDialogue: false,
      choices: [],
      font: 'Inter, sans-serif',
      fontSize: 22,
      textColor: '#ffffff',
      nameColor: '#c8b4ff',
      resolution: [1280, 720],
    };
  }

  private _positionToCoord(pos: SpritePos): [number, number] {
    const [W, H] = this._state.resolution;
    switch (pos) {
      case 'left':        return [W * 0.2, 0];
      case 'left_center': return [W * 0.35, 0];
      case 'center':      return [W * 0.5, 0];
      case 'right_center':return [W * 0.65, 0];
      case 'right':       return [W * 0.8, 0];
      case 'custom':
      default:            return [W * 0.5, 0];
    }
  }
}
