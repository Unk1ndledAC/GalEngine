/**
 * SearchPanel — Find & Replace in Files (VSCode-style).
 *
 * Features:
 *   - Find in Files: search across all project files
 *   - Replace in Files: batch replace across all project files
 *   - Match case, whole word, regex options
 *   - Results list with file path, line number, match context
 */

import React, { useState, useCallback, useRef } from 'react';
import { useProjectStore } from '../project/ProjectStore';
import { useEditorStore } from '../editor/EditorStore';
import { getElectronVFS } from '@platform/electron-vfs';
import { useTranslation } from '@i18n/useTranslation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchMatch {
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  lineContent: string;
  matchStart: number;
  matchLength: number;
}

interface SearchResult {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface SearchPanelProps {
  onClose: () => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onClose }) => {
  const projectPath = useProjectStore((s) => s.projectPath);
  const openFile = useEditorStore((s) => s.openFile);
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);

  const vfs = getElectronVFS();

  // Build regex from query + options
  const buildPattern = useCallback((q: string): RegExp | null => {
    try {
      let pattern = useRegex ? q : escapeRegex(q);
      if (wholeWord) pattern = `\\b${pattern}\\b`;
      return new RegExp(pattern, matchCase ? 'g' : 'gi');
    } catch {
      return null;
    }
  }, [matchCase, wholeWord, useRegex]);

  // Recursively find text files in a directory
  const findTextFiles = useCallback(async (dirPath: string): Promise<string[]> => {
    const files: string[] = [];
    const textExts = new Set([
      'json', 'md', 'markdown', 'txt', 'py', 'ts', 'tsx', 'js', 'jsx',
      'css', 'html', 'htm', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg',
      'csv', 'tsv', 'scene',
    ]);
    try {
      const entries = (window as any).galengine?.fs?.listDirDetailed
        ? await (window as any).galengine.fs.listDirDetailed(dirPath)
        : [];
      for (const entry of entries) {
        const fullPath = `${dirPath}\\${entry.name}`;
        if (entry.isDirectory) {
          // Skip node_modules, .git, dist
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'release') continue;
          const subFiles = await findTextFiles(fullPath);
          files.push(...subFiles);
        } else {
          const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
          if (textExts.has(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Permission errors — skip
    }
    return files;
  }, []);

  // Search
  const handleSearch = useCallback(async () => {
    if (!query.trim() || !projectPath) return;
    const pattern = buildPattern(query.trim());
    if (!pattern) {
      setErrorMsg('Invalid regex pattern');
      return;
    }
    setErrorMsg(null);
    setSearching(true);
    setResults([]);

    try {
      const files = await findTextFiles(projectPath);
      const allResults: SearchResult[] = [];
      // Limit to 1000 files for performance
      const searchFiles = files.slice(0, 1000);

      for (const filePath of searchFiles) {
        let content: string;
        try {
          content = await vfs.readTextFile(filePath);
        } catch { continue; }

        const lines = content.split('\n');
        const matches: SearchMatch[] = [];

        for (let li = 0; li < lines.length; li++) {
          const line = lines[li];
          // Reset regex lastIndex for each line
          const lineRegex = new RegExp(pattern.source, pattern.flags);
          let m: RegExpExecArray | null;
          while ((m = lineRegex.exec(line)) !== null) {
            matches.push({
              filePath,
              fileName: filePath.replace(projectPath + '\\', ''),
              line: li + 1,
              column: m.index + 1,
              lineContent: line.trim(),
              matchStart: m.index,
              matchLength: m[0].length,
            });
            if (m[0].length === 0) lineRegex.lastIndex++;
          }
        }

        if (matches.length > 0) {
          allResults.push({
            filePath,
            fileName: filePath.replace(projectPath + '\\', ''),
            matches,
          });
        }
      }

      setResults(allResults);
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setSearching(false);
    }
  }, [query, projectPath, buildPattern, findTextFiles, vfs]);

  // Replace All
  const handleReplaceAll = useCallback(async () => {
    if (!query.trim() || !projectPath) return;
    const pattern = buildPattern(query.trim());
    if (!pattern) return;

    setSearching(true);
    let replacedCount = 0;

    try {
      for (const result of results) {
        try {
          let content = await vfs.readTextFile(result.filePath);
          const newContent = content.replace(
            new RegExp(pattern.source, pattern.flags),
            replaceText
          );
          if (newContent !== content) {
            await vfs.writeTextFile(result.filePath, newContent);
            const matches = content.match(new RegExp(pattern.source, pattern.flags))?.length ?? 0;
            replacedCount += matches;
          }
        } catch { /* skip */ }
      }
      setErrorMsg(`Replaced ${replacedCount} occurrences across files.`);
      handleSearch(); // Refresh results
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setSearching(false);
    }
  }, [query, replaceText, projectPath, buildPattern, results, vfs]);

  // Handle Enter key in query input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSearch, onClose]);

  // Handle result click — open file at line
  const handleResultClick = useCallback((match: SearchMatch) => {
    openFile(match.filePath);
    // The MonacoEditor will handle scrolling to line via the opened file
  }, [openFile]);

  // Total match count
  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <div className="search-panel">
      {/* Search Bar */}
      <div className="search-bar">
        <div className="search-input-row">
          <input
            ref={queryInputRef}
            className="search-input"
            type="text"
            value={query}
            placeholder={showReplace ? t('search.replaceInFiles') : t('search.findInFiles')}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <div className="search-toggle-btns">
            <button
              className={`search-option-btn ${matchCase ? 'active' : ''}`}
              onClick={() => setMatchCase(!matchCase)}
              title={t('search.matchCase')}
            >Aa</button>
            <button
              className={`search-option-btn ${wholeWord ? 'active' : ''}`}
              onClick={() => setWholeWord(!wholeWord)}
              title={t('search.wholeWord')}
            >ab</button>
            <button
              className={`search-option-btn ${useRegex ? 'active' : ''}`}
              onClick={() => setUseRegex(!useRegex)}
              title={t('search.regex')}
            >.*</button>
          </div>
        </div>

        {showReplace && (
          <div className="search-input-row">
            <input
              className="search-input search-replace-input"
              type="text"
              value={replaceText}
              placeholder={t('search.replace')}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}

        <div className="search-actions">
          <button className="search-btn" onClick={handleSearch} disabled={searching}>
            {t('search.find')}
          </button>
          <button
            className="search-btn"
            onClick={() => setShowReplace(!showReplace)}
          >
            {showReplace ? t('search.find') : t('search.replace')}
          </button>
          {showReplace && (
            <button className="search-btn search-btn-warn" onClick={handleReplaceAll} disabled={searching}>
              {t('search.replaceInFiles')}
            </button>
          )}
          <button className="search-close-btn" onClick={onClose}>&times;</button>
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="search-error">{errorMsg}</div>
      )}

      {/* Results */}
      <div className="search-results">
        {searching ? (
          <div className="search-status">{t('search.searching')}</div>
        ) : results.length === 0 && query.trim() ? (
          <div className="search-status">{t('search.noResults')}</div>
        ) : (
          <>
            {results.length > 0 && (
              <div className="search-summary">
                {totalMatches} {t('search.results')} {t('search.find')} in {results.length} files
              </div>
            )}
            {results.map((result) => (
              <div key={result.filePath} className="search-file-result">
                <div className="search-file-name">{result.fileName}</div>
                {result.matches.slice(0, 50).map((match, mi) => (
                  <div
                    key={`${match.line}-${mi}`}
                    className="search-match-item"
                    onClick={() => handleResultClick(match)}
                  >
                    <span className="search-match-line">{match.line}</span>
                    <span className="search-match-content">
                      <HighlightMatch text={match.lineContent} start={match.matchStart} len={match.matchLength} />
                    </span>
                  </div>
                ))}
                {result.matches.length > 50 && (
                  <div className="search-more-hint">
                    ... and {result.matches.length - 50} more matches
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// HighlightMatch — Renders text with highlighted match
// ---------------------------------------------------------------------------

const HighlightMatch: React.FC<{ text: string; start: number; len: number }> = ({
  text, start, len,
}) => {
  const before = text.substring(0, start);
  const match = text.substring(start, start + len);
  const after = text.substring(start + len);
  return (
    <>
      {before}
      <span className="search-highlight">{match}</span>
      {after}
    </>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
