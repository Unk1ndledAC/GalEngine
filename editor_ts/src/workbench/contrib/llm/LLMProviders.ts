/**
 * LLM Providers — OpenAI-compatible chat completions.
 *
 * Supports:
 *   - OpenAI (api.openai.com)
 *   - Any OpenAI-compatible endpoint (Ollama, vLLM, LM Studio, etc.)
 *   - Streaming responses
 */

import type { LLMProvider, LLMMessage, LLMOptions } from '../../../engine/types';
import type { LLMConfig } from './LLMStore';

// =========================================================================
// OpenAI-compatible Provider
// =========================================================================

export class OpenAIProvider implements LLMProvider {
  id = 'openai';

  constructor(
    public name: string,
    private _config: LLMConfig,
  ) {}

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
    const cfg = this._config;
    const response = await fetch(`${cfg.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model ?? cfg.model,
        messages,
        temperature: options?.temperature ?? cfg.temperature,
        max_tokens: options?.maxTokens ?? cfg.maxTokens,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  async *streamChat(messages: LLMMessage[], options?: LLMOptions): AsyncIterable<string> {
    const cfg = this._config;
    const response = await fetch(`${cfg.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model ?? cfg.model,
        messages,
        temperature: options?.temperature ?? cfg.temperature,
        max_tokens: options?.maxTokens ?? cfg.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM API error (${response.status}): ${err}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip unparseable chunks
        }
      }
    }
  }
}

// =========================================================================
// Factory
// =========================================================================

export function createProvider(config: LLMConfig): LLMProvider {
  return new OpenAIProvider(config.provider === 'custom' ? 'Custom LLM' : 'OpenAI', config);
}
