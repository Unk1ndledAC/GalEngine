/**
 * AIChatPanel — LLM chat interface for scene generation.
 *
 * Features:
 *   - Chat-style message history
 *   - Prompt input with send button
 *   - Generate scene from description
 *   - Insert generated scene into editor
 *   - Config panel (API key, model, endpoint)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLLMStore } from './LLMStore';
import { createProvider } from './LLMProviders';
import { SceneGenerator } from './SceneGenerator';
import { useEditorStore } from '../editor/EditorStore';
import { CommandType, type CommandData } from '../../../engine/types';

export const AIChatPanel: React.FC = () => {
  const { config, updateConfig, messages, addMessage, clearMessages, isGenerating, setGenerating, lastGeneratedScript, setGeneratedScript, lastError, setError } = useLLMStore();

  const [prompt, setPrompt] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [sceneId, setSceneId] = useState('');
  const [sceneName, setSceneName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send
  const handleSend = useCallback(async () => {
    const text = prompt.trim();
    if (!text || isGenerating) return;

    if (!config.apiKey) {
      setError('Please configure your API key first (click gear icon).');
      return;
    }

    setPrompt('');
    addMessage({ role: 'user', content: text });
    setGenerating(true);
    setError(null);

    try {
      const provider = createProvider(config);
      const generator = new SceneGenerator(provider);

      const commands = await generator.generateScene(text, {
        sceneId: sceneId || undefined,
        characters: undefined,
      });

      const script = JSON.stringify({
        id: sceneId || 'generated_scene',
        name: sceneName || 'Generated Scene',
        commands,
      }, null, 2);

      setGeneratedScript(script);
      addMessage({
        role: 'assistant',
        content: `Generated scene with ${commands.length} commands.\n\nScene ID: ${sceneId || 'generated_scene'}\nScene Name: ${sceneName || 'Generated Scene'}`,
      });
    } catch (e) {
      const errMsg = (e as Error).message;
      setError(errMsg);
      addMessage({ role: 'assistant', content: `Error: ${errMsg}` });
    } finally {
      setGenerating(false);
    }
  }, [prompt, config, isGenerating, sceneId, sceneName, addMessage, setGenerating, setError, setGeneratedScript]);

  // Insert generated script into editor
  const handleInsertIntoEditor = useCallback(() => {
    if (!lastGeneratedScript || !sceneId) return;
    const store = useEditorStore.getState();
    const filePath = `scripts/${sceneId}.json`;
    store.openFile(filePath, `${sceneId}.json`);
    store.updateContent(filePath, lastGeneratedScript);
  }, [lastGeneratedScript, sceneId]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="ai-chat-panel">
      {/* Header */}
      <div className="ai-chat-header">
        <span className="ai-chat-title">AI Scene Generator</span>
        <button
          className="ai-config-toggle"
          onClick={() => setShowConfig(!showConfig)}
          title="Settings"
        >
          ⚙
        </button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="ai-config-panel">
          <div className="ai-config-row">
            <label>Provider</label>
            <select
              value={config.provider}
              onChange={(e) => updateConfig({ provider: e.target.value as 'openai' | 'custom' })}
            >
              <option value="openai">OpenAI</option>
              <option value="custom">Custom (OpenAI-compatible)</option>
            </select>
          </div>
          <div className="ai-config-row">
            <label>API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => updateConfig({ apiKey: e.target.value })}
              placeholder="sk-..."
            />
          </div>
          <div className="ai-config-row">
            <label>Endpoint</label>
            <input
              type="text"
              value={config.apiEndpoint}
              onChange={(e) => updateConfig({ apiEndpoint: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="ai-config-row">
            <label>Model</label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => updateConfig({ model: e.target.value })}
              placeholder="gpt-4o"
            />
          </div>
          <div className="ai-config-row">
            <label>Temperature ({config.temperature})</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
            />
          </div>
        </div>
      )}

      {/* Scene ID / Name inputs */}
      <div className="ai-scene-meta">
        <input
          type="text"
          className="ai-scene-id"
          value={sceneId}
          onChange={(e) => setSceneId(e.target.value)}
          placeholder="Scene ID (e.g., school_day1)"
        />
        <input
          type="text"
          className="ai-scene-name"
          value={sceneName}
          onChange={(e) => setSceneName(e.target.value)}
          placeholder="Scene Name (e.g., First Day of School)"
        />
      </div>

      {/* Messages */}
      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-chat-empty">
            <p>Describe the scene you want to create.</p>
            <p className="ai-chat-hint">Example: "Akari meets Kenji at the school rooftop at sunset. They talk about the upcoming festival. She's nervous but excited."</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`ai-chat-message ai-role-${msg.role}`}>
            <div className="ai-msg-role">
              {msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'AI' : 'System'}
            </div>
            <div className="ai-msg-content">
              <pre>{msg.content}</pre>
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="ai-chat-message ai-role-assistant">
            <div className="ai-msg-role">AI</div>
            <div className="ai-msg-content">
              <div className="ai-typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        {lastError && (
          <div className="ai-chat-error">
            {lastError}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Generated script actions */}
      {lastGeneratedScript && (
        <div className="ai-script-actions">
          <button className="ai-btn-secondary" onClick={handleInsertIntoEditor}>
            Insert into Editor
          </button>
          <button className="ai-btn-secondary" onClick={() => {
            navigator.clipboard.writeText(lastGeneratedScript);
          }}>
            Copy JSON
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="ai-chat-input">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the scene..."
          rows={3}
          disabled={isGenerating}
        />
        <button
          className="ai-send-btn"
          onClick={handleSend}
          disabled={!prompt.trim() || isGenerating}
        >
          {isGenerating ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
};
