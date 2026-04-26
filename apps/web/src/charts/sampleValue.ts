import type { ChartKind, SParam } from '@nanovnaweb/render';
import type { Complex, Frame } from '@nanovnaweb/shared';

export interface DerivedSeries {
  readonly freqs: readonly number[];
  readonly values: readonly number[];
  readonly unit: string;
  readonly title: string;
}

function pickSamples(frame: Frame, sp: SParam): readonly Complex[] | undefined {
  return sp === 's21' ? frame.s21 : frame.s11;
}

function magDb(c: Complex): number {
  const m = Math.hypot(c.re, c.im);
  return m > 0 ? 20 * Math.log10(m) : Number.NEGATIVE_INFINITY;
}

function toVswr(c: Complex): number {
  const m = Math.min(Math.hypot(c.re, c.im), 0.999_999);
  return (1 + m) / (1 - m);
}

function phaseDeg(c: Complex): number {
  return (Math.atan2(c.im, c.re) * 180) / Math.PI;
}

/**
 * Projects a live `Frame` into a concrete (x, y) series using the semantics
 * of the target chart kind. Smith has no scalar Y axis so it returns `null`
 * — callers should suppress overlays for Smith.
 */
export function deriveSeries(
  frame: Frame | null,
  kind: ChartKind,
  sParam: SParam,
): DerivedSeries | null {
  if (frame === null) return null;
  const samples = pickSamples(frame, sParam);
  if (samples === undefined) return null;
  const freqs: number[] = frame.frequencies.map((f) => Number(f));
  const paramLabel = sParam.toUpperCase();

  switch (kind) {
    case 'rect': {
      const values = samples.map((c) => magDb(c));
      return { freqs, values, unit: 'dB', title: `${paramLabel} log magnitude` };
    }
    case 'vswr': {
      const values = samples.map((c) => toVswr(c));
      return { freqs, values, unit: ':1', title: `${paramLabel} VSWR` };
    }
    case 'phase': {
      const values = samples.map((c) => phaseDeg(c));
      return { freqs, values, unit: '°', title: `${paramLabel} phase` };
    }
    case 'groupDelay': {
      // n-1 samples; midpoint frequencies.
      if (samples.length < 2) return null;
      const gdFreqs: number[] = [];
      const gdValues: number[] = [];
      const prevFreqs = freqs;
      for (let i = 1; i < samples.length; i++) {
        const f0 = prevFreqs[i - 1] ?? 0;
        const f1 = prevFreqs[i] ?? 0;
        const s0 = samples[i - 1];
        const s1 = samples[i];
        if (s0 === undefined || s1 === undefined) continue;
        const df = f1 - f0;
        if (df <= 0) continue;
        const dphi = ((phaseDeg(s1) - phaseDeg(s0) + 540) % 360) - 180; // unwrapped step in deg
        const seconds = -(dphi * Math.PI) / 180 / (2 * Math.PI * df);
        gdFreqs.push((f0 + f1) / 2);
        gdValues.push(seconds);
      }
      return { freqs: gdFreqs, values: gdValues, unit: 's', title: `${paramLabel} group delay` };
    }
    case 'smith':
      return null;
    default:
      return null;
  }
}

export function formatHz(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`;
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(2)} kHz`;
  return `${hz.toFixed(0)} Hz`;
}

export interface GammaSample {
  readonly index: number;
  readonly freq: number;
  readonly re: number;
  readonly im: number;
}

/**
 * Returns the S11 samples of a live frame (or null if absent) in a flat
 * form convenient for Smith-chart hover lookup.
 */
export function gammaSeries(frame: Frame | null, sParam: SParam): readonly GammaSample[] | null {
  if (frame === null) return null;
  const samples = pickSamples(frame, sParam);
  if (samples === undefined) return null;
  const out: GammaSample[] = [];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const f = frame.frequencies[i];
    if (s === undefined || f === undefined) continue;
    out.push({ index: i, freq: Number(f), re: s.re, im: s.im });
  }
  return out;
}

/**
 * Nearest-sample search on the Γ plane (Euclidean distance). Returns null
 * for an empty series or when the pointer is so far out it shouldn't show
 * a marker.
 */
export function nearestGamma(
  series: readonly GammaSample[],
  targetRe: number,
  targetIm: number,
): GammaSample | null {
  let best: GammaSample | null = null;
  let bestD2 = Number.POSITIVE_INFINITY;
  for (const s of series) {
    const dr = s.re - targetRe;
    const di = s.im - targetIm;
    const d2 = dr * dr + di * di;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = s;
    }
  }
  return best;
}

/**
 * Convert a normalized reflection coefficient Γ to impedance Z = R + jX
 * referenced to Z₀ (default 50 Ω). Returns null for |Γ| ≥ 1 (open/short).
 */
export function gammaToImpedance(re: number, im: number, z0 = 50): { r: number; x: number } | null {
  const denomRe = 1 - re;
  const denomIm = -im;
  const denom2 = denomRe * denomRe + denomIm * denomIm;
  if (denom2 === 0) return null;
  const numRe = 1 + re;
  const numIm = im;
  // (a + jb) / (c + jd) = ((ac + bd) + j(bc - ad)) / (c² + d²)
  const r = (numRe * denomRe + numIm * denomIm) / denom2;
  const x = (numIm * denomRe - numRe * denomIm) / denom2;
  return { r: r * z0, x: x * z0 };
}

export function formatImpedance(z: { r: number; x: number } | null): string {
  if (z === null) return '∞ Ω';
  const sign = z.x >= 0 ? '+' : '−';
  return `${z.r.toFixed(2)} ${sign} j${Math.abs(z.x).toFixed(2)} Ω`;
}

export function formatValue(v: number, unit: string): string {
  if (unit === 's') {
    const abs = Math.abs(v);
    if (abs >= 1e-3) return `${(v * 1e3).toFixed(3)} ms`;
    if (abs >= 1e-6) return `${(v * 1e6).toFixed(3)} µs`;
    if (abs >= 1e-9) return `${(v * 1e9).toFixed(3)} ns`;
    return `${(v * 1e12).toFixed(2)} ps`;
  }
  if (unit === ':1') return `${v.toFixed(3)}${unit}`;
  if (unit === '°') return `${v.toFixed(2)}${unit}`;
  return `${v.toFixed(2)} ${unit}`;
}
