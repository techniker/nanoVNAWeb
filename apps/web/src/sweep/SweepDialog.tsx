import type { Hz } from '@nanovnaweb/shared';
import { useConnectionStore, useStores, useSweepStore } from '@nanovnaweb/state';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { applyOverride, useDeviceOverride } from '../connect/deviceOverride.js';
import { validateSweep } from './validation.js';

export interface SweepDialogProps {
  readonly open: boolean;
  onOpenChange(open: boolean): void;
}

function formatMhz(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`;
  return `${(hz / 1e6).toFixed(3)} MHz`;
}

export function SweepDialog(props: SweepDialogProps): React.ReactElement {
  const stores = useStores();
  const status = useConnectionStore(stores.connection.store, (s) => s.status);
  const current = useSweepStore(stores.sweep.store, (s) => s.params);
  const { override } = useDeviceOverride();
  const detectedCaps = status.state === 'connected' ? status.info.capabilities : null;
  const caps = useMemo(
    () => (detectedCaps !== null ? applyOverride(detectedCaps, override) : null),
    [detectedCaps, override],
  );

  const defaults = useMemo(() => {
    if (current !== null) {
      return {
        startMhz: Number(current.start) / 1e6,
        stopMhz: Number(current.stop) / 1e6,
        points: current.points,
      };
    }
    if (caps !== null) {
      const minMhz = Number(caps.minFrequencyHz) / 1e6;
      const maxMhz = Number(caps.maxFrequencyHz) / 1e6;
      return {
        startMhz: Math.max(minMhz, 1),
        stopMhz: Math.min(maxMhz, 1500),
        points: Math.min(401, caps.maxPoints),
      };
    }
    return { startMhz: 1, stopMhz: 1000, points: 401 };
  }, [current, caps]);

  const [startMhz, setStartMhz] = useState(defaults.startMhz);
  const [stopMhz, setStopMhz] = useState(defaults.stopMhz);
  const [points, setPoints] = useState(defaults.points);
  const [error, setError] = useState<string | null>(null);

  // Re-seed form when the device connects or current sweep changes.
  useEffect(() => {
    if (!props.open) return;
    setStartMhz(defaults.startMhz);
    setStopMhz(defaults.stopMhz);
    setPoints(defaults.points);
    setError(null);
  }, [props.open, defaults]);

  const pointsOptions = useMemo(() => {
    const base = [51, 101, 201, 401, 801, 1024, 1601];
    const maxPts = caps?.maxPoints ?? base[base.length - 1] ?? 1601;
    const filtered = base.filter((n) => n <= maxPts);
    if (filtered.length === 0 && maxPts > 0) filtered.push(maxPts);
    return filtered;
  }, [caps]);

  const capsHint =
    caps !== null
      ? `Device range ${formatMhz(Number(caps.minFrequencyHz))} – ${formatMhz(
          Number(caps.maxFrequencyHz),
        )}, up to ${caps.maxPoints} points`
      : 'Connect a device to see its supported range.';

  async function handleApply(): Promise<void> {
    setError(null);
    if (caps === null) {
      setError('Not connected');
      return;
    }
    const v = validateSweep(
      {
        start: (startMhz * 1e6) as Hz,
        stop: (stopMhz * 1e6) as Hz,
        points,
      },
      caps,
    );
    if (v.kind === 'err') {
      setError(v.error.message);
      return;
    }
    const r = await stores.sweep.actions.setParams(v.value);
    if (r.kind === 'err') {
      setError(r.error.message);
      return;
    }
    props.onOpenChange(false);
  }

  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold">Sweep parameters</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded p-1 hover:bg-[var(--color-panel-2)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-xs text-[var(--color-label)]">
            {capsHint}
          </Dialog.Description>
          <div className="mt-4 space-y-3 text-sm">
            <label className="block">
              <span className="text-[var(--color-label)]">Start (MHz)</span>
              <input
                type="number"
                step="0.001"
                value={startMhz}
                onChange={(e) => setStartMhz(Number(e.target.value))}
                className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-[var(--color-label)]">Stop (MHz)</span>
              <input
                type="number"
                step="0.001"
                value={stopMhz}
                onChange={(e) => setStopMhz(Number(e.target.value))}
                className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-[var(--color-label)]">Points</span>
              <select
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
              >
                {pointsOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {error !== null ? (
              <p className="text-[var(--color-error)]" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded border border-[var(--color-border)] px-3 py-1 text-sm hover:bg-[var(--color-panel-2)]"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleApply}
              className="rounded bg-[var(--color-accent)] px-3 py-1 text-sm text-[var(--color-bg)] hover:opacity-90"
            >
              Apply
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
