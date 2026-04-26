import type { ThemeTokens } from '../types.js';

const DEFAULT_PALETTE: readonly string[] = Object.freeze([
  '#00e0ff',
  '#ff5d73',
  '#ffd14d',
  '#7affc3',
  '#b38bff',
  '#ff8fb8',
  '#78d2ff',
  '#ffb56b',
]);

export const DEFAULT_THEME_TOKENS: ThemeTokens = Object.freeze({
  bg: '#0f1115',
  fg: '#e4e6ea',
  gridLine: '#272a33',
  gridMajor: '#3a3e4a',
  axis: '#4c5161',
  label: '#9096a6',
  tracePalette: DEFAULT_PALETTE,
});

/**
 * Reads theme tokens from CSS custom properties on the canvas's document.
 * Falls back to DEFAULT_THEME_TOKENS for any missing token.
 * Returns DEFAULT_THEME_TOKENS unconditionally for OffscreenCanvas (no DOM).
 */
export function readThemeTokens(canvas: HTMLCanvasElement | OffscreenCanvas): ThemeTokens {
  // Check for HTMLCanvasElement via feature detection (no `instanceof`
  // because jsdom + Node-less environments vary).
  if (typeof (canvas as { ownerDocument?: unknown }).ownerDocument === 'undefined') {
    return DEFAULT_THEME_TOKENS;
  }
  const el = canvas as HTMLCanvasElement;
  const style = el.ownerDocument?.defaultView?.getComputedStyle(el);
  if (!style) return DEFAULT_THEME_TOKENS;
  const prop = (name: string, fallback: string): string => {
    const v = style.getPropertyValue(name).trim();
    return v.length > 0 ? v : fallback;
  };
  const palette: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const v = style.getPropertyValue(`--color-trace-${i}`).trim();
    palette.push(v.length > 0 ? v : (DEFAULT_THEME_TOKENS.tracePalette[i - 1] ?? '#ffffff'));
  }
  return Object.freeze({
    bg: prop('--color-bg', DEFAULT_THEME_TOKENS.bg),
    fg: prop('--color-fg', DEFAULT_THEME_TOKENS.fg),
    gridLine: prop('--color-grid-line', DEFAULT_THEME_TOKENS.gridLine),
    gridMajor: prop('--color-grid-major', DEFAULT_THEME_TOKENS.gridMajor),
    axis: prop('--color-axis', DEFAULT_THEME_TOKENS.axis),
    label: prop('--color-label', DEFAULT_THEME_TOKENS.label),
    tracePalette: Object.freeze([...palette]),
  });
}
