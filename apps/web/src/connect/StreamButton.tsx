import { useConnectionStore, useStores, useSweepStore } from '@nanovnaweb/state';
import { Pause, Play } from 'lucide-react';
import type React from 'react';

export interface StreamButtonProps {
  onError(msg: string): void;
}

export function StreamButton(props: StreamButtonProps): React.ReactElement {
  const stores = useStores();
  const status = useConnectionStore(stores.connection.store, (s) => s.status);
  const isStreaming = useSweepStore(stores.sweep.store, (s) => s.isStreaming);
  const params = useSweepStore(stores.sweep.store, (s) => s.params);
  const connected = status.state === 'connected';
  const ready = connected && params !== null;
  const Icon = isStreaming ? Pause : Play;
  const label = isStreaming ? 'Pause' : 'Start';

  async function toggle(): Promise<void> {
    const r = isStreaming
      ? await stores.sweep.actions.stopStream()
      : await stores.sweep.actions.startStream();
    if (r.kind === 'err') props.onError(r.error.message);
  }

  return (
    <button
      type="button"
      aria-label={isStreaming ? 'Pause streaming' : 'Start streaming'}
      onClick={toggle}
      disabled={!ready}
      className="flex h-8 items-center gap-2 rounded border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-panel-2)] disabled:opacity-60"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
