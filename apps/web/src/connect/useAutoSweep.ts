import type { DeviceCapabilities, Hz, SweepParams } from '@nanovnaweb/shared';
import type { AppState } from '@nanovnaweb/state';
import { useEffect } from 'react';
import { applyOverride, currentOverride } from './deviceOverride.js';

function defaultSweep(caps: DeviceCapabilities): SweepParams {
  const min = Number(caps.minFrequencyHz);
  const max = Number(caps.maxFrequencyHz);
  const start = Math.max(min, 1_000_000);
  const stop = Math.min(max, 1_500_000_000);
  const points = Math.min(401, caps.maxPoints);
  return {
    start: start as Hz,
    stop: (stop > start ? stop : max) as Hz,
    points,
  };
}

/**
 * Applies a capability-scaled default sweep and starts streaming the first
 * time the device transitions to `connected`. Without this, the app sits on
 * a blank chart grid until the user discovers the sweep dialog and the
 * Space-to-stream shortcut.
 *
 * Called from the top-level `App` component with the pre-built `AppState`, so
 * it does not depend on the React provider being mounted yet.
 */
export function useAutoSweep(state: AppState, onError: (msg: string) => void): void {
  useEffect(() => {
    let lastState: string | null = state.stores.connection.store.getState().status.state;
    let pending = false;
    const unsub = state.stores.connection.store.subscribe((s) => {
      const next = s.status.state;
      const was = lastState;
      lastState = next;
      if (next !== 'connected' || was === 'connected') return;
      if (s.status.state !== 'connected') return;
      if (pending) return;
      pending = true;
      const caps = applyOverride(s.status.info.capabilities, currentOverride());
      void (async (): Promise<void> => {
        try {
          if (state.stores.sweep.store.getState().params === null) {
            const r = await state.stores.sweep.actions.setParams(defaultSweep(caps));
            if (r.kind === 'err') {
              onError(r.error.message);
              return;
            }
          }
          if (!state.stores.sweep.store.getState().isStreaming) {
            const r = await state.stores.sweep.actions.startStream();
            if (r.kind === 'err') onError(r.error.message);
          }
        } finally {
          pending = false;
        }
      })();
    });
    return () => unsub();
  }, [state, onError]);
}
