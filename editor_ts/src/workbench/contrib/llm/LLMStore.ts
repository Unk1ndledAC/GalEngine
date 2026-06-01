/**
 * LLMStore — Zustand store for LLM configuration and state.
 */

import { create } from 'zustand';

export interface LLMConfig {
  provider: 'openai' | 'custom';
  apiKey: string;
  apiEndpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface LLMStore {
  // Config
  config: LLMConfig;
  updateConfig: (patch: Partial<LLMConfig>) => void;

  // Chat history
  messages: ChatMessage[];
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;

  // UI state
  isGenerating: boolean;
  setGenerating: (v: boolean) => void;

  // Generated content
  lastGeneratedScript: string | null;
  setGeneratedScript: (script: string | null) => void;

  // Error
  lastError: string | null;
  setError: (err: string | null) => void;
}

let _msgId = 0;
function nextId(): string { return `msg_${++_msgId}_${Date.now()}`; }

export const useLLMStore = create<LLMStore>((set) => ({
  config: {
    provider: 'openai',
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: 'You are an expert visual novel writer. Generate scenes in GalEngine JSON format. Follow the instructions carefully and output valid JSON only.',
  },
  updateConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  messages: [],
  addMessage: (msg) => set((s) => ({
    messages: [...s.messages, { ...msg, id: nextId(), timestamp: Date.now() }],
  })),
  clearMessages: () => set({ messages: [] }),

  isGenerating: false,
  setGenerating: (v) => set({ isGenerating: v }),

  lastGeneratedScript: null,
  setGeneratedScript: (script) => set({ lastGeneratedScript: script }),

  lastError: null,
  setError: (err) => set({ lastError: err }),
}));
