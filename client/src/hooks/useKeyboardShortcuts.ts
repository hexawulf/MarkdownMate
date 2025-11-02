import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlOrCmd: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

    for (const shortcut of shortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const cmdMatches = shortcut.ctrlOrCmd ? cmdOrCtrl : true;
      const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatches = shortcut.alt ? event.altKey : !event.altKey;

      if (keyMatches && cmdMatches && shiftMatches && altMatches) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Predefined shortcuts
export const createEditorShortcuts = (actions: {
  onSave: () => void;
  onExport: () => void;
  onHelp: () => void;
  onBold: () => void;
  onItalic: () => void;
  onCode: () => void;
  onCommandPalette: () => void;
}): KeyboardShortcut[] => [
  {
    key: 's',
    ctrlOrCmd: true,
    action: actions.onSave,
    description: 'Save document',
  },
  {
    key: 'e',
    ctrlOrCmd: true,
    action: actions.onExport,
    description: 'Export document',
  },
  {
    key: '/',
    ctrlOrCmd: true,
    action: actions.onHelp,
    description: 'Show help',
  },
  {
    key: 'b',
    ctrlOrCmd: true,
    action: actions.onBold,
    description: 'Bold text',
  },
  {
    key: 'i',
    ctrlOrCmd: true,
    action: actions.onItalic,
    description: 'Italic text',
  },
  {
    key: 'k',
    ctrlOrCmd: true,
    action: actions.onCode,
    description: 'Inline code',
  },
  {
    key: 'p',
    ctrlOrCmd: true,
    shift: true,
    action: actions.onCommandPalette,
    description: 'Command palette',
  },
];

export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];
  
  if (shortcut.ctrlOrCmd) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(isMac ? '' : '+');
}
