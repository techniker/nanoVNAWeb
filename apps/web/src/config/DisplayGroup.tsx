import type { ChartKind, SParam } from '@nanovnaweb/render';
import { type LayoutPreset, useChartStore, useConnectionStore, useStores } from '@nanovnaweb/state';
import type React from 'react';
import { useMemo } from 'react';
import { applyOverride, useDeviceOverride } from '../connect/deviceOverride.js';

const KIND_OPTIONS: readonly { value: ChartKind; label: string }[] = [
  { value: 'rect', label: 'Log magnitude (dB)' },
  { value: 'smith', label: 'Smith chart' },
  { value: 'vswr', label: 'VSWR' },
  { value: 'phase', label: 'Phase' },
  { value: 'groupDelay', label: 'Group delay' },
];

const LAYOUT_OPTIONS: readonly { value: LayoutPreset; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'horizontal-pair', label: 'Side by side (2)' },
  { value: 'vertical-pair', label: 'Stacked (2)' },
  { value: 'quad', label: 'Quad (2×2)' },
];

const TRACE_COLORS: readonly string[] = [
  'var(--color-trace-1)',
  'var(--color-trace-2)',
  'var(--color-trace-3)',
  'var(--color-trace-4)',
  'var(--color-trace-5)',
  'var(--color-trace-6)',
  'var(--color-trace-7)',
  'var(--color-trace-8)',
];

export function DisplayGroup(): React.ReactElement {
  const stores = useStores();
  const preset = useChartStore(stores.chart.store, (s) => s.preset);
  const selectedId = useChartStore(stores.chart.store, (s) => s.selectedSlotId);
  const slot = useChartStore(stores.chart.store, (s) =>
    selectedId !== null ? s.slots[selectedId] : undefined,
  );
  // The Channel dropdown disables S21 when the connected device — or
  // user override — says the hardware can't measure transmission.
  // Without this, picking S21 on, say, a base V2 with one port left
  // every chart blank with no clue why.
  const status = useConnectionStore(stores.connection.store, (s) => s.status);
  const { override } = useDeviceOverride();
  const detectedCaps = status.state === 'connected' ? status.info.capabilities : null;
  const caps = useMemo(
    () => (detectedCaps !== null ? applyOverride(detectedCaps, override) : null),
    [detectedCaps, override],
  );
  // Default to "supported" when no device is connected so the option is
  // selectable in the offline / pre-connect UI; the dropdown only
  // disables S21 once we have evidence the hardware can't do it.
  const supportsS21 = caps?.supportsS21 !== false;

  return (
    <div className="space-y-2 text-xs">
      <label className="grid grid-cols-[auto_1fr] items-center gap-2">
        <span className="text-[var(--color-label)]">Layout</span>
        <select
          value={preset}
          onChange={(e) => stores.chart.actions.setPreset(e.target.value as LayoutPreset)}
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
        >
          {LAYOUT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {slot !== undefined ? (
        <>
          <div className="mt-2 border-t border-[var(--color-border)] pt-2 text-[10px] text-[var(--color-label)]">
            Selected slot: {slot.id.replace('slot-', '#')}
          </div>

          <label className="grid grid-cols-[auto_1fr] items-center gap-2">
            <span className="text-[var(--color-label)]">Format</span>
            <select
              value={slot.kind}
              onChange={(e) =>
                stores.chart.actions.setSlot(slot.id, { kind: e.target.value as ChartKind })
              }
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
            >
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid grid-cols-[auto_1fr] items-center gap-2">
            <span className="text-[var(--color-label)]">Channel</span>
            <select
              value={slot.primarySParam}
              onChange={(e) =>
                stores.chart.actions.setSlot(slot.id, {
                  primarySParam: e.target.value as SParam,
                })
              }
              className="w-full rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
            >
              <option value="s11">S11 (reflection)</option>
              <option value="s21" disabled={!supportsS21}>
                S21 (transmission){!supportsS21 ? ' — not supported by device' : ''}
              </option>
            </select>
          </label>

          <div>
            <span className="text-[var(--color-label)]">Trace color</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {TRACE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Set color ${color}`}
                  aria-pressed={slot.primaryColor === color}
                  onClick={() => stores.chart.actions.setSlot(slot.id, { primaryColor: color })}
                  style={{ backgroundColor: color }}
                  className={`h-5 w-5 rounded border ${
                    slot.primaryColor === color
                      ? 'border-[var(--color-fg)] ring-1 ring-[var(--color-fg)]'
                      : 'border-[var(--color-border)]'
                  }`}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-[var(--color-label)]">Click a chart slot to edit its display.</p>
      )}
    </div>
  );
}
