import type { SParam } from '@nanovnaweb/render';
import type { Frame } from '@nanovnaweb/shared';
import { useChartStore, useStores } from '@nanovnaweb/state';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatHz, formatImpedance, gammaSeries, gammaToImpedance } from './sampleValue.js';

export interface SmithOverlayProps {
  readonly sParam: SParam;
  readonly traceColor: string;
  readonly frame: Frame | null;
  readonly slotId: string;
}

const R_LABELS: readonly number[] = [0.2, 0.5, 1, 2, 5];
const X_LABELS: readonly number[] = [0.2, 0.5, 1, 2, 5];
const Z0 = 50;

interface Geometry {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

function ohms(r: number): string {
  const v = r * Z0;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}kΩ`;
  return `${v}Ω`;
}

/**
 * Smith-chart overlay: title pill, R-axis labels along the real axis, and
 * ±jX labels on the outer disk where each constant-reactance arc meets the
 * unit circle. Uses a ResizeObserver to track the canvas geometry so
 * labels stay aligned at any aspect ratio and DPR.
 */
export function SmithOverlay(props: SmithOverlayProps): React.ReactElement {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [geom, setGeom] = useState<Geometry | null>(null);
  const stores = useStores();
  const hoverHz = useChartStore(stores.chart.store, (s) => s.hoverFrequencyHz);
  const series = useMemo(() => gammaSeries(props.frame, props.sParam), [props.frame, props.sParam]);

  // Cursor readout — find the sample at the shared hover frequency.
  const hoverLabel = useMemo(() => {
    if (hoverHz === null || series === null || series.length === 0) return null;
    let sample = series[0] ?? null;
    for (const s of series) {
      if (Math.abs(s.freq - hoverHz) < Math.abs((sample?.freq ?? 0) - hoverHz)) {
        sample = s;
      }
    }
    if (sample === null) return null;
    const mag = Math.hypot(sample.re, sample.im);
    const vswr = mag < 0.999_999 ? (1 + mag) / (1 - mag) : Number.POSITIVE_INFINITY;
    const z = gammaToImpedance(sample.re, sample.im);
    return `${formatHz(sample.freq)} · Z=${formatImpedance(z)} · VSWR=${
      Number.isFinite(vswr) ? vswr.toFixed(3) : '∞'
    }`;
  }, [hoverHz, series]);

  useEffect(() => {
    const el = rootRef.current;
    if (el === null) return;
    const measure = (): void => {
      const rect = el.getBoundingClientRect();
      const r = Math.min(rect.width, rect.height) / 2;
      setGeom({ cx: rect.width / 2, cy: rect.height / 2, r });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const trNumber = Number.parseInt(props.slotId.replace('slot-', ''), 10) + 1;

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 font-mono text-[10px]">
      {/* Info block: no background, top-left but inset so it doesn't sit on
         the outer disk's 0 Ω label. */}
      <div
        className="pointer-events-none absolute left-2 top-1 z-40 flex flex-col gap-0.5"
        style={{ color: props.traceColor }}
      >
        <span className="font-semibold">
          TR{trNumber}: {props.sParam.toUpperCase()}
        </span>
        <span className="text-[var(--color-label)]">Smith Chart</span>
        <span className="text-[var(--color-label)]">Smooth: 8× (CR)</span>
        <span className="text-[var(--color-label)]">CAL: uncal</span>
        <span className="text-[var(--color-label)]">Z₀ {Z0} Ω</span>
      </div>

      {hoverLabel !== null ? (
        <div className="pointer-events-none absolute right-2 top-1 z-40">
          <span className="font-semibold" style={{ color: props.traceColor }}>
            {hoverLabel}
          </span>
        </div>
      ) : null}

      {geom === null ? null : <Labels geom={geom} />}
    </div>
  );
}

function Labels({ geom }: { geom: Geometry }): React.ReactElement {
  const spans: React.ReactElement[] = [];

  // Real-axis: R = 0 (short) at Γ = -1, R = 1 (matched) at Γ = 0,
  // R = ∞ (open) at Γ = +1. Label position x = cx + Γ_x · r.
  spans.push(<Label key="r-0" x={geom.cx - geom.r} y={geom.cy + 10} text="0" align="start" />);
  for (const r of R_LABELS) {
    const gx = (r - 1) / (r + 1);
    spans.push(
      <Label
        key={`r-${r}`}
        x={geom.cx + gx * geom.r}
        y={geom.cy + 10}
        text={`${r}·${ohms(r)}`}
        align="middle"
      />,
    );
  }
  spans.push(<Label key="r-inf" x={geom.cx + geom.r} y={geom.cy + 10} text="∞" align="end" />);

  // Reactance arc endpoints on the unit circle. Constant-X arc for normalized
  // reactance X touches the outer disk at angle θ = 2·atan(1/X) above the
  // real axis (and −θ below). Γ on the unit circle: (cosθ, sinθ).
  for (const x of X_LABELS) {
    const theta = 2 * Math.atan(1 / x);
    const upperX = geom.cx + Math.cos(theta) * (geom.r + 14);
    const upperY = geom.cy - Math.sin(theta) * (geom.r + 14);
    const lowerX = geom.cx + Math.cos(-theta) * (geom.r + 14);
    const lowerY = geom.cy - Math.sin(-theta) * (geom.r + 14);
    spans.push(<Label key={`x-up-${x}`} x={upperX} y={upperY} text={`+j${x}`} align="middle" />);
    spans.push(<Label key={`x-lo-${x}`} x={lowerX} y={lowerY} text={`−j${x}`} align="middle" />);
  }

  // Top / bottom of unit circle = ±j1 already in X_LABELS as +j1 / −j1
  // — but they need special placement since theta=90°:
  // Overlap is fine since we dedupe by key above.

  return <>{spans}</>;
}

function Label({
  x,
  y,
  text,
  align,
}: {
  x: number;
  y: number;
  text: string;
  align: 'start' | 'middle' | 'end';
}): React.ReactElement {
  const tx = align === 'middle' ? '-50%' : align === 'end' ? '-100%' : '0';
  return (
    <span
      className="absolute font-mono text-[10px] text-[var(--color-label)]"
      style={{ left: `${x}px`, top: `${y}px`, transform: `translate(${tx}, -50%)` }}
    >
      {text}
    </span>
  );
}
