import { useConnectionStore, useStores } from '@nanovnaweb/state';
import type React from 'react';
import { useState } from 'react';
import { useDeviceOverride } from '../connect/deviceOverride.js';

function formatMhz(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`;
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`;
  return `${(hz / 1e3).toFixed(2)} kHz`;
}

export function DeviceTab(): React.ReactElement {
  const stores = useStores();
  const status = useConnectionStore(stores.connection.store, (s) => s.status);
  const { override, set, clear } = useDeviceOverride();

  const connected = status.state === 'connected' ? status.info : null;

  const [minMhz, setMinMhz] = useState<string>(
    override.minFrequencyHz !== null ? String(override.minFrequencyHz / 1e6) : '',
  );
  const [maxMhz, setMaxMhz] = useState<string>(
    override.maxFrequencyHz !== null ? String(override.maxFrequencyHz / 1e6) : '',
  );
  const [maxPts, setMaxPts] = useState<string>(
    override.maxPoints !== null ? String(override.maxPoints) : '',
  );

  function apply(): void {
    const parseMhz = (s: string): number | null => {
      const v = Number.parseFloat(s);
      return Number.isFinite(v) && v > 0 ? v * 1e6 : null;
    };
    const parseCount = (s: string): number | null => {
      const v = Number.parseInt(s, 10);
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    set({
      minFrequencyHz: parseMhz(minMhz),
      maxFrequencyHz: parseMhz(maxMhz),
      maxPoints: parseCount(maxPts),
    });
  }

  function reset(): void {
    clear();
    setMinMhz('');
    setMaxMhz('');
    setMaxPts('');
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 text-sm">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-label)]">
          Detected
        </h3>
        {connected === null ? (
          <p className="text-[var(--color-label)]">Not connected.</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-[var(--color-label)]">Board</dt>
            <dd>{connected.displayName}</dd>
            <dt className="text-[var(--color-label)]">Driver</dt>
            <dd>{connected.driverKind.toUpperCase()}</dd>
            {connected.firmware !== undefined ? (
              <>
                <dt className="text-[var(--color-label)]">Firmware</dt>
                <dd>{connected.firmware}</dd>
              </>
            ) : null}
            {connected.hardware !== undefined ? (
              <>
                <dt className="text-[var(--color-label)]">Hardware</dt>
                <dd>{connected.hardware}</dd>
              </>
            ) : null}
            <dt className="text-[var(--color-label)]">Min freq</dt>
            <dd>{formatMhz(Number(connected.capabilities.minFrequencyHz))}</dd>
            <dt className="text-[var(--color-label)]">Max freq</dt>
            <dd>{formatMhz(Number(connected.capabilities.maxFrequencyHz))}</dd>
            <dt className="text-[var(--color-label)]">Max points</dt>
            <dd>{connected.capabilities.maxPoints}</dd>
          </dl>
        )}
      </section>

      {connected?.rawInfo !== undefined && connected.rawInfo.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-label)]">
            Raw device info
          </h3>
          <pre className="max-h-40 overflow-auto rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] p-2 font-mono text-xs">
            {connected.rawInfo}
          </pre>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-label)]">
          Override capabilities
        </h3>
        <p className="mb-3 text-xs text-[var(--color-label)]">
          Some firmware misreports its frequency range. Override here if the detected range is too
          low for your hardware (e.g. a NanoVNA-F V2 that reports as a classic NanoVNA). Leave blank
          to use the detected values.
        </p>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
          <label className="col-span-2 grid grid-cols-[auto_1fr] items-center gap-x-3">
            <span className="text-[var(--color-label)]">Min freq (MHz)</span>
            <input
              type="number"
              value={minMhz}
              placeholder="auto"
              onChange={(e) => setMinMhz(e.target.value)}
              className="rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
            />
          </label>
          <label className="col-span-2 grid grid-cols-[auto_1fr] items-center gap-x-3">
            <span className="text-[var(--color-label)]">Max freq (MHz)</span>
            <input
              type="number"
              value={maxMhz}
              placeholder="auto"
              onChange={(e) => setMaxMhz(e.target.value)}
              className="rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
            />
          </label>
          <label className="col-span-2 grid grid-cols-[auto_1fr] items-center gap-x-3">
            <span className="text-[var(--color-label)]">Max points</span>
            <input
              type="number"
              value={maxPts}
              placeholder="auto"
              onChange={(e) => setMaxPts(e.target.value)}
              className="rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
            />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={apply}
            className="rounded bg-[var(--color-accent)] px-3 py-1 text-xs text-[var(--color-bg)]"
          >
            Apply override
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded border border-[var(--color-border)] px-3 py-1 text-xs"
          >
            Reset to detected
          </button>
        </div>
      </section>
    </div>
  );
}
