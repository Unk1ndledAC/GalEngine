/**
 * SceneGenerator — Generate GalEngine scene JSON from natural language prompts.
 *
 * Uses LLM to convert plain descriptions into CommandData[] JSON.
 * Supports:
 *   - Single scene generation from prompt
 *   - Batch scene generation from outline
 *   - Scene continuation (add commands to existing scene)
 */

import type { LLMProvider, LLMMessage, CommandData } from '../../../engine/types';
import { CommandType } from '../../../engine/types';

// =========================================================================
// Prompt Templates
// =========================================================================

const SYSTEM_PROMPT = `You are a GalEngine visual novel script writer. Output ONLY valid JSON matching this schema:

{
  "id": "scene_id_string",
  "name": "Scene Display Name",
  "commands": [
    { "type": "background", "data": { "image": "backgrounds/xxx.png", "transition": "fade", "duration": 1.0 } },
    { "type": "dialogue", "data": { "character": "char_id", "display_name": "Name", "text": "Hello..." } },
    { "type": "narration", "data": { "text": "Narration text..." } },
    { "type": "show_sprite", "data": { "character": "char_id", "sprite": "sprites/char/happy.png", "position": "center" } },
    { "type": "hide_sprite", "data": { "character": "char_id" } },
    { "type": "bgm", "data": { "file": "audio/bgm/peaceful.mp3", "loop": true } },
    { "type": "stop_bgm", "data": {} },
    { "type": "sfx", "data": { "file": "audio/sfx/door.mp3" } },
    { "type": "voice", "data": { "file": "audio/voice/line001.mp3" } },
    { "type": "show_cg", "data": { "image": "cgs/event.png", "duration": 3.0 } },
    { "type": "hide_cg", "data": {} },
    { "type": "choice", "data": { "prompt": "What to do?", "choices": [{"text": "Option A", "target": "scene_b"}, {"text": "Option B", "target": "scene_c"}] } },
    { "type": "jump", "data": { "target": "scene_id" } },
    { "type": "set_flag", "data": { "flags": { "key": "value" } } },
    { "type": "conditional", "data": { "condition": "flags.key == true", "then": [...], "else": [...] } },
    { "type": "wait", "data": { "duration": 1.5 } },
    { "type": "transition", "data": { "effect": "fade", "duration": 1.0 } },
    { "type": "label", "data": { "name": "label_name" } },
    { "type": "call_scene", "data": { "sceneId": "other_scene" } },
    { "type": "return", "data": {} },
    { "type": "end_scene", "data": { "nextScene": "next_scene" } }
  ]
}

Rules:
1. Output ONLY raw JSON, no markdown code fences, no explanation.
2. Scene IDs must be lowercase snake_case.
3. Asset paths use relative directory structure (backgrounds/, sprites/, audio/bgm/, etc.)
4. Keep dialogue natural and engaging.
5. Use character_id values specified in the prompt.
6. Each scene should be 5-20 commands.
7. Include choices for branching when appropriate.
8. Position values: "left" | "left_center" | "center" | "right_center" | "right"
9. Transition effects: "fade" | "crossfade" | "slide_left" | "slide_right" | "dissolve" | "none"`;

// =========================================================================
// Generator
// =========================================================================

export class SceneGenerator {
  constructor(private _provider: LLMProvider) {}

  /** Generate a single scene from a natural language prompt. */
  async generateScene(prompt: string, context?: {
    characters?: string[];
    sceneId?: string;
    background?: string;
    bgm?: string;
  }): Promise<CommandData[]> {
    const messages: LLMMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: this._buildPrompt(prompt, context) },
    ];

    const response = await this._provider.chat(messages, { temperature: 0.8, maxTokens: 4096 });
    return this._parseResponse(response);
  }

  /** Generate multiple scenes from an outline (array of prompts). */
  async generateScenes(
    outlines: { id: string; name: string; description: string; characters?: string[] }[],
  ): Promise<Record<string, CommandData[]>> {
    const results: Record<string, CommandData[]> = {};

    for (const outline of outlines) {
      const commands = await this.generateScene(outline.description, {
        characters: outline.characters,
        sceneId: outline.id,
      });
      results[outline.id] = commands;
    }

    return results;
  }

  /** Continue a scene (add more commands after existing ones). */
  async continueScene(
    existingCommands: CommandData[],
    continuationPrompt: string,
  ): Promise<CommandData[]> {
    const existingJson = JSON.stringify(existingCommands.slice(-5), null, 2); // last 5 for context

    const messages: LLMMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Existing scene commands (last 5 for context):\n${existingJson}\n\nContinue the scene with: ${continuationPrompt}\n\nOutput ONLY the new commands as a JSON array (no wrapper object):` },
    ];

    const response = await this._provider.chat(messages, { temperature: 0.8, maxTokens: 2048 });
    const parsed = this._parseResponse(response);

    // If response is a single scene object, extract commands; otherwise assume array
    if (Array.isArray(parsed)) return parsed;
    if ((parsed as any)?.commands) return (parsed as any).commands;
    return [];
  }

  /** Generate character dialogue lines in bulk. */
  async generateDialogue(
    characterId: string,
    characterName: string,
    scenario: string,
    count: number = 10,
  ): Promise<string[]> {
    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are a dialogue writer for visual novels. Generate natural, character-consistent dialogue lines.' },
      { role: 'user', content: `Character: ${characterName} (id: ${characterId})\nScenario: ${scenario}\nGenerate ${count} dialogue lines. Output as JSON array of strings.` },
    ];

    const response = await this._provider.chat(messages, { temperature: 0.9, maxTokens: 1024 });
    try {
      return JSON.parse(this._extractJson(response));
    } catch {
      return response.split('\n').filter((l) => l.trim().length > 0);
    }
  }

  // ---- Private ----

  private _buildPrompt(prompt: string, context?: {
    characters?: string[];
    sceneId?: string;
    background?: string;
    bgm?: string;
  }): string {
    let full = prompt;

    if (context?.sceneId) {
      full += `\n\nScene ID: ${context.sceneId}`;
    }
    if (context?.characters?.length) {
      full += `\nCharacters available: ${context.characters.join(', ')}`;
    }
    if (context?.background) {
      full += `\nBackground image: ${context.background}`;
    }
    if (context?.bgm) {
      full += `\nBackground music: ${context.bgm}`;
    }

    return full;
  }

  private _parseResponse(response: string): any {
    const json = this._extractJson(response);
    try {
      return JSON.parse(json);
    } catch {
      throw new Error(`Failed to parse LLM response as JSON. Response: ${response.slice(0, 200)}...`);
    }
  }

  private _extractJson(text: string): string {
    // Remove markdown code fences if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    return cleaned.trim();
  }
}
