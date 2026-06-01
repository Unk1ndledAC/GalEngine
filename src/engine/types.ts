/**
 * GalEngine Type System — Complete data model interfaces.
 * Mapped from Python galengine/ core types.
 *
 * Convention:
 *   - Python dataclass  → TypeScript interface
 *   - Python Enum       → TypeScript enum
 *   - Python Dict[str,*] → Record<string,*>
 *   - Optional[T]       → T | undefined
 */

// =========================================================================
// 1. Engine Configuration (Python: core/config.py → EngineConfig)
// =========================================================================

export interface EngineConfig {
  windowWidth: number;
  windowHeight: number;
  fullscreen: boolean;
  fps: number;
  textSpeed: number;             // chars/sec, default 40
  textColor: RGBA;
  textSize: number;              // default 24
  textFont: string | null;
  nameColor: RGBA;
  masterVolume: number;          // 0–1
  bgmVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  characterVoiceVolumes: Record<string, number>;
  skipRead: boolean;
  skipUnread: boolean;
  autoMode: boolean;
  autoDelay: number;             // seconds
  // Key bindings (13)
  keyConfirm: number;
  keyCancel: number;
  keySkip: number;
  keyAuto: number;
  keyHistory: number;
  keySave: number;
  keyLoad: number;
  keySettings: number;
  keyQuickSave: number;
  keyQuickLoad: number;
  keyHide: number;
  keyFullscreen: number;
  keyScreenshot: number;
}

export type RGBA = [number, number, number, number];

// =========================================================================
// 2. Command Types (20 types — Python: parser/*)
// =========================================================================

export enum CommandType {
  Dialogue    = 'dialogue',
  Narration   = 'narration',
  ShowSprite  = 'show_sprite',
  HideSprite  = 'hide_sprite',
  Background  = 'background',
  BGM         = 'bgm',
  StopBGM     = 'stop_bgm',
  SFX         = 'sfx',
  Voice       = 'voice',
  ShowCG      = 'show_cg',
  HideCG      = 'hide_cg',
  Choice      = 'choice',
  Jump        = 'jump',
  SetFlag     = 'set_flag',
  Conditional = 'conditional',
  Wait        = 'wait',
  Transition  = 'transition',
  Label       = 'label',
  CallScene   = 'call_scene',
  Return      = 'return',
  EndScene    = 'end_scene',
}

// ---- Per-command data shapes ----

export interface DialogueData {
  character: string;
  display_name?: string;
  text: string;
  voice?: string;
}

export interface NarrationData {
  text: string;
}

export interface ShowSpriteData {
  character: string;
  sprite: string;
  position?: SpritePosition;
  transition?: string;
  duration?: number;
}

export interface HideSpriteData {
  character: string;
  transition?: string;
  duration?: number;
}

export interface BackgroundData {
  image: string;
  transition?: string;
  duration?: number;
}

export interface BGMData {
  file: string;
  loop?: boolean;
  fadeIn?: number;
}

export interface SFXData {
  file: string;
  volume?: number;
}

export interface VoiceData {
  file: string;
  character?: string;
}

export interface ShowCGData {
  image: string;
  duration?: number;
}

export interface ChoiceData {
  prompt: string;
  choices: ChoiceOption[];
}

export interface ChoiceOption {
  text: string;
  target: string;
}

export interface JumpData {
  target: string;  // scene_id or scene_id#label
}

export interface SetFlagData {
  flags: Record<string, unknown>;
}

export interface ConditionalData {
  condition: string;            // e.g. "flags.seen_event == true"
  then: CommandData[];
  else?: CommandData[];
}

export interface WaitData {
  duration: number;             // seconds
}

export interface TransitionData {
  effect: TransitionEffect;
  duration: number;
}

export interface LabelData {
  name: string;
}

export interface CallSceneData {
  sceneId: string;
}

export interface ReturnData {
  target?: string;
}

export interface EndSceneData {
  nextScene?: string;
}

/** Discriminated union of command data — keyed by `type`. */
export type CommandData =
  | { type: CommandType.Dialogue;    data: DialogueData }
  | { type: CommandType.Narration;   data: NarrationData }
  | { type: CommandType.ShowSprite;  data: ShowSpriteData }
  | { type: CommandType.HideSprite;  data: HideSpriteData }
  | { type: CommandType.Background;  data: BackgroundData }
  | { type: CommandType.BGM;         data: BGMData }
  | { type: CommandType.StopBGM;     data: Record<string, never> }
  | { type: CommandType.SFX;         data: SFXData }
  | { type: CommandType.Voice;       data: VoiceData }
  | { type: CommandType.ShowCG;      data: ShowCGData }
  | { type: CommandType.HideCG;      data: Record<string, never> }
  | { type: CommandType.Choice;      data: ChoiceData }
  | { type: CommandType.Jump;        data: JumpData }
  | { type: CommandType.SetFlag;     data: SetFlagData }
  | { type: CommandType.Conditional; data: ConditionalData }
  | { type: CommandType.Wait;        data: WaitData }
  | { type: CommandType.Transition;  data: TransitionData }
  | { type: CommandType.Label;       data: LabelData }
  | { type: CommandType.CallScene;   data: CallSceneData }
  | { type: CommandType.Return;      data: ReturnData }
  | { type: CommandType.EndScene;    data: EndSceneData };

/** Runtime command — CommandData with line number. */
export type Command = CommandData & { lineNumber: number };

/** Deep partial utility. */
export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/** Loaded project alias (defined in loader.ts). */
export type { LoadedProject } from './loader';

// ---- Enums ----

export type SpritePosition =
  | 'left' | 'left_center' | 'center' | 'right_center' | 'right' | 'custom';

export type TransitionEffect =
  | 'none' | 'fade' | 'fade_to_black' | 'fade_to_white'
  | 'crossfade' | 'dissolve'
  | 'slide_left' | 'slide_right' | 'slide_up' | 'slide_down'
  | 'blinds' | 'iris_in' | 'iris_out'
  | 'wipe_left' | 'wipe_right'
  | 'pixelate' | 'zoom_in' | 'zoom_out' | 'rotate';

// =========================================================================
// 3. Parsed Scene (Python: parser/* → ParsedScene)
// =========================================================================

export interface SceneFile {
  id: string;
  name?: string;
  commands: CommandData[];
}

export interface ParsedScene {
  sceneId: string;
  sceneName: string;
  chapter: string;
  route: string | null;
  background: string | null;
  bgm: string | null;
  commands: Command[];
  labels: Record<string, number>;  // label name → command index
}

// =========================================================================
// 4. Project Settings (Python: settings.json schema)
// =========================================================================

export interface ProjectSettings {
  project: {
    name: string;
    version: string;
    author?: string;
    resolution: [number, number];
  };
  window: {
    width: number;
    height: number;
    title: string;
    icon?: string;
    fullscreen: boolean;
  };
  assets: {
    backgrounds: string;
    sprites: string;
    cgs: string;
    audio: string;
    fonts: string;
    ui: string;
  };
  scenes: Record<string, string>;      // scene_id → file path
  ui: {
    layout: string;
    textbox: TextBoxConfig;
  };
  audio: {
    master_volume: number;
    bgm_volume: number;
    se_volume: number;
    voice_volume: number;
  };
  save: {
    slots: number;
    screenshot_width: number;
    screenshot_height: number;
  };
  // Optional sections
  characters?: CharacterConfig[];
  cgs?: CGConfig[];
  scenes_gallery?: SceneGalleryItem[];
  music_gallery?: MusicGalleryItem[];
  branches?: Record<string, BranchConfig>;
  mappings?: AssetMappings;
  title_screen?: TitleScreenConfig;
  main_menu?: MainMenuConfig;
  startup?: StartupConfig;
}

export interface TextBoxConfig {
  style: string;
  font: string;
  size: number;
  color: string;
  background: string;
}

export interface CharacterConfig {
  id: string;
  sprites_dir: string;
  has_route: boolean;
  display_name: string;
}

export interface CGConfig {
  id: string;
  file: string;
  display_name: string;
  description: string;
  category: string;
  unlock_condition: string;
}

export interface SceneGalleryItem {
  id: string;
  name: string;
  scene_id: string;
}

export interface MusicGalleryItem {
  id: string;
  file: string;
  display_name: string;
  category: string;
}

export interface BranchConfig {
  name: string;
  entry_scene: string;
}

export interface AssetMappings {
  backgrounds?: Record<string, string>;
  sprites?: Record<string, string>;
  cgs?: Record<string, string>;
  audio_bgm?: Record<string, string>;
  audio_se?: Record<string, string>;
  audio_voice?: Record<string, string>;
}

export interface TitleScreenConfig {
  background: string;
  bgm: string;
  logo?: string;
  skip_enabled: boolean;
}

export interface MainMenuConfig {
  background: string;
  bgm: string;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  label: string;
  action: string;
  shortcut?: string;
  visible_if?: string;
}

export interface StartupConfig {
  splash_screens: SplashConfig[];
  disclaimer_text: string;
}

export interface SplashConfig {
  image: string;
  duration: number;
  skip_enabled: boolean;
}

// =========================================================================
// 5. UI Layout (Python: ui/components/layout.py → ui-layout.json)
// =========================================================================

export interface UILayout {
  elements: UIElement[];
}

export interface UIElement {
  id: string;
  type: 'panel' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  anchor: string;
  style: UIElementStyle;
  text?: string;                  // supports {{variable}} templates
  visible: boolean;
  visible_if?: string;
}

export interface UIElementStyle {
  background_color?: string;      // rgba(...)
  text_color?: string;
  text_size?: number;
  border_radius?: number | [number, number, number, number];
  padding?: [number, number, number, number];
  align?: string;
  valign?: string;
}

// =========================================================================
// 6. Scene Runtime State (Python: scene/scene_manager.py → SceneState)
// =========================================================================

export interface SceneState {
  scene: ParsedScene;
  commandIndex: number;
  waitingForClick: boolean;
  waitingForChoice: boolean;
  isCgMode: boolean;
}

// =========================================================================
// 7. Sprite State (Python: scene/sprite_manager.py → SpriteState)
// =========================================================================

export interface SpriteState {
  characterId: string;
  currentVariant: string;
  position: SpritePosition;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  zOrder: number;
  visible: boolean;
  flipped: boolean;
  entranceEffect: string;
  entranceDuration: number;
}

// =========================================================================
// 8. Save Data (Python: save/save_manager.py → SaveData)
// =========================================================================

export interface SaveData {
  slotId: number;
  timestamp: number;
  dateString: string;
  sceneId: string;
  sceneName: string;
  commandIndex: number;
  chapter: string;
  route: string | null;
  screenshot: Uint8Array | null;
  flags: Record<string, unknown>;
  callStack: CallStackEntry[];
  visitedScenes: string[];
  bgmFile: string | null;
  dialogueHistory: DialogueHistoryEntry[];
  meta: Record<string, unknown>;
}

export interface CallStackEntry {
  scene_id: string;
  command_index: number;
}

export interface DialogueHistoryEntry {
  character: string;
  text: string;
  timestamp: number;
}

// =========================================================================
// 9. Flowchart (Python: flowchart/flowchart.py → FlowchartNode)
// =========================================================================

export type FlowchartNodeType =
  | 'chapter' | 'scene' | 'choice' | 'branch_start' | 'branch_end' | 'ending';

export type FlowchartNodeStatus =
  | 'locked' | 'unlocked' | 'current' | 'completed';

export interface FlowchartNode {
  id: string;
  name: string;
  type: FlowchartNodeType;
  sceneId: string | null;
  status: FlowchartNodeStatus;
  children: FlowchartNode[];
  parent: FlowchartNode | null;
  position: [number, number];
  metadata: Record<string, unknown>;
}

// =========================================================================
// 10. GPKG Build (Python: build/compiler.py)
// =========================================================================

export const GPKG_MAGIC = 0x4750474B; // "GPKG"

export interface GPKGHeader {
  magic: number;
  version: number;
  fileCount: number;
  indexOffset: number;
  dataOffset: number;
  metadataCompressedSize: number;
  metadataOriginalSize: number;
  reserved: number[];
}

export interface GPKGFileEntry {
  path: string;            // 128 bytes in binary
  offset: number;
  compressedSize: number;
  originalSize: number;
}

// =========================================================================
// 11. Plugin System
// =========================================================================

export interface PluginManifest {
  name: string;
  version: string;
  main: string;
  activationEvents: string[];
  contributes: PluginContribution;
}

export interface PluginContribution {
  commands?: PluginCommand[];
  languages?: PluginLanguage[];
  themes?: PluginTheme[];
  menus?: Record<string, PluginMenuItem[]>;
}

export interface PluginCommand {
  command: string;
  title: string;
  category?: string;
}

export interface PluginLanguage {
  id: string;
  extensions: string[];
  aliases?: string[];
}

export interface PluginTheme {
  id: string;
  label: string;
  path: string;
}

export interface PluginMenuItem {
  command: string;
  when?: string;
  group?: string;
}

export interface PluginAPI {
  engine: unknown;             // GalEngine instance (avoids circular deps)
  workbench: {
    registerView(id: string, component: unknown): void;
    registerCommand(id: string, handler: () => void): void;
  };
  monaco: {
    registerCompletionProvider(language: string, provider: unknown): void;
    registerHoverProvider(language: string, provider: unknown): void;
  };
  llm: {
    registerProvider(id: string, provider: LLMProvider): void;
  };
}

// =========================================================================
// 12. LLM Integration
// =========================================================================

export interface LLMProvider {
  id: string;
  name: string;
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
  streamChat(messages: LLMMessage[], options?: LLMOptions): AsyncIterable<string>;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

// =========================================================================
// 13. Default Config Factory
// =========================================================================

export function createDefaultConfig(overrides?: Partial<EngineConfig>): EngineConfig {
  return {
    windowWidth: 1280,
    windowHeight: 720,
    fullscreen: false,
    fps: 60,
    textSpeed: 40,
    textColor: [255, 255, 255, 255],
    textSize: 24,
    textFont: null,
    nameColor: [200, 180, 255, 255],
    masterVolume: 1.0,
    bgmVolume: 0.8,
    sfxVolume: 1.0,
    voiceVolume: 1.0,
    characterVoiceVolumes: {},
    skipRead: true,
    skipUnread: false,
    autoMode: false,
    autoDelay: 2.0,
    keyConfirm: 13,      // Enter
    keyCancel: 27,       // Escape
    keySkip: 17,         // Ctrl
    keyAuto: 65,         // A
    keyHistory: 72,      // H
    keySave: 83,         // S
    keyLoad: 76,         // L
    keySettings: 79,     // O
    keyQuickSave: 53,    // 5
    keyQuickLoad: 54,    // 6
    keyHide: 72,         // H (dup, kept for compat)
    keyFullscreen: 70,   // F
    keyScreenshot: 80,   // P
    ...overrides,
  };
}
