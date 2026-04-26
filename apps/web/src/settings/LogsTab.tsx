import type { LogEntry } from '@nanovnaweb/shared';
import { useDebugStore, useStores } from '@nanovnaweb/state';
import { type ChangeEvent, type ReactElement, useState } from 'react';

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type Level = (typeof LEVELS)[number];

function levelRank(level: Level): number {
  return LEVELS.indexOf(level);
}

export function LogsTab(): ReactElement {
  const stores = useStores();
  const entries = useDebugStore(stores.debug.store, (s) => s.recent);
  const [minLevel, setMinLevel] = useState<Level>('info');

  const filtered: readonly LogEntry[] = entries.filter(
    (e) => levelRank((e.level as Level) ?? 'info') >= levelRank(minLevel),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] p-2 text-xs">
        <label>
          Min level:
          <select
            value={minLevel}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setMinLevel(e.target.value as Level)}
            className="ml-1 rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-1 py-0.5"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="flex-1 overflow-y-auto font-mono text-[11px]">
        {filtered.map((e, i) => (
          <li
            key={`${e.timestamp}-${i}`}
            className="border-b border-[var(--color-border)] px-2 py-1"
          >
            <span className="text-[var(--color-label)]">
              {new Date(e.timestamp).toISOString().slice(11, 23)}
            </span>{' '}
            <span>[{e.level}]</span> {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
