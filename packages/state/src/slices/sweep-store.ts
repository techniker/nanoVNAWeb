import type { Hz, Result, SweepParams } from '@nanovnaweb/shared';
import type { IoApi, IoError } from '@nanovnaweb/workers';
import { type StoreApi, useStore as useZustandStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface SweepState {
  /** Currently *applied* sweep on the device. `null` when disconnected. */
  readonly params: SweepParams | null;
  readonly isStreaming: boolean;
  /**
   * Last-successfully-applied sweep params, persisted across sessions.
   * Survives disconnect and page reload so the Stimulus form can
   * re-populate with the user's previous values instead of a hardcoded
   * default. Never used to drive the device directly — only as the
   * initial value for the form until the real `params` resolves.
   */
  readonly lastParams: SweepParams | null;
}

export interface SweepActions {
  setParams(next: SweepParams): Promise<Result<void, IoError>>;
  startStream(): Promise<Result<void, IoError>>;
  stopStream(): Promise<Result<void, IoError>>;
  reset(): void;
}

export interface SweepStoreDeps {
  readonly io: IoApi;
}

const LAST_PARAMS_STORAGE_KEY = 'nanovnaweb.sweep.lastParams';

interface StoredParamsShape {
  readonly start: number;
  readonly stop: number;
  readonly points: number;
}

function readStoredParams(): SweepParams | null {
  try {
    const raw = globalThis.localStorage?.getItem(LAST_PARAMS_STORAGE_KEY);
    if (raw === null || raw === undefined) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as StoredParamsShape).start !== 'number' ||
      typeof (parsed as StoredParamsShape).stop !== 'number' ||
      typeof (parsed as StoredParamsShape).points !== 'number'
    ) {
      return null;
    }
    const p = parsed as StoredParamsShape;
    if (!(p.start >= 0) || !(p.stop > p.start) || !(p.points >= 2)) return null;
    return { start: p.start as Hz, stop: p.stop as Hz, points: p.points };
  } catch {
    return null;
  }
}

function writeStoredParams(p: SweepParams): void {
  try {
    const payload: StoredParamsShape = {
      start: Number(p.start),
      stop: Number(p.stop),
      points: p.points,
    };
    globalThis.localStorage?.setItem(LAST_PARAMS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable (SSR, private mode, quota) — non-fatal.
  }
}

export function createSweepStore(deps: SweepStoreDeps): {
  readonly store: StoreApi<SweepState>;
  readonly actions: SweepActions;
} {
  const store = createStore<SweepState>()(() => ({
    params: null,
    isStreaming: false,
    lastParams: readStoredParams(),
  }));

  const actions: SweepActions = {
    async setParams(next) {
      const r = await deps.io.setSweep(next);
      if (r.kind === 'ok') {
        store.setState({ params: next, lastParams: next });
        writeStoredParams(next);
      }
      return r;
    },
    async startStream() {
      const r = await deps.io.startStream();
      if (r.kind === 'ok') {
        store.setState({ isStreaming: true });
      }
      return r;
    },
    async stopStream() {
      const r = await deps.io.stopStream();
      if (r.kind === 'ok') {
        store.setState({ isStreaming: false });
      }
      return r;
    },
    reset() {
      // Clearing the applied sweep on disconnect is intentional — the
      // current sweep is device-scoped. We deliberately keep `lastParams`
      // so the form still remembers the user's preferences for next
      // connection.
      store.setState({ params: null, isStreaming: false });
    },
  };

  return { store, actions };
}

export function useSweepStore<T>(
  store: StoreApi<SweepState>,
  selector: (state: SweepState) => T,
): T {
  return useZustandStore(store, selector);
}
