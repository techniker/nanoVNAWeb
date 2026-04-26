import { useChartStore, useStores } from '@nanovnaweb/state';
import * as Switch from '@radix-ui/react-switch';
import type React from 'react';

export function MarkerGroup(): React.ReactElement {
  const stores = useStores();
  const selectedId = useChartStore(stores.chart.store, (s) => s.selectedSlotId);
  const slot = useChartStore(stores.chart.store, (s) =>
    selectedId !== null ? s.slots[selectedId] : undefined,
  );

  if (slot === undefined) {
    return (
      <p className="text-xs text-[var(--color-label)]">Select a chart slot to configure markers.</p>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-[var(--color-label)]">Hover crosshair</span>
        <Switch.Root
          checked={slot.crosshairEnabled}
          onCheckedChange={() => stores.chart.actions.toggleCrosshair(slot.id)}
          className="relative h-5 w-9 rounded-full bg-[var(--color-panel-2)] data-[state=checked]:bg-[var(--color-accent)]"
          aria-label="Toggle crosshair"
        >
          <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-[var(--color-fg)] transition-transform data-[state=checked]:translate-x-[1.125rem]" />
        </Switch.Root>
      </div>
      <p className="text-[10px] text-[var(--color-label)]">
        Pinned markers, search (min/max), and delta markers arrive in Plan #9. Hover the chart with
        the crosshair enabled to read values at the cursor.
      </p>
    </div>
  );
}
