/**
 * Scene Manager — command dispatcher with call stack.
 * Python: galengine/scene/scene_manager.py
 */

import { CommandType } from './types';
import type {
  Command, ParsedScene, SceneState, CallStackEntry,
  DialogueData, ChoiceData, SetFlagData, ConditionalData,
} from './types';
import type { Emitter } from '../base/event';
import type { ConfigManager } from './config';

// =========================================================================
// Scene Manager
// =========================================================================

export class SceneManager {
  private _currentScene: ParsedScene | null = null;
  private _commandIndex = 0;
  private _callStack: CallStackEntry[] = [];
  private _globalFlags: Record<string, unknown> = {};
  private _visitedScenes: string[] = [];

  // State flags
  waitingForClick = false;
  waitingForChoice = false;
  isCgMode = false;

  // Events (connected by GalEngine)
  onDialogue?: (data: DialogueData) => Promise<void>;
  onBackground?: (image: string, transition?: string, duration?: number) => Promise<void>;
  onBGM?: (file: string, loop?: boolean, fadeIn?: number) => Promise<void>;
  onStopBGM?: () => Promise<void>;
  onSFX?: (file: string, volume?: number) => Promise<void>;
  onVoice?: (file: string) => Promise<void>;
  onShowSprite?: (character: string, sprite: string, pos?: string) => Promise<void>;
  onHideSprite?: (character: string) => Promise<void>;
  onShowCG?: (image: string, duration?: number) => Promise<void>;
  onHideCG?: () => Promise<void>;
  onChoice?: (data: ChoiceData) => Promise<number>;
  onWait?: (duration: number) => Promise<void>;
  onTransition?: (effect: string, duration: number) => Promise<void>;
  onSceneEnd?: () => Promise<void>;

  constructor(private _config: ConfigManager) {}

  // ---- Accessors ----

  get currentSceneId(): string | null {
    return this._currentScene?.sceneId ?? null;
  }

  get currentCommandIndex(): number {
    return this._commandIndex;
  }

  get flags(): Readonly<Record<string, unknown>> {
    return this._globalFlags;
  }

  get callStack(): readonly CallStackEntry[] {
    return this._callStack;
  }

  get visitedScenes(): readonly string[] {
    return this._visitedScenes;
  }

  // ---- Scene Management ----

  /** Load a parsed scene and begin execution. */
  async startScene(scene: ParsedScene): Promise<void> {
    this._currentScene = scene;
    this._commandIndex = 0;
    this.waitingForClick = false;
    this.waitingForChoice = false;
    this.isCgMode = false;

    if (!this._visitedScenes.includes(scene.sceneId)) {
      this._visitedScenes.push(scene.sceneId);
    }

    await this._advance();
  }

  /** Advance to the next command. Called after click or auto-advance. */
  async advance(): Promise<void> {
    if (this.waitingForChoice) return; // must resolve choice first
    this.waitingForClick = false;
    this._commandIndex++;
    await this._advance();
  }

  /** Resolve a choice and jump to target. */
  async selectChoice(target: string): Promise<void> {
    this.waitingForChoice = false;
    await this._jumpToTarget(target);
  }

  // ---- Private ----

  private async _advance(): Promise<void> {
    if (!this._currentScene) return;
    const commands = this._currentScene.commands;

    while (this._commandIndex < commands.length) {
      const cmd = commands[this._commandIndex];
      await this._dispatch(cmd);

      // If command pauses execution (dialogue waiting, choice, etc.), stop loop
      if (this.waitingForClick || this.waitingForChoice || this.isCgMode) {
        return;
      }
      this._commandIndex++;
    }

    // End of scene
    await this.onSceneEnd?.();
  }

  private async _dispatch(cmd: Command): Promise<void> {
    switch (cmd.type) {
      case CommandType.Dialogue: {
        const d = cmd.data as unknown as DialogueData;
        await this.onDialogue?.(d);
        // Auto-mode check
        if (this._config.get('autoMode')) {
          await this.onWait?.(this._config.get('autoDelay'));
        } else {
          this.waitingForClick = true;
        }
        break;
      }

      case CommandType.Narration: {
        const text = (cmd.data as { text: string }).text;
        await this.onDialogue?.({ character: '', text, display_name: '' });
        if (this._config.get('autoMode')) {
          await this.onWait?.(this._config.get('autoDelay'));
        } else {
          this.waitingForClick = true;
        }
        break;
      }

      case CommandType.Background:
        await this.onBackground?.((cmd.data as any).image, (cmd.data as any).transition, (cmd.data as any).duration);
        break;

      case CommandType.BGM:
        await this.onBGM?.((cmd.data as any).file, (cmd.data as any).loop, (cmd.data as any).fadeIn);
        break;

      case CommandType.StopBGM:
        await this.onStopBGM?.();
        break;

      case CommandType.SFX:
        await this.onSFX?.((cmd.data as any).file, (cmd.data as any).volume);
        break;

      case CommandType.Voice:
        await this.onVoice?.((cmd.data as any).file);
        break;

      case CommandType.ShowSprite:
        await this.onShowSprite?.((cmd.data as any).character, (cmd.data as any).sprite, (cmd.data as any).position);
        break;

      case CommandType.HideSprite:
        await this.onHideSprite?.((cmd.data as any).character);
        break;

      case CommandType.ShowCG:
        this.isCgMode = true;
        await this.onShowCG?.((cmd.data as any).image, (cmd.data as any).duration);
        break;

      case CommandType.HideCG:
        this.isCgMode = false;
        await this.onHideCG?.();
        break;

      case CommandType.Choice: {
        const choiceData = cmd.data as unknown as ChoiceData;
        this.waitingForChoice = true;
        const selected = await this.onChoice?.(choiceData);
        if (selected !== undefined && selected >= 0) {
          this.waitingForChoice = false;
          const target = choiceData.choices[selected]?.target;
          if (target) await this._jumpToTarget(target);
        }
        break;
      }

      case CommandType.Jump:
        await this._jumpToTarget((cmd.data as any).target);
        break;

      case CommandType.SetFlag: {
        const { flags } = cmd.data as unknown as SetFlagData;
        Object.entries(flags).forEach(([k, v]) => {
          // Support += operator
          if (typeof v === 'number' && typeof this._globalFlags[k] === 'number') {
            this._globalFlags[k] = (this._globalFlags[k] as number) + v;
          } else {
            this._globalFlags[k] = v;
          }
        });
        break;
      }

      case CommandType.Conditional: {
        const cond = cmd.data as unknown as ConditionalData;
        const result = this._evaluateCondition(cond.condition);
        const branch = result ? cond.then : (cond.else ?? []);
        for (const subCmd of branch) {
          await this._dispatch({
            ...subCmd,
            lineNumber: cmd.lineNumber,
          } as Command);
        }
        break;
      }

      case CommandType.Wait:
        await this.onWait?.((cmd.data as any).duration);
        break;

      case CommandType.Transition:
        await this.onTransition?.((cmd.data as any).effect, (cmd.data as any).duration);
        break;

      case CommandType.Label:
        // No-op — labels are pre-indexed
        break;

      case CommandType.CallScene:
        // Save current position
        this._callStack.push({
          scene_id: this._currentScene!.sceneId,
          command_index: this._commandIndex,
        });
        // Target scene will be loaded externally
        await this._jumpToTarget((cmd.data as any).sceneId);
        break;

      case CommandType.Return: {
        const target = (cmd.data as any).target as string | undefined;
        if (target) {
          await this._jumpToTarget(target);
        } else if (this._callStack.length > 0) {
          const prev = this._callStack.pop()!;
          // Signal to load prev scene at prev index
          // (external handler must reload the scene)
          await this._jumpToTarget(`${prev.scene_id}#__return_${prev.command_index + 1}`);
        } else {
          await this.onSceneEnd?.();
        }
        break;
      }

      case CommandType.EndScene: {
        const next = (cmd.data as any).nextScene as string | undefined;
        if (next) await this._jumpToTarget(next);
        else await this.onSceneEnd?.();
        break;
      }
    }
  }

  // ---- Jump / Condition Evaluation ----

  private async _jumpToTarget(target: string): Promise<void> {
    if (!this._currentScene) return;

    // Check if target points to a label in current scene
    if (target.includes('#')) {
      const [sceneId, label] = target.split('#');
      if (sceneId === this._currentScene.sceneId || !sceneId) {
        // Same scene, jump to label
        const idx = this._currentScene.labels[label];
        if (idx !== undefined) {
          this._commandIndex = idx;
          await this._advance();
          return;
        }
      }
      // Different scene — external handler
      return;
    }

    // Jump to another scene — external handler must load it
    // (signaled by returning from advance() with unresolved target)
    // For now: mark as scene end
    await this.onSceneEnd?.();
  }

  private _evaluateCondition(condition: string): boolean {
    // Simple expression evaluator
    // Supports: flags.key == value, flags.key != value, >=, <=, >, <
    condition = condition.trim();

    // Parse pattern: "flags.X OP value"
    const match = condition.match(
      /^flags\.(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/
    );
    if (!match) {
      console.warn(`Cannot evaluate condition: ${condition}`);
      return false;
    }

    const [, key, op, rawValue] = match;
    const left = this._globalFlags[key];
    const right = parseFlagValueRaw(rawValue.trim());

    switch (op) {
      case '==': return left === right;
      case '!=': return left !== right;
      case '>=': return Number(left) >= Number(right);
      case '<=': return Number(left) <= Number(right);
      case '>':  return Number(left) > Number(right);
      case '<':  return Number(left) < Number(right);
      default: return false;
    }
  }

  // ---- State Snapshot (for save) ----

  getState(): SceneState | null {
    if (!this._currentScene) return null;
    return {
      scene: this._currentScene,
      commandIndex: this._commandIndex,
      waitingForClick: this.waitingForClick,
      waitingForChoice: this.waitingForChoice,
      isCgMode: this.isCgMode,
    };
  }

  restoreState(state: SceneState): void {
    this._currentScene = state.scene;
    this._commandIndex = state.commandIndex;
    this.waitingForClick = state.waitingForClick;
    this.waitingForChoice = state.waitingForChoice;
    this.isCgMode = state.isCgMode;
  }
}

function parseFlagValueRaw(v: string): unknown {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  const num = Number(v);
  if (!isNaN(num)) return num;
  // Remove quotes
  return v.replace(/^["']|["']$/g, '');
}
