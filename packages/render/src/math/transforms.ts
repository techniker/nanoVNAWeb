export function freqToX(
  freq: number,
  fMin: number,
  fMax: number,
  width: number,
  scale: 'linear' | 'log',
): number {
  if (scale === 'log') {
    const logMin = Math.log10(fMin);
    const logMax = Math.log10(fMax);
    const logF = Math.log10(freq);
    if (logMax === logMin) return 0;
    return ((logF - logMin) / (logMax - logMin)) * width;
  }
  if (fMax === fMin) return 0;
  return ((freq - fMin) / (fMax - fMin)) * width;
}

export function valueToY(v: number, vMin: number, vMax: number, height: number): number {
  if (vMax === vMin) return height / 2;
  return ((vMax - v) / (vMax - vMin)) * height;
}

export function yToValue(y: number, vMin: number, vMax: number, height: number): number {
  if (vMax === vMin) return vMin;
  return vMax - (y / height) * (vMax - vMin);
}

export function autoYRange(values: readonly number[]): { min: number; max: number } {
  if (values.length === 0) return { min: -1, max: 1 };
  let min = values[0] ?? 0;
  let max = values[0] ?? 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) {
    const pad = Math.abs(min) * 0.1 + 1;
    return { min: min - pad, max: max + pad };
  }
  const pad = (max - min) * 0.05;
  return { min: min - pad, max: max + pad };
}

import type { ChartFormatOpts, ChartKind } from '../types.js';

/**
 * Single source of truth for a chart's Y-axis range. Both the regl renderer
 * (trace + grid) and the DOM overlays (tick labels, Ref readout, hover
 * marker) call this with the same inputs so the pixel position of any
 * value matches across all layers. Previously the renderer used a fixed
 * scale for VSWR ([1, 10]) and phase ([-180°, +180°]) while overlays
 * auto-ranged from the data — markers drifted off the trace.
 */
export function resolveYRange(
  kind: ChartKind,
  values: readonly number[],
  opts?: ChartFormatOpts,
): { min: number; max: number } {
  switch (kind) {
    case 'rect': {
      const o = opts?.rect;
      if (o?.yMin !== undefined && o.yMax !== undefined) {
        return { min: o.yMin, max: o.yMax };
      }
      return autoYRange(values);
    }
    case 'vswr': {
      const o = opts?.vswr;
      return { min: o?.yMin ?? 1, max: o?.yMax ?? 10 };
    }
    case 'phase': {
      const o = opts?.phase;
      const unwrap = o?.unwrap ?? false;
      const units = o?.units ?? 'deg';
      if (units === 'deg' && !unwrap) return { min: -180, max: 180 };
      if (units === 'rad' && !unwrap) return { min: -Math.PI, max: Math.PI };
      return autoYRange(values);
    }
    // 'smith' has no scalar Y axis — it's handled by the Smith renderer
    // separately — but we still return a sensible range here for
    // completeness when a caller asks generically.
    default:
      return autoYRange(values);
  }
}
