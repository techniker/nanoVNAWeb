import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTheme } from '../../src/theme/useTheme.js';

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to system mode when no stored value', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('system');
  });

  it('applies dark class when mode is dark', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setMode('dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(result.current.effective).toBe('dark');
  });

  it('removes dark class when mode is light', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setMode('light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(result.current.effective).toBe('light');
  });

  it('persists mode to localStorage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setMode('light'));
    expect(localStorage.getItem('nanovnaweb.theme')).toBe('light');
  });

  it('restores stored mode on mount', () => {
    localStorage.setItem('nanovnaweb.theme', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('system mode follows matchMedia preference', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q) =>
        ({
          matches: q.includes('dark'),
          media: q,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setMode('system'));
    expect(result.current.effective).toBe('dark');
  });
});
