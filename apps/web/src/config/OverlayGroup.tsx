import { useChartStore, useStores, useTraceStore } from '@nanovnaweb/state';
import { X } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';

export function OverlayGroup(): React.ReactElement {
  const stores = useStores();
  const selectedId = useChartStore(stores.chart.store, (s) => s.selectedSlotId);
  const slot = useChartStore(stores.chart.store, (s) =>
    selectedId !== null ? s.slots[selectedId] : undefined,
  );
  const recorded = useTraceStore(stores.trace.store, (s) => s.recorded);
  const imported = useTraceStore(stores.trace.store, (s) => s.imported);
  const allTraces = useMemo(() => [...recorded, ...imported], [recorded, imported]);

  if (slot === undefined) {
    return <p className="text-xs text-[var(--color-label)]">Select a chart slot first.</p>;
  }

  const active = allTraces.filter((t) => slot.overlayIds.includes(t.id));

  if (active.length === 0) {
    return (
      <p className="text-xs text-[var(--color-label)]">
        Enable a recording in the left panel to overlay it here.
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-xs">
      {active.map((t) => (
        <li
          key={t.id}
          className="flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
        >
          <span className="flex-1 truncate">{t.name}</span>
          <button
            type="button"
            aria-label={`Remove overlay ${t.name}`}
            onClick={() => stores.chart.actions.toggleOverlay(slot.id, t.id)}
            className="rounded p-0.5 hover:bg-[var(--color-panel)]"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
