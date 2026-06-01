/**
 * GalEngine — Main engine class (central coordinator).
 * Python: galengine/core/engine.py
 *
 * Pattern: Holds references to all subsystems, orchestrates lifecycle.
 */

import type { EngineConfig, DeepPartial, ParsedScene, SaveData, FlowchartNode } from './types';
import { ConfigManager } from './config';
import { ProjectLoader, type LoadedProject, type VFS } from './loader';
import { SceneParser } from './parser';
import { SceneManager } from './scene';
import { DialogueSystem } from './dialogue';
import { SpriteManager } from './sprite';
import { AudioManager } from './audio';
import { SaveManager } from './save';
import { FlowchartEngine } from './flowchart';
import { Emitter, type Disposable } from '../base/event';
import { DisposableBase } from '../base/lifecycle';

// =========================================================================
// Engine State
// =========================================================================

export enum EngineState {
  Uninitialized = 'uninitialized',
  Loading = 'loading',
  Ready = 'ready',
  Running = 'running',
  Paused = 'paused',
  Error = 'error',
}

// =========================================================================
// GalEngine
// =========================================================================

export class GalEngine extends DisposableBase {
  // Subsystems
  readonly config: ConfigManager;
  readonly loader: ProjectLoader;
  readonly sceneManager: SceneManager;
  readonly dialogue: DialogueSystem;
  readonly sprites: SpriteManager;
  readonly audio: AudioManager;
  readonly save: SaveManager;
  readonly flowchart: FlowchartEngine;

  // State
  private _state: EngineState = EngineState.Uninitialized;
  private _currentProject: LoadedProject | null = null;

  // Events
  private readonly _onStateChange = new Emitter<EngineState>();
  readonly onStateChange = this._onStateChange.event;

  private readonly _onError = new Emitter<Error>();
  readonly onError = this._onError.event;

  constructor(vfs: VFS, initialConfig?: DeepPartial<EngineConfig>) {
    super();
    this.config = new ConfigManager(initialConfig);
    this.loader = new ProjectLoader(vfs);
    this.sceneManager = new SceneManager(this.config);
    this.dialogue = new DialogueSystem(this.config);
    this.sprites = new SpriteManager();
    this.audio = new AudioManager(this.config);
    this.save = new SaveManager();
    this.flowchart = new FlowchartEngine();

    this._registerSubsystemEvents();
    this._setState(EngineState.Ready);
  }

  // ---- Accessors ----

  get state(): EngineState { return this._state; }
  get currentProject(): LoadedProject | null { return this._currentProject; }
  get currentSceneId(): string | null { return this.sceneManager.currentSceneId; }
  get flags(): Readonly<Record<string, unknown>> { return this.sceneManager.flags; }

  // ---- Project Lifecycle ----

  /** Load a project by path. */
  async loadProject(projectPath: string): Promise<void> {
    this._setState(EngineState.Loading);
    try {
      this._currentProject = await this.loader.load(projectPath);
      this._setState(EngineState.Ready);
    } catch (e) {
      this._setState(EngineState.Error);
      this._onError.fire(e as Error);
      throw e;
    }
  }

  /** Start the game from a scene ID. */
  async start(sceneId?: string): Promise<void> {
    if (!this._currentProject) throw new Error('No project loaded.');

    const id = sceneId ?? this.loader.listScenes(this._currentProject)[0];
    if (!id) throw new Error('No scenes in project.');

    const source = await this.loader.loadScene(this._currentProject, id);
    const parsedScene = SceneParser.parse(source, id);

    // Build flowchart
    this.flowchart.buildFromProject(this._currentProject);

    this._setState(EngineState.Running);
    await this.sceneManager.startScene(parsedScene);
  }

  /** Advance to next command (after click). */
  async advance(): Promise<void> {
    await this.sceneManager.advance();
  }

  /** Select a choice option. */
  async selectChoice(target: string): Promise<void> {
    await this.sceneManager.selectChoice(target);
  }

  /** Load and start a specific scene by ID. */
  async gotoScene(sceneId: string): Promise<void> {
    if (!this._currentProject) throw new Error('No project loaded.');
    const source = await this.loader.loadScene(this._currentProject, sceneId);
    const parsedScene = SceneParser.parse(source, sceneId);
    await this.sceneManager.startScene(parsedScene);
  }

  // ---- Save / Load ----

  async saveGame(slotId: number): Promise<void> {
    const saveData = this._buildSaveData(slotId);
    await this.save.save(slotId, saveData);
  }

  async loadGame(slotId: number): Promise<SaveData> {
    const data = await this.save.load(slotId);
    // Restore flags
    Object.assign(this.sceneManager.flags as any, data.flags);
    // Go to saved scene
    await this.gotoScene(data.sceneId);
    // Jump to saved command index
    // (simplified — full restore needs more work)
    return data;
  }

  // ---- Private ----

  private _setState(s: EngineState): void {
    this._state = s;
    this._onStateChange.fire(s);
  }

  private _registerSubsystemEvents(): void {
    this.sceneManager.onDialogue = async (data) => {
      await this.dialogue.show(data);
    };
    this.sceneManager.onBackground = async (image, transition, duration) => {
      // Delegate to renderer (set by platform layer)
    };
    this.sceneManager.onBGM = async (file, loop, fadeIn) => {
      await this.audio.playBGM(file, loop, fadeIn);
    };
    this.sceneManager.onStopBGM = async () => {
      await this.audio.stopBGM();
    };
    this.sceneManager.onSFX = async (file, volume) => {
      await this.audio.playSFX(file, volume);
    };
    this.sceneManager.onVoice = async (file) => {
      await this.audio.playVoice(file);
    };
    this.sceneManager.onSceneEnd = async () => {
      this._setState(EngineState.Ready);
    };
  }

  private _buildSaveData(slotId: number): SaveData {
    const state = this.sceneManager.getState();
    return {
      slotId,
      timestamp: Date.now(),
      dateString: new Date().toISOString(),
      sceneId: state?.scene.sceneId ?? '',
      sceneName: state?.scene.sceneName ?? '',
      commandIndex: state?.commandIndex ?? 0,
      chapter: state?.scene.chapter ?? '',
      route: state?.scene.route ?? null,
      screenshot: null,
      flags: { ...this.sceneManager.flags },
      callStack: [...this.sceneManager.callStack],
      visitedScenes: [...this.sceneManager.visitedScenes],
      bgmFile: this.audio.currentBGM,
      dialogueHistory: this.dialogue.getHistory(),
      meta: {},
    };
  }
}

// ---- Singleton ----

let _engine: GalEngine | null = null;

export function getEngine(vfs: VFS, config?: DeepPartial<EngineConfig>): GalEngine {
  if (!_engine) {
    _engine = new GalEngine(vfs, config);
  }
  return _engine;
}
