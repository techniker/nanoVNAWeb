import type { Complex, Frame } from '@nanovnaweb/shared';
import { parseCssColor } from '../color.js';
import { createGridPass } from '../regl/grid-pass.js';
import { createLinePass } from '../regl/line-pass.js';
import { createReglContext } from '../regl/setup.js';
import { catmullRomSubdivide } from '../smooth.js';
import type { ChartInstance, ChartRenderer, SParam } from '../types.js';

const parseColor = parseCssColor;
const SMOOTH_SUBDIVISIONS = 8;

function pick(frame: Frame, sp: SParam): readonly Complex[] | undefined {
  return sp === 's11' ? frame.s11 : frame.s21;
}

/**
 * Maps a reflection-coefficient Complex (re, im) on the unit disk to
 * pixel coordinates inside the canvas. The disk fits into the smaller
 * of (width, height) and is centered. Samples with |Γ| > 1 (measurement
 * noise, gain, or active devices) are clamped to the unit circle so the
 * rendered trace stays within the Smith disk — matching every hardware
 * VNA's display convention.
 */
function gammaToPx(g: Complex, width: number, height: number): { x: number; y: number } {
  const r = Math.min(width, height) / 2;
  const cx = width / 2;
  const cy = height / 2;
  const mag = Math.hypot(g.re, g.im);
  const scale = mag > 1 ? 1 / mag : 1;
  return { x: cx + g.re * scale * r, y: cy - g.im * scale * r };
}

/** Circle approximated as N line segments. Returns pairs-of-points array. */
function circleSegs(centerX: number, centerY: number, radius: number, segments = 64): number[] {
  const out: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    out.push(
      centerX + Math.cos(a1) * radius,
      centerY + Math.sin(a1) * radius,
      centerX + Math.cos(a2) * radius,
      centerY + Math.sin(a2) * radius,
    );
  }
  return out;
}

/**
 * Clips a line segment to the inside of a disk. Returns a two-point segment
 * with both endpoints on-or-inside the disk, or null when the segment lies
 * entirely outside (or only grazes the boundary).
 */
function clipSegmentToDisk(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  cx: number,
  cy: number,
  r: number,
): [number, number, number, number] | null {
  const d1 = Math.hypot(p1x - cx, p1y - cy);
  const d2 = Math.hypot(p2x - cx, p2y - cy);
  const inside1 = d1 <= r;
  const inside2 = d2 <= r;
  if (inside1 && inside2) return [p1x, p1y, p2x, p2y];
  if (!inside1 && !inside2) {
    // Both endpoints outside — the segment might still cross the disk,
    // but for grid arcs the portion inside is negligible, so drop.
    return null;
  }
  // Exactly one endpoint inside. Solve |p1 + t·(p2-p1) - c|² = r² for t.
  const dx = p2x - p1x;
  const dy = p2y - p1y;
  const fx = p1x - cx;
  const fy = p1y - cy;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const t1 = (-b - sq) / (2 * a);
  const t2 = (-b + sq) / (2 * a);
  // Choose the t in [0, 1].
  const t = t1 >= 0 && t1 <= 1 ? t1 : t2 >= 0 && t2 <= 1 ? t2 : null;
  if (t === null) return null;
  const ix = p1x + t * dx;
  const iy = p1y + t * dy;
  if (inside1) return [p1x, p1y, ix, iy];
  return [ix, iy, p2x, p2y];
}

/**
 * Constant-X arc in the Smith chart. Circle centered at (1, 1/X) with
 * radius 1/|X| in the Gamma-plane, properly clipped to the unit disk at
 * the intersection points (not just segment-level inside/outside).
 */
function arcSegsConstX(x: number, diskR: number, cx: number, cy: number, segments = 64): number[] {
  const out: number[] = [];
  const r = 1 / Math.abs(x);
  const gc = { re: 1, im: 1 / x };
  const circleCenterX = cx + gc.re * diskR;
  const circleCenterY = cy - gc.im * diskR;
  const pxR = r * diskR;
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 1) / segments) * Math.PI * 2;
    const p1x = circleCenterX + Math.cos(a1) * pxR;
    const p1y = circleCenterY + Math.sin(a1) * pxR;
    const p2x = circleCenterX + Math.cos(a2) * pxR;
    const p2y = circleCenterY + Math.sin(a2) * pxR;
    const clipped = clipSegmentToDisk(p1x, p1y, p2x, p2y, cx, cy, diskR);
    if (clipped !== null) out.push(...clipped);
  }
  return out;
}

const ORIGIN: Complex = { re: 0, im: 0 };

export const smithRenderer: ChartRenderer = {
  kind: 'smith',
  displayName: 'Smith',
  mount(canvas) {
    const ctx = createReglContext(canvas);
    const linePass = createLinePass(ctx);
    const gridPass = createGridPass(ctx);

    const instance: ChartInstance = {
      resize(width, height, dpr) {
        ctx.resizeToCss(width, height, dpr);
      },
      draw(frame, traces, format, theme) {
        const { width, height } = ctx.sizePx;
        const { regl } = ctx;
        regl.clear({ color: parseColor(theme.bg), depth: 1 });

        const diskR = (Math.min(width, height) / 2) * 0.9;
        const cx = width / 2;
        const cy = height / 2;

        // Grid: constant-R circles (R in {0.2, 0.5, 1, 2, 5}) + constant-X arcs
        const majorSegs: number[] = [];
        // Unit circle (Gamma boundary)
        majorSegs.push(...circleSegs(cx, cy, diskR));
        // Constant-R circles: center at (R/(R+1), 0), radius 1/(R+1) in Gamma-plane
        for (const r of [0.2, 0.5, 1, 2, 5]) {
          const ccxGamma = r / (r + 1);
          const ccrGamma = 1 / (r + 1);
          majorSegs.push(...circleSegs(cx + ccxGamma * diskR, cy, ccrGamma * diskR));
        }
        // Constant-X arcs (both +X and -X for a few values)
        for (const xv of [0.2, 0.5, 1, 2, 5]) {
          majorSegs.push(...arcSegsConstX(xv, diskR, cx, cy));
          majorSegs.push(...arcSegsConstX(-xv, diskR, cx, cy));
        }
        // Central horizontal axis
        majorSegs.push(cx - diskR, cy, cx + diskR, cy);

        gridPass.draw({
          major: new Float32Array(majorSegs),
          minor: new Float32Array(0),
          majorColor: parseColor(theme.gridMajor),
          minorColor: parseColor(theme.gridLine),
        });

        // Traces
        for (const t of traces) {
          if (!t.visible) continue;
          const src = t.source === 'live' ? frame : format.overlayFrames?.[t.id];
          if (!src) continue;
          const samples = pick(src, t.sParam);
          if (!samples) continue;
          const raw = new Float32Array(samples.length * 2);
          for (let i = 0; i < samples.length; i++) {
            const g = samples[i] ?? ORIGIN;
            const px = gammaToPx(g, width, height);
            raw[i * 2] = px.x;
            raw[i * 2 + 1] = px.y;
          }
          const smoothed = catmullRomSubdivide(raw, SMOOTH_SUBDIVISIONS);
          // Clamp every interpolated sample to a disk slightly smaller than
          // the grid's outer circle. The fat-line primitive expands each
          // segment perpendicular by lineWidth/2 plus ~1 px of AA feather,
          // so the centerline must stay inside that much of a margin or
          // the rendered line pokes out past the chart boundary. This is
          // both a post-smoothing clamp (Catmull-Rom can overshoot) and a
          // half-width-aware clamp (keeps fat-line expansion on-circle).
          const lineHalfPx = ((t.lineWidth ?? 1.5) * (globalThis.devicePixelRatio ?? 1)) / 2 + 1;
          const diskR = Math.min(width, height) / 2 - lineHalfPx;
          const cx = width / 2;
          const cy = height / 2;
          const positions = smoothed;
          for (let i = 0; i < positions.length; i += 2) {
            const dx = (positions[i] ?? 0) - cx;
            const dy = (positions[i + 1] ?? 0) - cy;
            const d = Math.hypot(dx, dy);
            if (d > diskR) {
              const scale = diskR / d;
              positions[i] = cx + dx * scale;
              positions[i + 1] = cy + dy * scale;
            }
          }
          linePass.draw({
            positions,
            color: parseColor(t.color),
            lineWidth: (t.lineWidth ?? 1.5) * (globalThis.devicePixelRatio ?? 1),
          });
        }
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
