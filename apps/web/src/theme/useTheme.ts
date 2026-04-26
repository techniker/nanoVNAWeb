import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

const STORAGE_KEY = 'nanovnaweb.theme';

function isMode(v: unknown): v is ThemeMode {
  return v === 'system' || v === 'light' || v === 'dark';
}

function readStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isMode(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return true;
  }
}

function effectiveFor(mode: ThemeMode): EffectiveTheme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

function apply(effective: EffectiveTheme): void {
  if (effective === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export interface UseThemeResult {
  readonly mode: ThemeMode;
  readonly effective: EffectiveTheme;
  setMode(next: ThemeMode): void;
}

export function useTheme(): UseThemeResult {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode());
  const [effective, setEffective] = useState<EffectiveTheme>(() => effectiveFor(readStoredMode()));

  useEffect(() => {
    const next = effectiveFor(mode);
    setEffective(next);
    apply(next);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (): void => {
      const next = effectiveFor('system');
      setEffective(next);
      apply(next);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode): void => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — fall back to in-memory state only
    }
  }, []);

  return { mode, effective, setMode };
}
