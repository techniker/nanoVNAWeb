import type { Complex, Frame, Hz } from '@nanovnaweb/shared';
import { parseCssColor } from '../color.js';
import { freqToX, resolveYRange, valueToY } from '../math/transforms.js';
import { type GridPass, createGridPass } from '../regl/grid-pass.js';
import { type LinePass, createLinePass } from '../regl/line-pass.js';
import { type ReglContext, createReglContext } from '../regl/setup.js';
import { catmullRomSubdivide } from '../smooth.js';
import type {
  ChartFormatOpts,
  ChartInstance,
  ChartKind,
  ChartRenderer,
  SParam,
  ThemeTokens,
  TraceBinding,
} from '../types.js';

const parseColor = parseCssColor;
const SMOOTH_SUBDIVISIONS = 8;

function pickSParam(frame: Frame, sp: SParam): readonly Complex[] | undefined {
  if (sp === 's11') return frame.s11;
  return frame.s21;
}

function magnitudeDb(c: Complex): number {
  const mag = Math.hypot(c.re, c.im);
  return mag === 0 ? -200 : 20 * Math.log10(mag);
}

function magnitudeLinear(c: Complex): number {
  return Math.hypot(c.re, c.im);
}

export function drawRectangularAtop(
  ctx: ReglContext,
  linePass: LinePass,
  gridPass: GridPass,
  frame: Frame,
  traces: readonly TraceBinding[],
  yValues: (samples: readonly Complex[]) => readonly number[],
  kind: ChartKind,
  formatOpts: ChartFormatOpts | undefined,
  xScale: 'linear' | 'log',
  overlayFrames: Readonly<Record<string, Frame>> | undefined,
  theme: ThemeTokens,
): void {
  const { width, height } = ctx.sizePx;
  const { regl } = ctx;
  regl.clear({ color: parseColor(theme.bg), depth: 1 });

  const freqs = frame.frequencies as readonly Hz[];
  if (freqs.length < 2) return;
  const fMin = (freqs[0] ?? 0) as number;
  const fMax = (freqs[freqs.length - 1] ?? 0) as number;

  // Collect y-values across all visible traces for auto-range.
  const allY: number[] = [];
  for (const t of traces) {
    if (!t.visible) continue;
    const src = t.source === 'live' ? frame : overlayFrames?.[t.id];
    if (!src) continue;
    const samples = pickSParam(src, t.sParam);
    if (!samples) continue;
    allY.push(...yValues(samples));
  }
  // Single source of truth for the Y range. Overlays (tick labels, Ref
  // readout, hover marker) call resolveYRange with the same inputs so the
  // marker row matches the trace row exactly.
  const yRange = resolveYRange(kind, allY, formatOpts);

  // Grid: 10 major x-divisions, 10 major y-divisions.
  const majorSegs: number[] = [];
  const minorSegs: number[] = [];
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * width;
    majorSegs.push(x, 0, x, height);
  }
  for (let i = 0; i <= 10; i++) {
    const y = (i / 10) * height;
    majorSegs.push(0, y, width, y);
  }
  gridPass.draw({
    major: new Float32Array(majorSegs),
    minor: new Float32Array(minorSegs),
    majorColor: parseColor(theme.gridMajor),
    minorColor: parseColor(theme.gridLine),
  });

  // Break the y series into continuous runs at discontinuities (e.g. phase
  // wrapping ±180°). Two consecutive samples are considered a break when the
  // Y step exceeds half of the visible Y range — a heuristic that catches
  // phase wraps without splitting legitimate steep slopes.
  const breakThreshold = (yRange.max - yRange.min) * 0.5;

  // Lines per trace
  for (const t of traces) {
    if (!t.visible) continue;
    const src = t.source === 'live' ? frame : overlayFrames?.[t.id];
    if (!src) continue;
    const samples = pickSParam(src, t.sParam);
    if (!samples) continue;
    const ys = yValues(samples);
    const srcFreqs = src.frequencies as readonly Hz[];
    const runs: number[][] = [[]];
    for (let i = 0; i < samples.length; i++) {
      const f = (srcFreqs[i] ?? 0) as number;
      const y = ys[i] ?? 0;
      const prev = i > 0 ? (ys[i - 1] ?? y) : y;
      if (i > 0 && Math.abs(y - prev) > breakThreshold) {
        runs.push([]);
      }
      const cur = runs[runs.length - 1];
      if (cur !== undefined) {
        cur.push(freqToX(f, fMin, fMax, width, xScale));
        cur.push(valueToY(y, yRange.min, yRange.max, height));
      }
    }
    const color = parseColor(t.color);
    const lineWidth = (t.lineWidth ?? 1.5) * (globalThis.devicePixelRatio ?? 1);
    for (const run of runs) {
      if (run.length < 4) continue; // need at least 2 points for a segment
      const raw = new Float32Array(run);
      const positions = catmullRomSubdivide(raw, SMOOTH_SUBDIVISIONS);
      linePass.draw({ positions, color, lineWidth });
    }
  }
}

export const rectangularRenderer: ChartRenderer = {
  kind: 'rect',
  displayName: 'Rectangular',
  mount(canvas) {
    const ctx = createReglContext(canvas);
    const linePass = createLinePass(ctx);
    const gridPass = createGridPass(ctx);

    const instance: ChartInstance = {
      resize(width, height, dpr) {
        ctx.resizeToCss(width, height, dpr);
      },
      draw(frame, traces, format, theme) {
        const opts = format.rect ?? ({ mode: 'db-mag', xScale: 'linear' } as const);
        const yFn =
          opts.mode === 'db-mag'
            ? (samples: readonly Complex[]): readonly number[] => samples.map(magnitudeDb)
            : (samples: readonly Complex[]): readonly number[] => samples.map(magnitudeLinear);
        drawRectangularAtop(
          ctx,
          linePass,
          gridPass,
          frame,
          traces,
          yFn,
          'rect',
          format,
          opts.xScale,
          format.overlayFrames,
          theme,
        );
      },
      destroy() {
        linePass.destroy();
        gridPass.destroy();
        ctx.destroy();
      },
    };
    return instance;
  },
};
