import type { Hz, SweepParams } from '@nanovnaweb/shared';
import { useConnectionStore, useStores, useSweepStore } from '@nanovnaweb/state';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { applyOverride, useDeviceOverride } from '../connect/deviceOverride.js';
import { validateSweep } from '../sweep/validation.js';

function formatMhz(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`;
  return `${(hz / 1e6).toFixed(3)} MHz`;
}

export function StimulusGroup(): React.ReactElement {
  const stores = useStores();
  const status = useConnectionStore(stores.connection.store, (s) => s.status);
  const params = useSweepStore(stores.sweep.store, (s) => s.params);
  const lastParams = useSweepStore(stores.sweep.store, (s) => s.lastParams);
  const isStreaming = useSweepStore(stores.sweep.store, (s) => s.isStreaming);
  const { override } = useDeviceOverride();
  const detectedCaps = status.state === 'connected' ? status.info.capabilities : null;
  const caps = useMemo(
    () => (detectedCaps !== null ? applyOverride(detectedCaps, override) : null),
    [detectedCaps, override],
  );

  // Seed the form from the persisted `lastParams` so the user's previous
  // stimulus settings survive disconnect + reload. Falls back to 1–1500
  // MHz / 401 points for first-time users. `!= null` matches both null
  // and undefined — test mocks sometimes omit `lastParams`.
  const [startMhz, setStartMhz] = useState<string>(() =>
    lastParams != null ? String(Number(lastParams.start) / 1e6) : '1',
  );
  const [stopMhz, setStopMhz] = useState<string>(() =>
    lastParams != null ? String(Number(lastParams.stop) / 1e6) : '1500',
  );
  const [pointsStr, setPointsStr] = useState<string>(() =>
    lastParams != null ? String(lastParams.points) : '401',
  );
  const [error, setError] = useState<string | null>(null);
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'applied'>('idle');

  // Keep the form synced to whatever's currently authoritative:
  //   1. An applied sweep (`params`) — wins once the device has accepted it
  //   2. The persisted `lastParams` from a previous session — while
  //      disconnected or before the first apply
  //   3. Device caps default — only if nothing remembered
  useEffect(() => {
    if (params !== null) {
      setStartMhz(String(Number(params.start) / 1e6));
      setStopMhz(String(Number(params.stop) / 1e6));
      setPointsStr(String(params.points));
    } else if (lastParams != null) {
      setStartMhz(String(Number(lastParams.start) / 1e6));
      setStopMhz(String(Number(lastParams.stop) / 1e6));
      setPointsStr(String(lastParams.points));
    } else if (caps !== null) {
      const maxMhz = Number(caps.maxFrequencyHz) / 1e6;
      setStopMhz(String(Math.min(1500, maxMhz)));
    }
  }, [params, lastParams, caps]);

  const pointsOptions = useMemo(() => {
    const base = [51, 101, 201, 401, 801, 1024, 1601];
    const maxPts = caps?.maxPoints ?? base[base.length - 1] ?? 1601;
    const filtered = base.filter((n) => n <= maxPts);
    if (filtered.length === 0 && maxPts > 0) filtered.push(maxPts);
    return filtered;
  }, [caps]);

  const startN = Number.parseFloat(startMhz);
  const stopN = Number.parseFloat(stopMhz);
  const pointsN = Number.parseInt(pointsStr, 10);
  const centerMhz = Number.isFinite(startN) && Number.isFinite(stopN) ? (startN + stopN) / 2 : 0;
  const spanMhz = Number.isFinite(startN) && Number.isFinite(stopN) ? stopN - startN : 0;

  async function applyFromFields(start: number, stop: number, points: number): Promise<void> {
    setError(null);
    if (caps === null) {
      setError('Not connected');
      return;
    }
    const v = validateSweep({ start: (start * 1e6) as Hz, stop: (stop * 1e6) as Hz, points }, caps);
    if (v.kind === 'err') {
      setError(v.error.message);
      return;
    }
    setApplyState('applying');
    const r = await stores.sweep.actions.setParams(v.value);
    if (r.kind === 'err') {
      setError(r.error.message);
      setApplyState('idle');
      return;
    }
    setApplyState('applied');
    window.setTimeout(() => setApplyState('idle'), 900);
  }

  async function toggleStream(): Promise<void> {
    const r = isStreaming
      ? await stores.sweep.actions.stopStream()
      : await stores.sweep.actions.startStream();
    if (r.kind === 'err') setError(r.error.message);
  }

  const submit = (): void => {
    void applyFromFields(startN, stopN, pointsN);
  };

  const applyCenterSpan = (): void => {
    const start = centerMhz - spanMhz / 2;
    const stop = centerMhz + spanMhz / 2;
    void applyFromFields(start, stop, pointsN);
  };

  // Quick span presets — useful on a live knob, not hidden in a dialog.
  const setPreset = (startM: number, stopM: number): void => {
    setStartMhz(String(startM));
    setStopMhz(String(stopM));
    void applyFromFields(startM, stopM, pointsN);
  };

  const maxMhz = caps !== null ? Number(caps.maxFrequencyHz) / 1e6 : 0;

  return (
    <div className="space-y-2 text-xs">
      <p className="text-[10px] text-[var(--color-label)]">
        {caps !== null
          ? `Range ${formatMhz(Number(caps.minFrequencyHz))} – ${formatMhz(Number(caps.maxFrequencyHz))}`
          : 'Connect a device to set sweep.'}
      </p>

      <label className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5">
        <span className="w-14 text-[var(--color-label)]">Start</span>
        <input
          type="number"
          value={startMhz}
          onChange={(e) => setStartMhz(e.target.value)}
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1 text-right"
        />
        <span className="w-8 text-[var(--color-label)]">MHz</span>
      </label>
      <label className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5">
        <span className="w-14 text-[var(--color-label)]">Stop</span>
        <input
          type="number"
          value={stopMhz}
          onChange={(e) => setStopMhz(e.target.value)}
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1 text-right"
        />
        <span className="w-8 text-[var(--color-label)]">MHz</span>
      </label>
      <label className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5">
        <span className="w-14 text-[var(--color-label)]">Center</span>
        <input
          type="number"
          value={Number.isFinite(centerMhz) ? centerMhz.toFixed(3) : ''}
          onChange={(e) => {
            const c = Number.parseFloat(e.target.value);
            if (!Number.isFinite(c)) return;
            const s = Number.isFinite(spanMhz) ? spanMhz : 0;
            setStartMhz(String(c - s / 2));
            setStopMhz(String(c + s / 2));
          }}
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1 text-right"
        />
        <span className="w-8 text-[var(--color-label)]">MHz</span>
      </label>
      <label className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5">
        <span className="w-14 text-[var(--color-label)]">Span</span>
        <input
          type="number"
          value={Number.isFinite(spanMhz) ? spanMhz.toFixed(3) : ''}
          onChange={(e) => {
            const s = Number.parseFloat(e.target.value);
            if (!Number.isFinite(s) || s <= 0) return;
            const c = Number.isFinite(centerMhz) ? centerMhz : 0;
            setStartMhz(String(c - s / 2));
            setStopMhz(String(c + s / 2));
          }}
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1 text-right"
        />
        <span className="w-8 text-[var(--color-label)]">MHz</span>
      </label>
      <label className="grid grid-cols-[auto_1fr_auto] items-center gap-1.5">
        <span className="w-14 text-[var(--color-label)]">Points</span>
        <select
          value={pointsStr}
          onChange={(e) => setPointsStr(e.target.value)}
          className="w-full rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
        >
          {pointsOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="w-8" />
      </label>

      <div className="flex flex-wrap gap-1.5 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={applyState === 'applying'}
          className={`rounded px-2 py-1 text-[var(--color-bg)] transition-colors ${
            applyState === 'applied'
              ? 'bg-[var(--color-success)]'
              : applyState === 'applying'
                ? 'bg-[var(--color-warn)] opacity-80'
                : 'bg-[var(--color-accent)] hover:brightness-110'
          }`}
        >
          {applyState === 'applying'
            ? 'Applying…'
            : applyState === 'applied'
              ? '✓ Applied'
              : 'Apply'}
        </button>
        <button
          type="button"
          onClick={applyCenterSpan}
          className="rounded border border-[var(--color-border)] px-2 py-1"
          title="Rebuild start/stop from center ± span/2"
        >
          From center/span
        </button>
        <button
          type="button"
          onClick={() => void toggleStream()}
          disabled={params === null}
          className={`rounded border border-[var(--color-border)] px-2 py-1 disabled:opacity-50 ${
            isStreaming ? 'bg-[var(--color-warn)] text-[var(--color-bg)]' : ''
          }`}
        >
          {isStreaming ? 'Pause sweep' : 'Run sweep'}
        </button>
      </div>

      {caps !== null ? (
        <div className="pt-2">
          <span className="text-[10px] text-[var(--color-label)]">Presets</span>
          <div className="mt-1 flex flex-wrap gap-1">
            <PresetButton label="HF" onClick={() => setPreset(1, 30)} />
            <PresetButton label="VHF" onClick={() => setPreset(30, 300)} />
            <PresetButton label="UHF" onClick={() => setPreset(300, Math.min(3000, maxMhz))} />
            <PresetButton
              label="Full"
              onClick={() => setPreset(Number(caps.minFrequencyHz) / 1e6, maxMhz)}
            />
          </div>
        </div>
      ) : null}

      {error !== null ? (
        <p
          className="rounded border border-[var(--color-error)] px-2 py-1 text-[var(--color-error)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PresetButton(props: { readonly label: string; onClick(): void }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] hover:bg-[var(--color-panel-2)]"
    >
      {props.label}
    </button>
  );
}

export function _noop(p: SweepParams): SweepParams {
  return p;
}
