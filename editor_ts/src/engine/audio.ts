/**
 * Audio Manager — BGM, SFX, Voice via Web Audio API.
 * Python: galengine/audio/audio_manager.py
 */

import type { ConfigManager } from './config';

export interface AudioState {
  currentBGM: string | null;
  bgmPlaying: boolean;
  bgmVolume: number;
  sfxVolume: number;
  voiceVolume: number;
}

export class AudioManager {
  private _ctx: AudioContext | null = null;
  private _bgmSource: AudioBufferSourceNode | null = null;
  private _bgmGain: GainNode | null = null;
  private _bgmFile: string | null = null;
  private _sfxGain: GainNode | null = null;
  private _voiceGain: GainNode | null = null;
  private _audioBuffers = new Map<string, AudioBuffer>();

  constructor(private _config: ConfigManager) {}

  get currentBGM(): string | null {
    return this._bgmFile;
  }

  /** Initialize audio context (must be called from user gesture in browser). */
  async init(): Promise<void> {
    if (!this._ctx) {
      this._ctx = new AudioContext();
      this._bgmGain = this._ctx.createGain();
      this._bgmGain.gain.value = this._config.get('bgmVolume') * this._config.get('masterVolume');
      this._bgmGain.connect(this._ctx.destination);

      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = this._config.get('sfxVolume') * this._config.get('masterVolume');
      this._sfxGain.connect(this._ctx.destination);

      this._voiceGain = this._ctx.createGain();
      this._voiceGain.gain.value = this._config.get('voiceVolume') * this._config.get('masterVolume');
      this._voiceGain.connect(this._ctx.destination);
    }
  }

  /** Load an audio file into buffer cache. */
  async loadAudio(key: string, data: ArrayBuffer): Promise<void> {
    if (!this._ctx) await this.init();
    const buffer = await this._ctx!.decodeAudioData(data);
    this._audioBuffers.set(key, buffer);
  }

  /** Play BGM with optional loop and fade-in. */
  async playBGM(file: string, loop = true, fadeIn?: number): Promise<void> {
    if (!this._ctx) await this.init();
    this.stopBGM();

    const buffer = this._audioBuffers.get(file);
    if (!buffer) {
      console.warn(`BGM not loaded: ${file}`);
      return;
    }

    const source = this._ctx!.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(this._bgmGain!);
    source.start(0);

    this._bgmSource = source;
    this._bgmFile = file;

    if (fadeIn) {
      this._bgmGain!.gain.setValueAtTime(0, this._ctx!.currentTime);
      this._bgmGain!.gain.linearRampToValueAtTime(
        this._config.get('bgmVolume') * this._config.get('masterVolume'),
        this._ctx!.currentTime + fadeIn
      );
    }
  }

  /** Stop BGM. */
  stopBGM(): void {
    if (this._bgmSource) {
      this._bgmSource.stop();
      this._bgmSource = null;
    }
    this._bgmFile = null;
  }

  /** Play a sound effect. */
  async playSFX(file: string, volume?: number): Promise<void> {
    if (!this._ctx) await this.init();
    const buffer = this._audioBuffers.get(file);
    if (!buffer) return;

    const source = this._ctx!.createBufferSource();
    source.buffer = buffer;
    const gain = this._ctx!.createGain();
    gain.gain.value = (volume ?? 1) * this._config.get('sfxVolume') * this._config.get('masterVolume');
    source.connect(gain);
    gain.connect(this._ctx!.destination);
    source.start(0);
  }

  /** Play voice line. */
  async playVoice(file: string): Promise<void> {
    if (!this._ctx) await this.init();
    const buffer = this._audioBuffers.get(file);
    if (!buffer) return;

    const source = this._ctx!.createBufferSource();
    source.buffer = buffer;
    source.connect(this._voiceGain!);
    source.start(0);
  }

  /** Update volume from config. */
  syncVolume(): void {
    if (!this._ctx) return;
    const master = this._config.get('masterVolume');
    if (this._bgmGain) this._bgmGain.gain.value = this._config.get('bgmVolume') * master;
    if (this._sfxGain) this._sfxGain.gain.value = this._config.get('sfxVolume') * master;
    if (this._voiceGain) this._voiceGain.gain.value = this._config.get('voiceVolume') * master;
  }

  dispose(): void {
    this.stopBGM();
    if (this._ctx) {
      this._ctx.close();
      this._ctx = null;
    }
  }
}
