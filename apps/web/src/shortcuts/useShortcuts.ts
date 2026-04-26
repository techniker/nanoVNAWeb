import type { LayoutPreset } from '@nanovnaweb/state';
import { useEffect } from 'react';

export interface ShortcutHandlers {
  onTogglePause(): void;
  onSaveSnapshot(): void;
  onEscape(): void;
  onLayout(preset: LayoutPreset): void;
}

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

const NUM_PRESETS: Readonly<Record<string, LayoutPreset>> = Object.freeze({
  '1': 'single',
  '2': 'horizontal-pair',
  '3': 'vertical-pair',
  '4': 'quad',
});

export function useShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isEditableTarget(e.target)) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handlers.onTogglePause();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handlers.onSaveSnapshot();
        return;
      }
      if (e.key === 'Escape') {
        handlers.onEscape();
        return;
      }
      const preset = NUM_PRESETS[e.key];
      if (preset !== undefined) {
        handlers.onLayout(preset);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
