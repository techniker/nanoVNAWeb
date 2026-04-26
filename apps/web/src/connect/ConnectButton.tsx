import { Plug, Unplug } from 'lucide-react';
import type React from 'react';
import { useConnect } from './useConnect.js';

export interface ConnectButtonProps {
  onError(msg: string): void;
}

export function ConnectButton(props: ConnectButtonProps): React.ReactElement {
  const { status, connect, disconnect } = useConnect();
  const connected = status.state === 'connected';
  const label = connected
    ? 'Disconnect'
    : status.state === 'connecting'
      ? 'Connecting…'
      : 'Connect';
  const Icon = connected ? Unplug : Plug;

  async function handle(): Promise<void> {
    try {
      if (connected) {
        await disconnect();
      } else {
        await connect();
      }
    } catch (e) {
      props.onError(e instanceof Error ? e.message : 'Connect failed');
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={status.state === 'connecting'}
      className="flex h-8 items-center gap-2 rounded border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-panel-2)] disabled:opacity-60"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
