import type { TraceRecord } from '@nanovnaweb/shared';
import { useChartStore, useLiveStore, useStores, useTraceStore } from '@nanovnaweb/state';
import { Save, Upload } from 'lucide-react';
import type React from 'react';
import { useCallback, useMemo } from 'react';
import { RecordingRow } from './RecordingRow.js';
import { useExportTouchstone } from './useExportTouchstone.js';
import { useImportTouchstone } from './useImportTouchstone.js';

function newId(): string {
  return `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RecordingsPanel(): React.ReactElement {
  const stores = useStores();
  const recorded = useTraceStore(stores.trace.store, (s) => s.recorded);
  const imported = useTraceStore(stores.trace.store, (s) => s.imported);
  const recs = useMemo<readonly TraceRecord[]>(
    () => [...recorded, ...imported],
    [recorded, imported],
  );
  const liveFrame = useLiveStore(stores.live.store, (s) => s.latestFrame);
  const selected = useChartStore(stores.chart.store, (s) => s.selectedSlotId);
  const slots = useChartStore(stores.chart.store, (s) => s.slots);
  const overlayIds = useMemo<readonly string[]>(() => {
    if (selected === null) return [];
    return slots[selected]?.overlayIds ?? [];
  }, [selected, slots]);

  const { importFromFilePicker } = useImportTouchstone();
  const { exportTrace } = useExportTouchstone();

  const saveSnapshot = useCallback(async (): Promise<void> => {
    if (liveFrame === null) return;
    const rec: TraceRecord = {
      id: newId(),
      name: `Snapshot ${new Date().toLocaleTimeString()}`,
      createdAt: Date.now(),
      frame: liveFrame,
    };
    await stores.trace.actions.saveRecording(rec);
  }, [stores, liveFrame]);

  return (
    <aside className="flex w-64 flex-col border-[var(--color-border)] border-r bg-[var(--color-panel)]">
      <div className="flex items-center gap-1 border-[var(--color-border)] border-b px-2 py-2 font-semibold text-xs">
        Recordings
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => void saveSnapshot()}
          aria-label="Save snapshot"
          className="rounded p-1 hover:bg-[var(--color-panel-2)]"
        >
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => void importFromFilePicker()}
          aria-label="Import Touchstone"
          className="rounded p-1 hover:bg-[var(--color-panel-2)]"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {recs.map((t) => (
          <RecordingRow
            key={t.id}
            trace={t}
            overlayActive={overlayIds.includes(t.id)}
            onToggleOverlay={() => {
              if (selected !== null) {
                stores.chart.actions.toggleOverlay(selected, t.id);
              }
            }}
            onExport={() => void exportTrace(t.id, t.name)}
            onDelete={() => void stores.trace.actions.delete(t.id)}
          />
        ))}
      </ul>
    </aside>
  );
}
