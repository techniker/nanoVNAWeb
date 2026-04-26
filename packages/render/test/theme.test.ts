import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_TOKENS, readThemeTokens } from '../src/theme/read-tokens.js';

describe('DEFAULT_THEME_TOKENS', () => {
  it('contains all required fields', () => {
    expect(DEFAULT_THEME_TOKENS.bg).toBeTruthy();
    expect(DEFAULT_THEME_TOKENS.fg).toBeTruthy();
    expect(DEFAULT_THEME_TOKENS.gridLine).toBeTruthy();
    expect(DEFAULT_THEME_TOKENS.gridMajor).toBeTruthy();
    expect(DEFAULT_THEME_TOKENS.axis).toBeTruthy();
    expect(DEFAULT_THEME_TOKENS.label).toBeTruthy();
    expect(DEFAULT_THEME_TOKENS.tracePalette.length).toBeGreaterThan(0);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_THEME_TOKENS)).toBe(true);
    expect(Object.isFrozen(DEFAULT_THEME_TOKENS.tracePalette)).toBe(true);
  });
});

describe('readThemeTokens', () => {
  it('returns defaults when given an OffscreenCanvas (no DOM)', () => {
    // Node environment — OffscreenCanvas type isn't instantiable; we fake it
    // with a minimal object that the function can identify as non-HTMLCanvasElement.
    const fakeOffscreen = {} as unknown as OffscreenCanvas;
    const tokens = readThemeTokens(fakeOffscreen);
    expect(tokens).toEqual(DEFAULT_THEME_TOKENS);
  });
});
