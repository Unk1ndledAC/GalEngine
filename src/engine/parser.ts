/**
 * Scene Parser — JSON + Markdown script parsing.
 * Python: galengine/parser/json_parser.py
 */

import { CommandType } from './types';
import type { CommandData, SceneFile, ParsedScene, Command } from './types';

// =========================================================================
// Main Parser
// =========================================================================

export class SceneParser {
  /**
   * Parse a scene file (auto-detect JSON vs Markdown by extension).
   */
  static parse(source: string, filePath: string): ParsedScene {
    if (filePath.endsWith('.json')) {
      return this.parseJSON(source, filePath);
    }
    if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
      return this.parseMarkdown(source, filePath);
    }
    throw new Error(`Unsupported scene format: ${filePath}`);
  }

  /**
   * Parse JSON scene format.
   */
  static parseJSON(source: string, _filePath: string): ParsedScene {
    const raw = JSON.parse(source) as SceneFile;

    const commands: Command[] = raw.commands.map((cmd, i) => ({
      ...cmd,
      lineNumber: i + 1,
    })) as Command[];

    const labels: Record<string, number> = {};
    commands.forEach((cmd, i) => {
      if (cmd.type === CommandType.Label) {
        labels[(cmd.data as { name: string }).name] = i;
      }
    });

    return {
      sceneId: raw.id,
      sceneName: raw.name ?? raw.id,
      chapter: '',
      route: null,
      background: null,
      bgm: null,
      commands,
      labels,
    };
  }

  /**
   * Parse Markdown scene format.
   *
   * Syntax:
   *   ==background: image==      directive
   *   ==bgm: file==
   *   ==show_sprite: char, sprite==
   *   ### CharName #             dialogue
   *   ?? Question?               choice prompt
   *   - [Option] -> target        choice option
   *   ## label_name #            label
   *   ==jump: target==           jump
   *   ==set_flag: key = value==  set flag
   */
  static parseMarkdown(source: string, filePath: string): ParsedScene {
    const lines = source.split(/\r?\n/);
    const commands: Command[] = [];
    const labels: Record<string, number> = {};

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      if (!line) { i++; continue; }

      // ---- Directive: ==key: value== ----
      const dirMatch = line.match(/^==(.+?)==$/);
      if (dirMatch) {
        const inner = dirMatch[1].trim();
        const colonIdx = inner.indexOf(':');
        if (colonIdx >= 0) {
          const key = inner.slice(0, colonIdx).trim();
          const value = inner.slice(colonIdx + 1).trim();
          const cmd = parseDirective(key, value, lineNum);
          if (cmd) commands.push(cmd);
        }
        i++; continue;
      }

      // ---- Label: ## name # ----
      const labelMatch = line.match(/^##\s+(.+?)\s*#$/);
      if (labelMatch) {
        const name = labelMatch[1].trim();
        labels[name] = commands.length;
        commands.push({
          type: CommandType.Label,
          data: { name },
          lineNumber: lineNum,
        });
        i++; continue;
      }

      // ---- Dialogue: ### CharName # ----
      const dialogueMatch = line.match(/^###\s+(.+?)\s*#$/);
      if (dialogueMatch) {
        const character = dialogueMatch[1].trim();
        const text = collectTextLines(lines, i + 1);
        commands.push({
          type: CommandType.Dialogue,
          data: { character, text, display_name: character },
          lineNumber: lineNum,
        });
        i++; continue;
      }

      // ---- Choice prompt: ?? Question? ----
      const choiceMatch = line.match(/^\?\?\s+(.+?)\??$/);
      if (choiceMatch) {
        const prompt = choiceMatch[1].trim();
        const choices: { text: string; target: string }[] = [];
        i++;
        while (i < lines.length && lines[i].trim().startsWith('- [')) {
          const optMatch = lines[i].trim().match(/^-\s*\[(.+?)\]\s*->\s*(.+)$/);
          if (optMatch) {
            choices.push({ text: optMatch[1].trim(), target: optMatch[2].trim() });
          }
          i++;
        }
        commands.push({
          type: CommandType.Choice,
          data: { prompt, choices },
          lineNumber: lineNum,
        });
        continue;
      }

      i++;
    }

    const sceneId = filePath.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '');

    return {
      sceneId,
      sceneName: sceneId,
      chapter: '',
      route: null,
      background: null,
      bgm: null,
      commands,
      labels,
    };
  }
}

// =========================================================================
// Helpers
// =========================================================================

/** Collect all text lines until next `###` or empty line. */
function collectTextLines(lines: string[], startIdx: number): string {
  const parts: string[] = [];
  let j = startIdx;
  while (j < lines.length) {
    const ln = lines[j].trim();
    if (!ln || ln.startsWith('###') || ln.startsWith('==') || ln.startsWith('??') || ln.startsWith('- [')) {
      break;
    }
    parts.push(ln);
    j++;
  }
  return parts.join('\n');
}

/** Convert a directive key+value pair into a Command. */
function parseDirective(key: string, value: string, lineNum: number): Command | null {
  switch (key) {
    case 'background':
      return { type: CommandType.Background, data: { image: value }, lineNumber: lineNum };
    case 'bgm':
      return { type: CommandType.BGM, data: { file: value, loop: true }, lineNumber: lineNum };
    case 'sfx':
      return { type: CommandType.SFX, data: { file: value }, lineNumber: lineNum };
    case 'voice':
      return { type: CommandType.Voice, data: { file: value }, lineNumber: lineNum };
    case 'stop_bgm':
      return { type: CommandType.StopBGM, data: {}, lineNumber: lineNum };
    case 'show_sprite': {
      const parts = value.split(',').map((s) => s.trim());
      return { type: CommandType.ShowSprite, data: { character: parts[0] ?? '', sprite: parts[1] ?? '' }, lineNumber: lineNum };
    }
    case 'hide_sprite':
      return { type: CommandType.HideSprite, data: { character: value }, lineNumber: lineNum };
    case 'show_cg':
      return { type: CommandType.ShowCG, data: { image: value }, lineNumber: lineNum };
    case 'hide_cg':
      return { type: CommandType.HideCG, data: {}, lineNumber: lineNum };
    case 'wait':
      return { type: CommandType.Wait, data: { duration: parseFloat(value) || 1 }, lineNumber: lineNum };
    case 'transition':
      return { type: CommandType.Transition, data: { effect: value as any, duration: 1 }, lineNumber: lineNum };
    case 'jump':
      return { type: CommandType.Jump, data: { target: value }, lineNumber: lineNum };
    case 'call_scene':
      return { type: CommandType.CallScene, data: { sceneId: value }, lineNumber: lineNum };
    case 'return':
      return { type: CommandType.Return, data: {}, lineNumber: lineNum };
    case 'end_scene':
      return { type: CommandType.EndScene, data: {}, lineNumber: lineNum };
    case 'set_flag': {
      const eqIdx = value.indexOf('=');
      const flagKey = eqIdx >= 0 ? value.slice(0, eqIdx).trim() : value.trim();
      const flagValue = eqIdx >= 0 ? parseFlagValue(value.slice(eqIdx + 1).trim()) : true;
      return { type: CommandType.SetFlag, data: { flags: { [flagKey]: flagValue } }, lineNumber: lineNum };
    }
    default:
      console.warn(`Unknown directive: ${key} at line ${lineNum}`);
      return null;
  }
}

function parseFlagValue(v: string): unknown {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  const num = Number(v);
  if (!isNaN(num)) return num;
  return v;
}
