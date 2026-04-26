import * as Tooltip from '@radix-ui/react-tooltip';
import type React from 'react';
import { useConnect } from './useConnect.js';

function colorFor(state: string): string {
  switch (state) {
    case 'connected':
      return 'bg-[var(--color-success)]';
    case 'connecting':
      return 'bg-[var(--color-warn)]';
    case 'lost':
      return 'bg-[var(--color-error)]';
    default:
      return 'bg-[var(--color-label)]';
  }
}

export function StatusBadge(): React.ReactElement {
  const { status } = useConnect();
  const label =
    status.state === 'connected'
      ? 'Connected'
      : status.state === 'connecting'
        ? 'Connecting'
        : status.state === 'lost'
          ? 'Lost'
          : 'Disconnected';

  const detail =
    status.state === 'connected'
      ? status.info.displayName
      : status.state === 'lost'
        ? status.reason
        : label;

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className="flex items-center gap-1.5 rounded border border-[var(--color-border)] px-2 py-1 text-xs"
            data-testid="status-badge"
          >
            <span className={`h-2 w-2 rounded-full ${colorFor(status.state)}`} aria-hidden="true" />
            {label}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1 text-xs"
            sideOffset={4}
          >
            {detail}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
