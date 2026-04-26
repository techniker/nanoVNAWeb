import { type ChartKind, type SParam, resolveYRange } from '@nanovnaweb/render';
import type { Frame } from '@nanovnaweb/shared';
import { useChartStore, useStores } from '@nanovnaweb/state';
import type React from 'react';
import { useCallback, useMemo } from 'react';
import {
  type DerivedSeries,
  type GammaSample,
  deriveSeries,
  formatHz,
  formatValue,
  gammaSeries,
  gammaToImpedance,
} from './sampleValue.js';
import { nearestSampleIndex } from './useNearestSample.js';

export interface HoverTrace {
  readonly id: string;
  readonly sParam: SParam;
  readonly color: string;
  readonly frame: Frame;
}

export interface HoverCrosshairProps {
  readonly kind: ChartKind;
  readonly traces: readonly HoverTrace[];
}

interface SmithResolved {
  readonly id: string;
  readonly color: string;
  readonly samples: readonly GammaSample[];
}

interface RectResolved {
  readonly id: string;
  readonly color: string;
  readonly series: DerivedSeries;
}

/**
 * Shared cursor across all chart slots.
 *
 * onMove sets a shared hover frequency (chart-store.hoverFrequencyHz) and a
 * shared "active trace id" — whichever visible trace the pointer is closest
 * to. Every slot reads both and draws one hollow-diamond marker *per*
 * visible trace at that frequency, each in its own trace color. The active
 * trace gets the readout label. This lets the user hover an imported
 * overlay on the Smith chart and see the marker land on *that* curve — not
 * on the primary live trace.
 */
export function HoverCrosshair(props: HoverCrosshairProps): React.ReactElement {
  const stores = useStores();
  const hoverHz = useChartStore(stores.chart.store, (s) => s.hoverFrequencyHz);
  const activeTraceId = useChartStore(stores.chart.store, (s) => s.hoverActiveTraceId);

  // Which trace's marker carries the readout label in *this* chart. If the
  // user is hovering a trace inside this chart, that's the active one;
  // otherwise fall back to the chart's primary (first-listed) trace so
  // every synchronized cursor still shows a readout on some curve.
  const labelTraceId = useMemo(() => {
    if (activeTraceId !== null && props.traces.some((t) => t.id === activeTraceId)) {
      return activeTraceId;
    }
    return props.traces[0]?.id ?? null;
  }, [activeTraceId, props.traces]);

  const rectTraces = useMemo<readonly RectResolved[]>(() => {
    if (props.kind === 'smith') return [];
    const out: RectResolved[] = [];
    for (const t of props.traces) {
      const series = deriveSeries(t.frame, props.kind, t.sParam);
      if (series === null) continue;
      out.push({ id: t.id, color: t.color, series });
    }
    return out;
  }, [props.kind, props.traces]);

  // Every rect chart in this slot shares the same X axis (frequency). Take
  // the primary trace's frequency range as the reference — overlay traces
  // are plotted against the same axis.
  const rectXRange = useMemo<{ first: number; last: number } | null>(() => {
    const primary = rectTraces[0]?.series;
    if (primary === undefined || primary.freqs.length < 2) return null;
    const first = primary.freqs[0] ?? 0;
    const last = primary.freqs[primary.freqs.length - 1] ?? 0;
    if (last <= first) return null;
    return { first, last };
  }, [rectTraces]);

  // The Y range used by the regl renderer, auto-computed across *every*
  // visible trace's values so an overlay that exceeds the live trace's
  // envelope still fits inside the plot area.
  const rectYRange = useMemo(() => {
    if (props.kind === 'smith' || rectTraces.length === 0) return null;
    const all: number[] = [];
    for (const t of rectTraces) all.push(...t.series.values);
    return resolveYRange(props.kind, all);
  }, [props.kind, rectTraces]);

  const smithTraces = useMemo<readonly SmithResolved[]>(() => {
    if (props.kind !== 'smith') return [];
    const out: SmithResolved[] = [];
    for (const t of props.traces) {
      const samples = gammaSeries(t.frame, t.sParam);
      if (samples === null || samples.length === 0) continue;
      out.push({ id: t.id, color: t.color, samples });
    }
    return out;
  }, [props.kind, props.traces]);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (props.kind === 'smith') {
        if (smithTraces.length === 0) {
          stores.chart.actions.setHover(null, null);
          return;
        }
        const r = Math.min(rect.width, rect.height) / 2;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const targetRe = (e.clientX - rect.left - cx) / r;
        const targetIm = -(e.clientY - rect.top - cy) / r;
        let bestFreq: number | null = null;
        let bestId: string | null = null;
        let bestD2 = Number.POSITIVE_INFINITY;
        for (const t of smithTraces) {
          for (const s of t.samples) {
            const dr = s.re - targetRe;
            const di = s.im - targetIm;
            const d2 = dr * dr + di * di;
            if (d2 < bestD2) {
              bestD2 = d2;
              bestFreq = s.freq;
              bestId = t.id;
            }
          }
        }
        stores.chart.actions.setHover(bestFreq, bestId);
        return;
      }
      if (rectXRange === null || rectTraces.length === 0 || rectYRange === null) {
        stores.chart.actions.setHover(null, null);
        return;
      }
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetHz = rectXRange.first + (rectXRange.last - rectXRange.first) * pct;
      const targetYPct = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      // Pick the trace whose value at the hovered X is closest to the
      // pointer Y — lets the user hover any of several stacked curves and
      // have the marker snap to that one specifically.
      const { min, max } = rectYRange;
      const denom = max === min ? 1 : max - min;
      let bestFreq: number | null = null;
      let bestId: string | null = null;
      let bestDy = Number.POSITIVE_INFINITY;
      for (const t of rectTraces) {
        const idx = nearestSampleIndex(t.series.freqs, targetHz);
        if (idx < 0) continue;
        const f = t.series.freqs[idx] ?? 0;
        const v = t.series.values[idx] ?? 0;
        const yPct = (max - v) / denom;
        const dy = Math.abs(yPct - targetYPct);
        if (dy < bestDy) {
          bestDy = dy;
          bestFreq = f;
          bestId = t.id;
        }
      }
      stores.chart.actions.setHover(bestFreq, bestId);
    },
    [props.kind, smithTraces, rectTraces, rectXRange, rectYRange, stores],
  );

  const onLeave = useCallback(() => {
    stores.chart.actions.setHover(null, null);
  }, [stores]);

  // Per-trace marker payload derived from the shared hoverHz.
  const smithMarkers = useMemo(() => {
    if (props.kind !== 'smith' || hoverHz === null) return [];
    const out: { id: string; color: string; re: number; im: number; label: string }[] = [];
    for (const t of smithTraces) {
      let sample: GammaSample | null = t.samples[0] ?? null;
      for (const s of t.samples) {
        if (Math.abs(s.freq - hoverHz) < Math.abs((sample?.freq ?? 0) - hoverHz)) sample = s;
      }
      if (sample === null) continue;
      const mag = Math.hypot(sample.re, sample.im);
      const vswr = mag < 0.999_999 ? (1 + mag) / (1 - mag) : Number.POSITIVE_INFINITY;
      const z = gammaToImpedance(sample.re, sample.im);
      const label = `${formatHz(sample.freq)} · VSWR ${Number.isFinite(vswr) ? vswr.toFixed(2) : '∞'} · ${
        z === null
          ? '∞ Ω'
          : `${z.r.toFixed(1)}${z.x >= 0 ? '+' : '−'}j${Math.abs(z.x).toFixed(1)} Ω`
      }`;
      out.push({ id: t.id, color: t.color, re: sample.re, im: sample.im, label });
    }
    return out;
  }, [props.kind, hoverHz, smithTraces]);

  const rectMarkers = useMemo(() => {
    if (props.kind === 'smith' || hoverHz === null || rectXRange === null || rectYRange === null) {
      return [];
    }
    const { first, last } = rectXRange;
    const { min, max } = rectYRange;
    const denom = max === min ? 1 : max - min;
    const out: {
      id: string;
      color: string;
      xPct: number;
      yPct: number;
      offScale: 'above' | 'below' | null;
      label: string;
    }[] = [];
    for (const t of rectTraces) {
      const idx = nearestSampleIndex(t.series.freqs, hoverHz);
      if (idx < 0) continue;
      const freq = t.series.freqs[idx] ?? 0;
      const value = t.series.values[idx] ?? 0;
      const xPct = (freq - first) / (last - first);
      const rawY = max === min ? 0.5 : (max - value) / denom;
      let yPct = rawY;
      let offScale: 'above' | 'below' | null = null;
      if (rawY < 0) {
        yPct = 0;
        offScale = 'above';
      } else if (rawY > 1) {
        yPct = 1;
        offScale = 'below';
      }
      const tag = offScale === 'above' ? ' ↑' : offScale === 'below' ? ' ↓' : '';
      const label = `${formatHz(freq)} · ${formatValue(value, t.series.unit)}${tag}`;
      out.push({ id: t.id, color: t.color, xPct, yPct, offScale, label });
    }
    return out;
  }, [props.kind, hoverHz, rectTraces, rectXRange, rectYRange]);

  // Shared cursor X% — anchored to the primary trace's axis.
  const cursorXPct = useMemo(() => {
    if (hoverHz === null || rectXRange === null) return null;
    const pct = (hoverHz - rectXRange.first) / (rectXRange.last - rectXRange.first);
    return Math.max(0, Math.min(1, pct));
  }, [hoverHz, rectXRange]);

  return (
    <div className="absolute inset-0 z-[1]" onPointerMove={onMove} onPointerLeave={onLeave}>
      {props.kind === 'smith' ? (
        smithMarkers.map((m) => (
          <SmithMarker
            key={m.id}
            re={m.re}
            im={m.im}
            color={m.color}
            label={m.id === labelTraceId ? m.label : null}
          />
        ))
      ) : cursorXPct !== null ? (
        <>
          <div
            className="pointer-events-none absolute top-0 h-full w-px bg-[var(--color-accent)] opacity-80"
            style={{ left: `${cursorXPct * 100}%` }}
          />
          {rectMarkers.map((m) => (
            <DiamondMarker
              key={m.id}
              xPct={m.xPct}
              yPct={m.yPct}
              color={m.color}
              label={m.id === labelTraceId ? m.label : null}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

/**
 * Hollow diamond on the Smith disk, positioned via container queries so
 * `re`/`im` map onto the *same* unit disk the regl renderer draws. Using
 * `min(50cqw, 50cqh)` matches `Math.min(width, height) / 2` in the
 * renderer, so the marker sits exactly on the trace for every aspect
 * ratio and DPR.
 *
 * The wrapper is explicitly sized 12×12 (the diamond's bounding box) so
 * the `translate(-50%, -50%)` in the wrapper's transform centers the
 * diamond — not some larger label-inclusive bounding box — on the target
 * Γ coordinate. Without the explicit size, flowing the label into the
 * column shifted the diamond *below* the trace by half the label height.
 */
function SmithMarker({
  re,
  im,
  color,
  label,
}: {
  readonly re: number;
  readonly im: number;
  readonly color: string;
  readonly label: string | null;
}): React.ReactElement {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ containerType: 'size' } as React.CSSProperties}
    >
      <div
        className="absolute h-3 w-3"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${re} * min(50cqw, 50cqh)), calc(-50% + ${-im} * min(50cqw, 50cqh)))`,
        }}
      >
        <div
          className="h-3 w-3 border-2 bg-transparent"
          style={{ transform: 'rotate(45deg)', borderColor: color }}
        />
        {label !== null ? (
          <span
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px]"
            style={{ color, bottom: 'calc(100% + 6px)' }}
          >
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Hollow diamond marker for rect charts with a label that auto-anchors
 * to stay inside the chart bounds when the marker is near an edge.
 */
function DiamondMarker({
  xPct,
  yPct,
  color,
  label,
}: {
  readonly xPct: number;
  readonly yPct: number;
  readonly color: string;
  readonly label: string | null;
}): React.ReactElement {
  const vAbove = yPct > 0.15;
  const hAlign: 'start' | 'center' | 'end' = xPct < 0.2 ? 'start' : xPct > 0.8 ? 'end' : 'center';
  const labelStyle: React.CSSProperties = {
    color,
    ...(vAbove ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
    ...(hAlign === 'center'
      ? { left: '50%', transform: 'translateX(-50%)' }
      : hAlign === 'start'
        ? { left: 0 }
        : { right: 0 }),
  };
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${xPct * 100}%`,
        top: `${yPct * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {label !== null ? (
        <span className="absolute whitespace-nowrap font-mono text-[10px]" style={labelStyle}>
          {label}
        </span>
      ) : null}
      <div
        className="h-3 w-3 border-2 bg-transparent"
        style={{ transform: 'rotate(45deg)', borderColor: color }}
      />
    </div>
  );
}
