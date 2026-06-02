/**
 * PreviewPanel — Game preview in editor.
 *
 * Bridges GalEngine ↔ PreviewRenderer (Canvas2D).
 * Handles asset loading, engine lifecycle, and UI controls.
 *
 * Modes:
 *   - Play: Run the game from current scene
 *   - Preview Scene: Render a single scene starting from current cursor
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PreviewRenderer } from '../../../engine/preview';
import { GalEngine, EngineState } from '../../../engine/engine';
import { ProjectLoader, type VFS, type LoadedProject } from '../../../engine/loader';
import { SceneParser } from '../../../engine/parser';
import { ConfigManager } from '../../../engine/config';
import { usePreviewStore } from './PreviewStore';
import { useTranslation } from '@i18n/useTranslation';
import type { CommandType, DialogueData, ChoiceData, BackgroundData } from '../../../engine/types';
import type { SpritePos } from '../../../engine/preview/PreviewRenderer';

// =========================================================================
// Types
// =========================================================================

interface PreviewPanelProps {
  projectPath: string;
  vfs: VFS;
  onSceneChange?: (sceneId: string) => void;
}

// =========================================================================
// InMemoryVFS — for preview when already loaded
// =========================================================================

class InMemoryVFS implements VFS {
  private _files = new Map<string, string>();
  private _binaries = new Map<string, Uint8Array>();

  setText(path: string, content: string): void {
    this._files.set(path, content);
  }

  setBinary(path: string, data: Uint8Array): void {
    this._binaries.set(path, data);
  }

  async readTextFile(path: string): Promise<string> {
    const content = this._files.get(path);
    if (content === undefined) throw new Error(`File not in memory: ${path}`);
    return content;
  }

  async readBinaryFile(path: string): Promise<Uint8Array> {
    const data = this._binaries.get(path);
    if (!data) throw new Error(`Binary not in memory: ${path}`);
    return data;
  }

  async writeTextFile(): Promise<void> { /* noop */ }
  async writeBinaryFile(): Promise<void> { /* noop */ }
  async exists(path: string): Promise<boolean> {
    return this._files.has(path) || this._binaries.has(path);
  }
  async listDir(): Promise<string[]> { return []; }
  async listDirDetailed(): Promise<{ name: string; isDirectory: boolean }[]> { return []; }
  async mkdir(): Promise<void> { /* noop */ }
}

// =========================================================================
// PreviewPanel Component
// =========================================================================

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ projectPath, vfs, onSceneChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PreviewRenderer | null>(null);
  const engineRef = useRef<GalEngine | null>(null);
  const projectRef = useRef<LoadedProject | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Guard against concurrent handlePlay invocations (e.g. rapid double-click)
  const playingRef = useRef(false);

  const { isRunning, setRunning, setPaused, setScene, setError, cacheImage, sceneName, lastError } = usePreviewStore();
  const [showControls, setShowControls] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { t } = useTranslation();

  // ---- Lifecycle: init renderer on mount (don't start loop until Play) ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new PreviewRenderer(canvas);
    rendererRef.current = renderer;
    renderer.setResolution(1280, 720);

    // Click to advance
    renderer.onClick = async () => {
      const engine = engineRef.current;
      if (engine && engine.state === EngineState.Running) {
        try {
          await engine.advance();
        } catch (e) {
          setError((e as Error).message);
        }
      }
    };

    // Choice selection
    renderer.onChoice = async (target: string) => {
      const engine = engineRef.current;
      if (engine && engine.state === EngineState.Running) {
        try {
          await engine.selectChoice(target);
        } catch (e) {
          setError((e as Error).message);
        }
      }
    };

    // Resize observer — only resize, don't force redraw
    const ro = new ResizeObserver(() => {
      if (containerRef.current && renderer) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        renderer.resize(width, height);
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      // Defensive: stop() is safe to call multiple times;
      // dispose() checks _disposed flag internally.
      const r = rendererRef.current;
      if (r) { r.stop(); r.dispose(); }
      ro.disconnect();
    };
  }, [setError]);

  // ---- Engine bridge: convert engine events to renderer commands ----
  const setupEngineBridge = useCallback((engine: GalEngine, renderer: PreviewRenderer) => {
    const addUrlFn = renderer.addObjectUrl.bind(renderer);
    const loadBg = async (image: string) => {
      // Read imageCache from store at call time to avoid stale-closure cache misses
      const img = await loadPreviewImage(
        image, projectRef.current, vfs,
        cacheImage,
        usePreviewStore.getState().imageCache,
        setError, addUrlFn,
      );
      return img;
    };

    // Background
    engine.sceneManager.onBackground = async (image, transition, duration) => {
      const img = await loadBg(image);
      renderer.setBackground(img, transition, duration);
    };

    // Dialogue
    engine.sceneManager.onDialogue = async (data: DialogueData) => {
      const name = data.display_name || data.character;
      renderer.showDialogue(name, data.text);
    };

    // Sprites
    engine.sceneManager.onShowSprite = async (character, sprite, position) => {
      const project = projectRef.current;
      if (!project) return;
      const spritePath = `${project.assetDirs.sprites}/${sprite}`;
      const img = await loadPreviewImage(
        spritePath, project, vfs,
        cacheImage,
        usePreviewStore.getState().imageCache,
        setError, addUrlFn,
      );
      renderer.showSprite(character, img, (position as SpritePos) || 'center', 'fade', 0.3);
    };

    engine.sceneManager.onHideSprite = async (character) => {
      renderer.hideSprite(character, 'fade', 0.3);
    };

    // CG
    engine.sceneManager.onShowCG = async (image, duration) => {
      const project = projectRef.current;
      if (!project) return;
      const cgPath = `${project.assetDirs.cgs}/${image}`;
      const img = await loadPreviewImage(
        cgPath, project, vfs,
        cacheImage,
        usePreviewStore.getState().imageCache,
        setError, addUrlFn,
      );
      renderer.showCG(img, duration);
    };

    engine.sceneManager.onHideCG = async () => {
      renderer.hideCG(0.5);
    };

    // Choices
    engine.sceneManager.onChoice = async (data: ChoiceData) => {
      renderer.showChoices(data.choices);
      // Return -1 => handled by onClick callback
      return -1;
    };

    // Wait
    engine.sceneManager.onWait = async (duration: number) => {
      return new Promise((r) => setTimeout(r, duration * 1000));
    };

    // Transitions
    engine.sceneManager.onTransition = async (effect, duration) => {
      // Transitions are handled by the renderer during background change
    };

    // Scene end
    engine.sceneManager.onSceneEnd = async () => {
      renderer.hideDialogue();
      setRunning(false);
    };

    // BGM/SFX (no audio preview for now)
    engine.sceneManager.onBGM = async () => {};
    engine.sceneManager.onStopBGM = async () => {};
    engine.sceneManager.onSFX = async () => {};
    engine.sceneManager.onVoice = async () => {};
  }, [vfs, cacheImage, setError, setRunning]);

  // ---- Play button ----
  const handlePlay = useCallback(async () => {
    // Prevent concurrent play invocations (rapid double-click, etc.)
    if (playingRef.current) return;
    playingRef.current = true;
    try {
      setError(null);

      // Recreate renderer if it was disposed by a previous Stop.
      // After handleStop → renderer.dispose(), the canvas is zeroed and
      // the renderer instance is dead — we must create a new one.
      const canvas = canvasRef.current;
      if (!canvas) return;

      let renderer = rendererRef.current;
      if (!renderer || (renderer as any)._disposed) {
        renderer = new PreviewRenderer(canvas);
        renderer.setResolution(1280, 720);
        // Re-attach interaction handlers for the new renderer
        renderer.onClick = async () => {
          const engine = engineRef.current;
          if (engine && engine.state === EngineState.Running) {
            try { await engine.advance(); }
            catch (e) { setError((e as Error).message); }
          }
        };
        renderer.onChoice = async (target: string) => {
          const engine = engineRef.current;
          if (engine && engine.state === EngineState.Running) {
            try { await engine.selectChoice(target); }
            catch (e) { setError((e as Error).message); }
          }
        };
        rendererRef.current = renderer;
      }

      // Dispose any previously running engine before creating a new one.
      // Without this, the old engine's async callbacks keep a closure
      // reference to the old VFS/store actions, causing a memory leak.
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }

      // Create engine
      const memVfs = new InMemoryVFS();
      const engine = new GalEngine(memVfs);
      engineRef.current = engine;

      // Load project settings
      const loader = new ProjectLoader(vfs);
      const project = await loader.load(projectPath);
      projectRef.current = project;

      // Load settings.json into memory
      const settingsRaw = await vfs.readTextFile(`${projectPath}/settings.json`);
      memVfs.setText(`${projectPath}/settings.json`, settingsRaw);

      // Load all scene files into memory
      const sceneIds = Object.keys(project.settings.scenes);
      for (const sid of sceneIds) {
        const scenePath = project.settings.scenes[sid];
        const fullPath = `${project.scriptDir}/${scenePath}`;
        try {
          const content = await vfs.readTextFile(fullPath);
          memVfs.setText(fullPath, content);
        } catch {
          console.warn(`Scene file not found: ${fullPath}`);
        }
      }

      // Bridge engine ↔ renderer
      setupEngineBridge(engine, renderer);

      // Update loader to use memory VFS
      (engine as any).loader = new ProjectLoader(memVfs);

      // Start
      setRunning(true);
      setScene('', 0);

      // Get first scene
      const firstScene = sceneIds[0];
      if (!firstScene) {
        setError(t('preview.noScenes'));
        return;
      }

      const source = await memVfs.readTextFile(`${project.scriptDir}/${project.settings.scenes[firstScene]}`);
      const parsedScene = SceneParser.parse(source, firstScene);
      renderer.reset();

      // Set font from settings
      const cfg = project.settings;
      renderer.setFont(
        cfg.ui.textbox.font || 'Inter, sans-serif',
        cfg.ui.textbox.size || 22,
        cfg.ui.textbox.color || '#ffffff',
        cfg.project.author ? '#c8b4ff' : '#ffffff',
      );

      // Start render loop
      renderer.start();

      // Start scene
      await engine.start(firstScene);
      setScene(parsedScene.sceneName || firstScene, 0);

    } catch (e) {
      setError((e as Error).message);
      setRunning(false);
    } finally {
      playingRef.current = false;
    }
  }, [projectPath, vfs, setError, setRunning, setScene, setupEngineBridge]);

  // ---- Stop button ----
  const handleStop = useCallback(() => {
    const renderer = rendererRef.current;
    const engine = engineRef.current;

    if (renderer) {
      // 1. Visual cleanup + state reset while _playing is still true
      renderer.drawBlank();
      renderer.reset();

      // 2. Stop the loop LAST — _playing ← false prevents _markDirty()
      //    from restarting the loop (root cause of memory leak)
      renderer.stop();

      // 3. Full dispose to release GPU resources (canvas zeroed, offscreen freed)
      renderer.dispose();
      rendererRef.current = null;
    }

    // 4. Dispose engine (releases scene manager, event emitters, etc.)
    if (engine) {
      engine.dispose();
    }
    engineRef.current = null;
    projectRef.current = null;

    setRunning(false);
    setIsPaused(false);
    setPaused(false);

    // 5. Clear image cache AFTER renderer.releaseObjectUrls() in stop()
    usePreviewStore.getState().clearCache();
  }, [setRunning, setPaused]);

  // ---- Pause / Resume ----
  const handlePauseToggle = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    setIsPaused((p) => {
      if (!p) {
        // Pause: suspend the render loop WITHOUT releasing resources.
        // Using renderer.pause() instead of renderer.stop() is critical:
        // stop() would revoke objectUrls and clear _playing, making
        // resume() unable to restart with the same assets.
        renderer.pause();
        setPaused(true);
        return true;
      } else {
        // Resume: restart the render loop from where it left off.
        renderer.resume();
        setPaused(false);
        return false;
      }
    });
  }, [setPaused]);

  // ---- Skip (complete text) ----
  const handleSkip = useCallback(() => {
    rendererRef.current?.completeText();
  }, []);

  // ---- Render ----
  return (
    <div className="preview-panel" ref={containerRef}>
      {/* Toolbar */}
      <div className="preview-toolbar">
        <div className="preview-toolbar-left">
          <button
            className={`preview-btn ${isRunning ? 'active' : ''}`}
            onClick={handlePlay}
            disabled={isRunning}
            title={t('preview.play')}
          >
            ▶
          </button>
          <button
            className="preview-btn"
            onClick={handleStop}
            disabled={!isRunning}
            title={t('preview.stop')}
          >
            ■
          </button>
          <button
            className="preview-btn"
            onClick={handlePauseToggle}
            disabled={!isRunning}
            title={t('preview.pauseResume')}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
          <button
            className="preview-btn"
            onClick={handleSkip}
            disabled={!isRunning}
            title={t('preview.skipText')}
          >
            ⏭
          </button>
        </div>
        <div className="preview-toolbar-right">
          <span className="preview-scene-name">
            {sceneName || t('preview.preview')}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="preview-canvas-container">
        <canvas ref={canvasRef} className="preview-canvas" />
      </div>

      {/* Error overlay */}
      {lastError && (
        <div className="preview-error-overlay">
          <div className="preview-error-box">
            <strong>{t('preview.error')}</strong>
            <p>{lastError}</p>
            <button onClick={() => setError(null)}>{t('preview.dismiss')}</button>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// Asset loading helper
// =========================================================================

// Cache for placeholder images (avoids recreating canvas + Image for same path)
const _placeholderCache = new Map<string, HTMLImageElement>();

async function loadPreviewImage(
  assetPath: string,
  project: LoadedProject | null,
  vfs: VFS,
  cacheImageFn: (key: string, img: HTMLImageElement) => void,
  imageCache: Record<string, HTMLImageElement>,
  setError: (err: string | null) => void,
  addObjectUrl?: (url: string) => void,
): Promise<HTMLImageElement | null> {
  if (!assetPath) return null;

  // Check cache first
  if (imageCache[assetPath]) return imageCache[assetPath];

  try {
    // Try loading via VFS → object URL
    const data = await vfs.readBinaryFile(assetPath);
    const blob = new Blob([data as BlobPart]);
    const url = URL.createObjectURL(blob);
    addObjectUrl?.(url);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Failed to load image: ${assetPath}`));
      el.src = url;
    });

    cacheImageFn(assetPath, img);
    return img;
  } catch {
    // Fallback: generate placeholder colored rectangle (cached — no repeated canvas allocation)
    console.warn(`Image not found: ${assetPath}, using placeholder`);
    const placeholder = getOrCreatePlaceholder(assetPath);
    cacheImageFn(assetPath, placeholder);
    return placeholder;
  }
}

function getOrCreatePlaceholder(path: string): HTMLImageElement {
  const cached = _placeholderCache.get(path);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;

  // Generate color from path hash
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    hash = ((hash << 5) - hash) + path.charCodeAt(i);
    hash |= 0;
  }
  const r = ((hash >> 16) & 0xff);
  const g = ((hash >> 8) & 0xff);
  const b = (hash & 0xff);

  // Gradient placeholder
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
  grad.addColorStop(1, `rgba(${(r + 60) % 255}, ${(g + 40) % 255}, ${(b + 80) % 255}, 0.5)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Label
  ctx.fillStyle = '#ffffff88';
  ctx.font = '14px Inter, sans-serif';
  ctx.textAlign = 'center';
  const fileName = path.split('/').pop() || path;
  ctx.fillText(fileName, canvas.width / 2, canvas.height / 2);

  // Create image from canvas
  const img = new Image();
  img.src = canvas.toDataURL();

  _placeholderCache.set(path, img);
  return img;
}
