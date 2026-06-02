/**
 * MenuBar — React top-level menu bar (VSCode style).
 *
 * All menu logic lives in the React layer — no native Electron menu involvement.
 * Edit menu commands are dispatched to the active Monaco editor via EditorCommands.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@i18n/useTranslation';
import type { TranslationKey } from '@i18n/translations';
import { dispatchEditorCommand } from '@workbench/contrib/editor/EditorCommands';

type MenuAction = () => void;

type MenuDivider = { divider: true };
type MenuLabel = {
  divider?: undefined;
  labelKey: TranslationKey;
  labelFallback: string;
  action?: MenuAction;
  shortcut?: string;
  disabled?: boolean;
};
type MenuItem = MenuDivider | MenuLabel;

function isDivider(item: MenuItem): item is MenuDivider {
  return 'divider' in item && item.divider === true;
}

function isLabel(item: MenuItem): item is MenuLabel {
  return !isDivider(item);
}

interface Menu {
  id: string;
  labelKey: TranslationKey;
  items: MenuItem[];
}

// ---------------------------------------------------------------------------
// Edit menu commands — dispatch to Monaco or fall back to document.execCommand
// ---------------------------------------------------------------------------

function cmd(actionId: string): MenuAction {
  return () => dispatchEditorCommand(actionId);
}

function execDoc(cmdId: string): MenuAction {
  return () => { document.execCommand(cmdId); };
}

// ---------------------------------------------------------------------------
// Keyboard shortcut registration hook
// ---------------------------------------------------------------------------

function useMenuShortcuts(shortcuts: Record<string, MenuAction>): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = [
        e.ctrlKey || e.metaKey ? 'Ctrl+' : '',
        e.shiftKey ? 'Shift+' : '',
        e.key,
      ].join('');

      const action = shortcuts[key];
      if (action) {
        e.preventDefault();
        action();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const MenuBar: React.FC<{
  onFind?: MenuAction;
  onReplace?: MenuAction;
  onFindInFiles?: MenuAction;
  onSave?: MenuAction;
  onSaveAs?: MenuAction;
  onNewProject?: MenuAction;
  onOpenProject?: MenuAction;
  onCloseProject?: MenuAction;
  onToggleDevTools?: MenuAction;
}> = ({
  onFind,
  onReplace,
  onFindInFiles,
  onSave,
  onSaveAs,
  onNewProject,
  onOpenProject,
  onCloseProject,
  onToggleDevTools,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Keyboard shortcuts — wired to Monaco commands when editor is focused,
  // and to callbacks for project/file operations.
  const shortcuts: Record<string, MenuAction> = {
    'Ctrl+S':     onSave ?? (() => {}),
    'Ctrl+Shift+S': onSaveAs ?? (() => {}),
    'Ctrl+N':     onNewProject ?? (() => {}),
    'Ctrl+O':     onOpenProject ?? (() => {}),
    'Ctrl+Z':     cmd('undo'),
    'Ctrl+Y':     cmd('redo'),
    'Ctrl+A':     cmd('editor.action.selectAll'),
    'Ctrl+F':     onFind ?? (() => {}),
    'Ctrl+H':     onReplace ?? (() => {}),
    'Ctrl+Shift+F': onFindInFiles ?? (() => {}),
  };
  useMenuShortcuts(shortcuts);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  // Close on Escape
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openMenu]);

  const toggle = (id: string) => setOpenMenu((prev) => (prev === id ? null : id));

  const dispatch = (action?: MenuAction) => {
    setOpenMenu(null);
    action?.();
  };

  // Helper: divider items need explicit cast to satisfy strict union types
  const div = (): MenuItem => ({ divider: true } as MenuItem);

  const menus: Menu[] = [
    {
      id: 'file',
      labelKey: 'menu.file',
      items: [
        { labelKey: 'menu.newProject', labelFallback: 'New Project',    action: onNewProject,    shortcut: 'Ctrl+N' },
        { labelKey: 'menu.openProject', labelFallback: 'Open Project…', action: onOpenProject,  shortcut: 'Ctrl+O' },
        div(),
        { labelKey: 'menu.save',        labelFallback: 'Save',          action: onSave,          shortcut: 'Ctrl+S' },
        { labelKey: 'menu.saveAs',      labelFallback: 'Save As…',      action: onSaveAs,        shortcut: 'Ctrl+Shift+S' },
        div(),
        { labelKey: 'menu.closeProject', labelFallback: 'Close Project', action: onCloseProject },
      ],
    },
    {
      id: 'edit',
      labelKey: 'menu.edit',
      items: [
        { labelKey: 'menu.undo',    labelFallback: 'Undo',      action: cmd('undo'),                       shortcut: 'Ctrl+Z' },
        { labelKey: 'menu.redo',    labelFallback: 'Redo',      action: cmd('redo'),                       shortcut: 'Ctrl+Y' },
        div(),
        { labelKey: 'menu.cut',     labelFallback: 'Cut',       action: execDoc('cut'),                     shortcut: 'Ctrl+X' },
        { labelKey: 'menu.copy',    labelFallback: 'Copy',     action: execDoc('copy'),                    shortcut: 'Ctrl+C' },
        { labelKey: 'menu.paste',   labelFallback: 'Paste',   action: execDoc('paste'),                   shortcut: 'Ctrl+V' },
        div(),
        { labelKey: 'menu.selectAll', labelFallback: 'Select All', action: cmd('editor.action.selectAll'), shortcut: 'Ctrl+A' },
        div(),
        { labelKey: 'menu.find',    labelFallback: 'Find',     action: onFind,                            shortcut: 'Ctrl+F' },
        { labelKey: 'menu.replace', labelFallback: 'Replace',  action: onReplace,                          shortcut: 'Ctrl+H' },
        div(),
        { labelKey: 'menu.findInFiles', labelFallback: 'Find in Files', action: onFindInFiles,              shortcut: 'Ctrl+Shift+F' },
      ],
    },
    {
      id: 'view',
      labelKey: 'menu.view',
      items: [
        { labelKey: 'menu.toggleDevTools', labelFallback: 'Toggle Developer Tools', action: onToggleDevTools, shortcut: 'F12' },
        div(),
        { labelKey: 'menu.resetZoomWindow', labelFallback: 'Reset Zoom', action: () => window.location.reload() },
        { labelKey: 'menu.toggleFullscreen', labelFallback: 'Toggle Full Screen', action: () => {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
        }, shortcut: 'F11' },
      ],
    },
    {
      id: 'help',
      labelKey: 'menu.help',
      items: [
        { labelKey: 'menu.about', labelFallback: 'About GalEngine Editor', action: () => {
          window.galengine?.dialog.about();
        }},
      ],
    },
  ];

  return (
    <div className="menubar" ref={menuRef} role="menubar">
      {menus.map((menu) => (
        <div key={menu.id} className="menubar-item-wrapper">
          <button
            className={`menubar-item ${openMenu === menu.id ? 'active' : ''}`}
            onClick={() => toggle(menu.id)}
          >
            {t(menu.labelKey)}
          </button>
          {openMenu === menu.id && (
            <div className="menubar-dropdown" role="menu">
              {menu.items.map((item, idx) =>
                isDivider(item) ? (
                  <div key={`div-${idx}`} className="menubar-divider" />
                ) : (
                  <button
                    key={idx}
                    className="menubar-dropdown-item"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => dispatch(item.action)}
                  >
                    <span>{t(item.labelKey) || item.labelFallback}</span>
                    {item.shortcut && (
                      <span className="menubar-shortcut">{item.shortcut}</span>
                    )}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
