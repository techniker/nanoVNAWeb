import { type ChartKind, type SParam, resolveYRange } from '@nanovnaweb/render';
import type { Frame } from '@nanovnaweb/shared';
import { useChartStore, useStores } from '@nanovnaweb/state';
import type React from 'react';
import { useMemo } from 'react';
import { deriveSeries, formatHz, formatValue } from './sampleValue.js';
import { nearestSampleIndex } from './useNearestSample.js';

export interface AxisOverlayProps {
  readonly frame: Frame | null;
  readonly kind: ChartKind;
  readonly sParam: SParam;
  readonly traceColor: string;
  readonly slotId: string;
}

const Y_DIVISIONS = 10;
const X_MAJOR_TICKS = 5;

export function AxisOverlay(props: AxisOverlayProps): React.ReactElement | null {
  const stores = useStores();
  const hoverHz = useChartStore(stores.chart.store, (s) => s.hoverFrequencyHz);
  const series = useMemo(
    () => deriveSeries(props.frame, props.kind, props.sParam),
    [props.frame, props.kind, props.sParam],
  );
  // Single source of truth with the regl renderer. `resolveYRange` applies
  // the fixed scale each chart kind uses (VSWR [1, 10], phase [-180°, 180°])
  // so tick labels, Ref, and marker row match the trace row.
  const range = useMemo(
    () => (series === null ? null : resolveYRange(props.kind, series.values)),
    [series, props.kind],
  );

  if (props.kind === 'smith') return null;

  if (series === null || range === null || series.freqs.length === 0) {
    return (
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[4.5rem] top-1 text-xs text-[var(--color-label)]">
          No data
        </div>
      </div>
    );
  }

  const firstHz = series.freqs[0] ?? 0;
  const lastHz = series.freqs[series.freqs.length - 1] ?? 0;
  const { min, max } = range;
  const yStep = (max - min) / Y_DIVISIONS;
  const divPerDivLabel = formatValue(yStep, series.unit);

  // Cursor readout — look up the sample at the shared hover frequency.
  let hoverLabel: string | null = null;
  if (hoverHz !== null) {
    const idx = nearestSampleIndex(series.freqs, hoverHz);
    if (idx >= 0) {
      const freq = series.freqs[idx] ?? 0;
      const value = series.values[idx] ?? 0;
      hoverLabel = `${formatHz(freq)} · ${formatValue(value, series.unit)}`;
    }
  }

  const yTicks: { top: number; label: string }[] = [];
  for (let i = 0; i <= Y_DIVISIONS; i++) {
    const v = max - i * yStep;
    yTicks.push({ top: (i / Y_DIVISIONS) * 100, label: formatValue(v, series.unit) });
  }

  const xTicks: { left: number; label: string }[] = [];
  for (let i = 0; i <= X_MAJOR_TICKS; i++) {
    const t = i / X_MAJOR_TICKS;
    const hz = firstHz + (lastHz - firstHz) * t;
    xTicks.push({ left: t * 100, label: formatHz(hz) });
  }

  const trNumber = Number.parseInt(props.slotId.replace('slot-', ''), 10) + 1;

  return (
    <div className="pointer-events-none absolute inset-0 font-mono text-[10px] text-[var(--color-label)]">
      {/* Anritsu-style info block — offset past the Y-tick column so it
         never sits on top of the Ref/scale labels. No background box:
         text floats directly on the grid. */}
      <div
        className="pointer-events-none absolute left-[4.5rem] top-1 z-40 flex flex-col gap-0.5"
        style={{ color: props.traceColor }}
      >
        <span className="font-semibold">
          TR{trNumber}: {props.sParam.toUpperCase()}
        </span>
        <span className="text-[var(--color-label)]">
          {series.title.replace(`${props.sParam.toUpperCase()} `, '')}
        </span>
        <span className="text-[var(--color-label)]">Smooth: 8× (CR)</span>
        <span className="text-[var(--color-label)]">CAL: uncal</span>
        <span className="text-[var(--color-label)]">{divPerDivLabel}/div</span>
        <span className="text-[var(--color-label)]">Ref {formatValue(max, series.unit)}</span>
        <span className="text-[var(--color-label)]">Z₀ 50 Ω</span>
      </div>

      {/* Live cursor readout (trace-color, top-right). No box. */}
      {hoverLabel !== null ? (
        <div className="pointer-events-none absolute right-2 top-1 z-40">
          <span className="font-semibold" style={{ color: props.traceColor }}>
            {hoverLabel}
          </span>
        </div>
      ) : null}

      {/* Y tick labels — far left edge, no background. Values at the top
         and bottom are anchored to the edge rather than centered so they
         don't spill outside the section box. */}
      {yTicks.map((t, i) => {
        const anchor =
          i === 0 ? 'top-0.5' : i === yTicks.length - 1 ? 'bottom-0.5' : '-translate-y-1/2';
        const style: React.CSSProperties =
          i === 0 || i === yTicks.length - 1 ? {} : { top: `${t.top}%` };
        return (
          <span key={`y-${t.top}`} className={`absolute left-1 ${anchor}`} style={style}>
            {t.label}
          </span>
        );
      })}

      {/* X tick labels — bottom edge, no background. First/last anchored to
         the edges, others centered on the gridline. */}
      {xTicks.map((t, i) => {
        const align =
          i === 0
            ? 'translate-x-0'
            : i === xTicks.length - 1
              ? '-translate-x-full'
              : '-translate-x-1/2';
        return (
          <span
            key={`x-${t.left}`}
            className={`absolute bottom-0.5 ${align}`}
            style={{ left: `${t.left}%` }}
          >
            {t.label}
          </span>
        );
      })}
    </div>
  );
}
