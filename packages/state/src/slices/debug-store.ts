import type { LogAutoFlushHandle, LogRepository, PersistenceError } from '@nanovnaweb/persistence';
import type { LogEntry, Result } from '@nanovnaweb/shared';
import { type StoreApi, useStore as useZustandStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface DebugState {
  readonly recent: readonly LogEntry[];
  readonly flushActive: boolean;
}

export interface DebugActions {
  append(entry: LogEntry): void;
  clear(): void;
  startFlush(intervalMs?: number): void;
  stopFlush(): void;
  listStored(limit: number): Promise<Result<readonly LogEntry[], PersistenceError>>;
  clearStored(): Promise<Result<void, PersistenceError>>;
}

export interface DebugInternalActions {
  _appendLocal(entry: LogEntry): void;
}

export interface DebugStoreDeps {
  readonly logRepo: LogRepository;
}

const RING_CAP = 10_000;
const DEFAULT_FLUSH_INTERVAL_MS = 2000;

export function createDebugStore(deps: DebugStoreDeps): {
  readonly store: StoreApi<DebugState>;
  readonly actions: DebugActions;
  readonly internal: DebugInternalActions;
} {
  const store = createStore<DebugState>()(() => ({
    recent: [],
    flushActive: false,
  }));
  const pending: LogEntry[] = [];
  let flushHandle: LogAutoFlushHandle | null = null;

  function appendToRing(entry: LogEntry): void {
    const current = store.getState().recent;
    const next =
      current.length >= RING_CAP
        ? [...current.slice(current.length - RING_CAP + 1), entry]
        : [...current, entry];
    store.setState({ recent: Object.freeze(next) });
  }

  const actions: DebugActions = {
    append(entry) {
      appendToRing(entry);
      pending.push(entry);
    },
    clear() {
      store.setState({ recent: Object.freeze([]) });
    },
    startFlush(intervalMs = DEFAULT_FLUSH_INTERVAL_MS) {
      if (flushHandle !== null) return;
      flushHandle = deps.logRepo.startAutoFlush(intervalMs, () => {
        const drained = [...pending];
        pending.length = 0;
        return drained;
      });
      store.setState({ flushActive: true });
    },
    stopFlush() {
      if (flushHandle === null) return;
      flushHandle.stop();
      flushHandle = null;
      store.setState({ flushActive: false });
    },
    async listStored(limit) {
      return deps.logRepo.listRecent(limit);
    },
    async clearStored() {
      return deps.logRepo.clear();
    },
  };

  const internal: DebugInternalActions = {
    _appendLocal(entry) {
      appendToRing(entry);
      pending.push(entry);
    },
  };

  return { store, actions, internal };
}

export function useDebugStore<T>(
  store: StoreApi<DebugState>,
  selector: (state: DebugState) => T,
): T {
  return useZustandStore(store, selector);
}
