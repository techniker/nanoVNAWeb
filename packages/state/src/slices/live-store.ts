import type { Frame } from '@nanovnaweb/shared';
import { type StoreApi, useStore as useZustandStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface LiveState {
  readonly latestFrame: Frame | null;
  readonly sweepRateHz: number;
  readonly frameCount: number;
}

export interface LiveActions {
  clear(): void;
}

export interface LiveInternalActions {
  _ingestFrame(f: Frame): void;
}

const RATE_WINDOW = 16;

export function createLiveStore(): {
  readonly store: StoreApi<LiveState>;
  readonly actions: LiveActions;
  readonly internal: LiveInternalActions;
} {
  const store = createStore<LiveState>()(() => ({
    latestFrame: null,
    sweepRateHz: 0,
    frameCount: 0,
  }));

  // Rolling window of recent frame timestamps (external to store state to
  // avoid recomputing ring on every React selector read).
  const timestamps: number[] = [];

  function computeRate(): number {
    if (timestamps.length < RATE_WINDOW) return 0;
    const newest = timestamps[timestamps.length - 1] ?? 0;
    const oldest = timestamps[0] ?? 0;
    const spanMs = newest - oldest;
    if (spanMs <= 0) return 0;
    return (RATE_WINDOW - 1) / (spanMs / 1000);
  }

  const actions: LiveActions = {
    clear() {
      timestamps.length = 0;
      store.setState({ latestFrame: null, sweepRateHz: 0, frameCount: 0 });
    },
  };

  const internal: LiveInternalActions = {
    _ingestFrame(f) {
      timestamps.push(f.timestamp);
      while (timestamps.length > RATE_WINDOW) timestamps.shift();
      const prev = store.getState();
      store.setState({
        latestFrame: f,
        frameCount: prev.frameCount + 1,
        sweepRateHz: computeRate(),
      });
    },
  };

  return { store, actions, internal };
}

export function useLiveStore<T>(store: StoreApi<LiveState>, selector: (state: LiveState) => T): T {
  return useZustandStore(store, selector);
}
