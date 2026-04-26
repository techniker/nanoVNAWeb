import { useConnectionStore, useLiveStore, useStores, useSweepStore } from '@nanovnaweb/state';
import type React from 'react';

function formatHz(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`;
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`;
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kHz`;
  return `${hz} Hz`;
}

export function StatusStrip(): React.ReactElement {
  const stores = useStores();
  const status = useConnectionStore(stores.connection.store, (s) => s.status);
  const params = useSweepStore(stores.sweep.store, (s) => s.params);
  const fps = useLiveStore(stores.live.store, (s) => s.sweepRateHz);

  const deviceLabel = status.state === 'connected' ? status.info.displayName : status.state;
  const sweepLabel =
    params !== null
      ? `${formatHz(params.start)} → ${formatHz(params.stop)}, ${params.points} pts`
      : 'no sweep';

  return (
    <footer
      className="flex h-7 items-center gap-4 border-t border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-xs text-[var(--color-label)]"
      data-testid="status-strip"
    >
      <span>{deviceLabel}</span>
      <span>{sweepLabel}</span>
      <span>{fps.toFixed(1)} fps</span>
    </footer>
  );
}
