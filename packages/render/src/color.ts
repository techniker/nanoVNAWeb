export type Rgba = [number, number, number, number];

const OPAQUE_BLACK: Rgba = [0, 0, 0, 1];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function parseHex(body: string): Rgba | null {
  const expand =
    body.length === 3 || body.length === 4
      ? body
          .split('')
          .map((c) => c + c)
          .join('')
      : body;
  if (expand.length !== 6 && expand.length !== 8) return null;
  const r = Number.parseInt(expand.slice(0, 2), 16) / 255;
  const g = Number.parseInt(expand.slice(2, 4), 16) / 255;
  const b = Number.parseInt(expand.slice(4, 6), 16) / 255;
  const a = expand.length === 8 ? Number.parseInt(expand.slice(6, 8), 16) / 255 : 1;
  if ([r, g, b, a].some((v) => Number.isNaN(v))) return null;
  return [clamp01(r), clamp01(g), clamp01(b), clamp01(a)];
}

function parseFunc(css: string): Rgba | null {
  // rgb(r g b / a), rgb(r, g, b), rgba(r, g, b, a) — space- or comma-separated.
  const open = css.indexOf('(');
  const close = css.lastIndexOf(')');
  if (open < 0 || close <= open) return null;
  const name = css.slice(0, open).trim().toLowerCase();
  const body = css.slice(open + 1, close).trim();
  if (name !== 'rgb' && name !== 'rgba') return null;
  const [rgbPart, alphaPart] = body.includes('/') ? body.split('/') : [body, undefined];
  const parts = (rgbPart ?? '').split(/[\s,]+/).filter((s) => s.length > 0);
  if (parts.length < 3) return null;
  const [rs, gs, bs, maybeAs] = parts;
  const toByte = (token: string | undefined): number => {
    if (token === undefined) return 0;
    if (token.endsWith('%')) return Number.parseFloat(token) / 100;
    return Number.parseFloat(token) / 255;
  };
  const toAlpha = (token: string | undefined): number => {
    if (token === undefined) return 1;
    if (token.endsWith('%')) return Number.parseFloat(token) / 100;
    return Number.parseFloat(token);
  };
  const r = toByte(rs);
  const g = toByte(gs);
  const b = toByte(bs);
  const a = toAlpha(alphaPart?.trim() ?? maybeAs);
  if ([r, g, b, a].some((v) => Number.isNaN(v))) return null;
  return [clamp01(r), clamp01(g), clamp01(b), clamp01(a)];
}

/**
 * Parses a CSS color string into an RGBA tuple with components in [0, 1].
 * Supports: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(…)`, `rgba(…)`.
 * CSS `var(…)` references must be resolved by the caller first (via
 * `getComputedStyle(el).color` on an element where the var is applied).
 * Returns opaque black on parse failure.
 */
export function parseCssColor(css: string): Rgba {
  if (css.length === 0) return OPAQUE_BLACK;
  const trimmed = css.trim();
  if (trimmed.startsWith('#')) {
    return parseHex(trimmed.slice(1)) ?? OPAQUE_BLACK;
  }
  if (trimmed.includes('(')) {
    return parseFunc(trimmed) ?? OPAQUE_BLACK;
  }
  return OPAQUE_BLACK;
}
