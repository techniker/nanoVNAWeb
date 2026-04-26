import {
  type ChartInstance,
  type ChartRenderer,
  type ThemeTokens,
  type TraceBinding,
  createDefaultRegistry,
} from '@nanovnaweb/render';
import type { Frame } from '@nanovnaweb/shared';
import { useChartStore, useLiveStore, useStores, useTraceStore } from '@nanovnaweb/state';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { resolveCssColor } from '../theme/resolveColor.js';
import { readThemeFromRoot } from '../theme/tokens.js';
import { AxisOverlay } from './AxisOverlay.js';
import { ErrorBoundary } from './ErrorBoundary.js';
import { HoverCrosshair } from './HoverCrosshair.js';
import { SmithOverlay } from './SmithOverlay.js';

const registry = createDefaultRegistry();

export interface ChartSlotProps {
  readonly slotId: string;
}

function resolveTheme(tokens: ThemeTokens): ThemeTokens {
  return {
    ...tokens,
    bg: resolveCssColor(tokens.bg),
    fg: resolveCssColor(tokens.fg),
    gridLine: resolveCssColor(tokens.gridLine),
    gridMajor: resolveCssColor(tokens.gridMajor),
    axis: resolveCssColor(tokens.axis),
    label: resolveCssColor(tokens.label),
    tracePalette: Object.freeze(tokens.tracePalette.map((c) => resolveCssColor(c))),
  };
}

function InnerChartSlot(props: ChartSlotProps): React.ReactElement {
  const stores = useStores();
  const slot = useChartStore(stores.chart.store, (s) => s.slots[props.slotId]);
  const frame = useLiveStore(stores.live.store, (s) => s.latestFrame);
  const recorded = useTraceStore(stores.trace.store, (s) => s.recorded);
  const imported = useTraceStore(stores.trace.store, (s) => s.imported);
  const overlays = useMemo(() => {
    if (slot === undefined) return [];
    const ids = slot.overlayIds;
    return [...recorded, ...imported].filter((t) => ids.includes(t.id));
  }, [slot, recorded, imported]);

  const containerRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<ChartInstance | null>(null);
  const rendererKindRef = useRef<string | null>(null);
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 });

  const kind = slot?.kind;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null || kind === undefined) return;
    if (rendererKindRef.current !== kind) {
      instanceRef.current?.destroy();
      const renderer: ChartRenderer | undefined = registry.get(kind);
      if (renderer === undefined) return;
      instanceRef.current = renderer.mount(canvas);
      rendererKindRef.current = kind;
    }
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
      rendererKindRef.current = null;
    };
  }, [kind]);

  // Build the traces payload we pass into draw — memoized so the draw effect
  // only re-fires when something material changes.
  const tracesPayload = useMemo(() => {
    if (slot === undefined) return null;
    const traces: TraceBinding[] = [
      {
        id: `${slot.id}-primary`,
        sParam: slot.primarySParam,
        color: resolveCssColor(slot.primaryColor),
        lineWidth: 2,
        visible: true,
        source: 'live',
      },
      ...overlays.map((t, i) => ({
        id: `${slot.id}-ov-${t.id}`,
        sParam: slot.primarySParam,
        color: resolveCssColor(`var(--color-trace-${((i + 2) % 8) + 1})`),
        lineWidth: 1.5,
        visible: true,
        source: 'recorded' as const,
      })),
    ];
    const overlayFrames: Record<string, Frame> = {};
    for (const t of overlays) overlayFrames[`${slot.id}-ov-${t.id}`] = t.frame;
    return { traces, overlayFrames };
  }, [slot, overlays]);

  // Resolved traces for the hover overlay: each binding paired with its
  // actual Frame so the crosshair can snap to — and draw a marker on —
  // whichever trace the user is pointing at, not just the primary.
  const hoverTraces = useMemo(() => {
    if (tracesPayload === null || frame === null) return [];
    const out: { id: string; sParam: 's11' | 's21'; color: string; frame: Frame }[] = [];
    for (const t of tracesPayload.traces) {
      if (!t.visible) continue;
      const src = t.source === 'live' ? frame : tracesPayload.overlayFrames[t.id];
      if (src === undefined) continue;
      out.push({ id: t.id, sParam: t.sParam, color: t.color, frame: src });
    }
    return out;
  }, [tracesPayload, frame]);

  const draw = useCallback((): void => {
    const inst = instanceRef.current;
    if (inst === null || frame === null || tracesPayload === null) return;
    const { w, h, dpr } = sizeRef.current;
    if (w <= 0 || h <= 0) return;
    inst.resize(w, h, dpr);
    inst.draw(
      frame,
      tracesPayload.traces,
      { overlayFrames: tracesPayload.overlayFrames },
      resolveTheme(readThemeFromRoot()),
    );
  }, [frame, tracesPayload]);

  // Observe the slot container's size and keep the canvas backing store in
  // sync with its actual CSS dimensions. Redraw on every size change so the
  // chart fills the pane through window resize, panel collapse, preset swap,
  // and DPR changes.
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const apply = (w: number, h: number): void => {
      const dpr = window.devicePixelRatio || 1;
      if (w === sizeRef.current.w && h === sizeRef.current.h && dpr === sizeRef.current.dpr) {
        return;
      }
      sizeRef.current = { w, h, dpr };
      draw();
    };
    const initialRect = container.getBoundingClientRect();
    apply(initialRect.width, initialRect.height);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) return;
      const box = entry.contentRect;
      apply(box.width, box.height);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  // Fire a redraw when frame or trace-config changes (size is already correct
  // from the ResizeObserver effect). ResizeObserver handles all geometry.
  useEffect(() => {
    draw();
  }, [draw]);

  if (slot === undefined) {
    return <div>Slot {props.slotId} missing</div>;
  }

  return (
    <section
      ref={containerRef}
      style={{ gridArea: props.slotId }}
      className="relative h-full w-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-panel)]"
      data-testid={`chart-slot-${props.slotId}`}
      onClick={() => stores.chart.actions.selectSlot(props.slotId)}
      onKeyDown={() => {}}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {slot.kind === 'smith' ? (
        <SmithOverlay
          sParam={slot.primarySParam}
          traceColor={slot.primaryColor}
          frame={frame}
          slotId={slot.id}
        />
      ) : (
        <AxisOverlay
          frame={frame}
          kind={slot.kind}
          sParam={slot.primarySParam}
          traceColor={slot.primaryColor}
          slotId={slot.id}
        />
      )}
      {slot.crosshairEnabled ? <HoverCrosshair kind={slot.kind} traces={hoverTraces} /> : null}
    </section>
  );
}

export function ChartSlot(props: ChartSlotProps): React.ReactElement {
  return (
    <ErrorBoundary
      fallback={
        <div
          style={{ gridArea: props.slotId }}
          className="flex h-full w-full items-center justify-center border border-[var(--color-error)] text-[var(--color-error)]"
        >
          Renderer failed. Reload tab.
        </div>
      }
    >
      <InnerChartSlot {...props} />
    </ErrorBoundary>
  );
}
