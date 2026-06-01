/**
 * BottomPanel — Status bar panels (Output, Problems, Terminal).
 *
 * Provides:
 *   - Output: Engine log viewer with filtering
 *   - Problems: JSON/Markdown syntax errors from Monaco
 *   - Terminal: Simple command executor
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { BottomPanelView } from '../App';

// =========================================================================
// Props
// =========================================================================

interface Props {
  activeView: BottomPanelView;
}

// =========================================================================
// BottomPanel
// =========================================================================

export const BottomPanel: React.FC<Props> = ({ activeView }) => {
  const renderView = () => {
    switch (activeView) {
      case 'output':   return <OutputView />;
      case 'problems': return <ProblemsView />;
      case 'terminal': return <TerminalView />;
      default:         return <OutputView />;
    }
  };

  return (
    <div className="bottom-panel">
      <div className="bottom-panel-content">{renderView()}</div>
    </div>
  );
};

// =========================================================================
// Output View — Log viewer with filtering
// =========================================================================

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  timestamp: number;
}

// Singleton log store
let _logId = 0;
const _logs: LogEntry[] = [];
const _logListeners: Set<() => void> = new Set();

function addLog(level: LogLevel, message: string): void {
  _logs.push({ id: ++_logId, level, message, timestamp: Date.now() });
  if (_logs.length > 500) _logs.shift();
  _logListeners.forEach((fn) => fn());
}

export const engineLog = {
  info: (msg: string) => addLog('info', msg),
  warn: (msg: string) => addLog('warn', msg),
  error: (msg: string) => addLog('error', msg),
  debug: (msg: string) => addLog('debug', msg),
};

const levelColors: Record<LogLevel, string> = {
  info: '#75b798',
  warn: '#ffda6a',
  error: '#ff6666',
  debug: '#6ea8fe',
};

const OutputView: React.FC = () => {
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [logs, setLogs] = useState<LogEntry[]>(_logs);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = () => setLogs([..._logs]);
    _logListeners.add(listener);
    return () => { _logListeners.delete(listener); };
  }, []);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  const handleClear = useCallback(() => {
    _logs.length = 0;
    setLogs([]);
  }, []);

  return (
    <div className="output-view">
      <div className="output-toolbar">
        <div className="output-filters">
          {(['all', 'info', 'warn', 'error', 'debug'] as const).map((f) => (
            <button
              key={f}
              className={`output-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="output-actions">
          <label className="output-autoscroll">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
            Auto-scroll
          </label>
          <button className="output-clear-btn" onClick={handleClear}>Clear</button>
        </div>
      </div>
      <div className="output-container" ref={containerRef}>
        {filtered.length === 0 ? (
          <div className="output-empty">No output</div>
        ) : (
          filtered.map((entry) => (
            <div key={entry.id} className="output-line" data-level={entry.level}>
              <span className="output-time">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="output-level" style={{ color: levelColors[entry.level] }}>
                [{entry.level.toUpperCase()}]
              </span>
              <span className="output-msg">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =========================================================================
// Problems View — Syntax / validation errors
// =========================================================================

interface Problem {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

let _problems: Problem[] = [];
const _problemListeners: Set<() => void> = new Set();

export function addProblem(problem: Problem): void {
  _problems.push(problem);
  _problemListeners.forEach((fn) => fn());
}

export function clearProblems(): void {
  _problems = [];
  _problemListeners.forEach((fn) => fn());
}

const ProblemsView: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>(_problems);

  useEffect(() => {
    const listener = () => setProblems([..._problems]);
    _problemListeners.add(listener);
    return () => { _problemListeners.delete(listener); };
  }, []);

  const errors = problems.filter((p) => p.severity === 'error');
  const warnings = problems.filter((p) => p.severity === 'warning');
  const infos = problems.filter((p) => p.severity === 'info');

  return (
    <div className="problems-view">
      {problems.length === 0 ? (
        <div className="problems-empty">No problems detected.</div>
      ) : (
        <div className="problems-list">
          {errors.length > 0 && (
            <div className="problems-summary error">
              {errors.length} error{errors.length > 1 ? 's' : ''}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="problems-summary warning">
              {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </div>
          )}
          {problems.map((p, i) => (
            <div key={i} className={`problem-item problem-${p.severity}`}>
              <span className={`problem-icon problem-icon-${p.severity}`}>
                {p.severity === 'error' ? '✕' : p.severity === 'warning' ? '⚠' : 'ℹ'}
              </span>
              <span className="problem-message">{p.message}</span>
              <span className="problem-location">
                {p.file}:{p.line}:{p.column}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =========================================================================
// Terminal View — Simple command executor
// =========================================================================

interface TerminalLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

const TerminalView: React.FC = () => {
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = useCallback(async (cmd: string) => {
    setHistory((h) => [...h, { type: 'input', text: `> ${cmd}` }]);
    setInput('');

    if (!cmd.trim()) return;

    // Built-in commands
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0].toLowerCase();

    try {
      switch (command) {
        case 'help':
          setHistory((h) => [...h, { type: 'output', text: 'Available: help, echo, clear, date, whoami, version, scenes' }]);
          break;
        case 'echo':
          setHistory((h) => [...h, { type: 'output', text: parts.slice(1).join(' ') }]);
          break;
        case 'clear':
          setHistory([]);
          break;
        case 'date':
          setHistory((h) => [...h, { type: 'output', text: new Date().toString() }]);
          break;
        case 'whoami':
          setHistory((h) => [...h, { type: 'output', text: 'GalEngine Developer' }]);
          break;
        case 'version':
          setHistory((h) => [...h, { type: 'output', text: 'GalEngine Editor v0.1.0 (TypeScript)' }]);
          break;
        case 'scenes':
          setHistory((h) => [...h, { type: 'output', text: 'Use the Explorer sidebar to browse scene files.' }]);
          break;
        default:
          setHistory((h) => [...h, { type: 'error', text: `Unknown command: ${command}. Type "help" for available commands.` }]);
      }
    } catch (e) {
      setHistory((h) => [...h, { type: 'error', text: (e as Error).message }]);
    }

    setBusy(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !busy) {
      executeCommand(input);
    }
  }, [input, busy, executeCommand]);

  return (
    <div className="terminal-view" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-container" ref={containerRef}>
        {history.length === 0 && (
          <div className="terminal-welcome">
            GalEngine Terminal v0.1.0 — Type "help" for available commands.
          </div>
        )}
        {history.map((line, i) => (
          <div key={i} className={`terminal-line terminal-${line.type}`}>
            {line.text}
          </div>
        ))}
      </div>
      <div className="terminal-input-row">
        <span className="terminal-prompt">&gt;</span>
        <input
          ref={inputRef}
          className="terminal-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          disabled={busy}
          spellCheck={false}
        />
      </div>
    </div>
  );
};
