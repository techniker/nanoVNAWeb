import { DEFAULT_THEME_TOKENS, type ThemeTokens } from '@nanovnaweb/render';

/**
 * Reads theme tokens from CSS custom properties on an HTML element (typically
 * `document.documentElement`). Falls back to `DEFAULT_THEME_TOKENS` for any
 * missing token. Mirrors the logic of `@nanovnaweb/render`'s `readThemeTokens`
 * but accepts an arbitrary element — the render helper is typed for canvases
 * because it runs under the renderer.
 */
export function readThemeFromElement(el: Element): ThemeTokens {
  const view = el.ownerDocument.defaultView;
  if (view === null) return DEFAULT_THEME_TOKENS;
  const style = view.getComputedStyle(el);
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

export function readThemeFromRoot(): ThemeTokens {
  return readThemeFromElement(document.documentElement);
}
