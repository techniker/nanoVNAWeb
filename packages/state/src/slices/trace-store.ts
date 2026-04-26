import type { ParseError } from '@nanovnaweb/formats';
import type { PersistenceError, TraceRepository } from '@nanovnaweb/persistence';
import { type Result, type TraceRecord, ok } from '@nanovnaweb/shared';
import { type StoreApi, useStore as useZustandStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface TraceLibrary {
  readonly recorded: readonly TraceRecord[];
  readonly imported: readonly TraceRecord[];
  readonly loading: boolean;
  readonly lastError: PersistenceError | ParseError | null;
}

export interface TraceActions {
  hydrate(): Promise<Result<void, PersistenceError>>;
  saveRecording(trace: TraceRecord): Promise<Result<void, PersistenceError>>;
  importTouchstone(
    blob: Blob,
    opts?: { suggestedName?: string },
  ): Promise<Result<TraceRecord, PersistenceError | ParseError>>;
  exportTouchstone(id: string): Promise<Result<ReadableStream<Uint8Array>, PersistenceError>>;
  delete(id: string): Promise<Result<void, PersistenceError>>;
  clear(): Promise<Result<void, PersistenceError>>;
}

export interface TraceStoreDeps {
  readonly traceRepo: TraceRepository;
}

function splitByOrigin(traces: readonly TraceRecord[]): {
  recorded: TraceRecord[];
  imported: TraceRecord[];
} {
  const recorded: TraceRecord[] = [];
  const imported: TraceRecord[] = [];
  for (const t of traces) {
    if (t.driverKind !== undefined) recorded.push(t);
    else imported.push(t);
  }
  return { recorded, imported };
}

export function createTraceStore(deps: TraceStoreDeps): {
  readonly store: StoreApi<TraceLibrary>;
  readonly actions: TraceActions;
} {
  const store = createStore<TraceLibrary>()(() => ({
    recorded: [],
    imported: [],
    loading: false,
    lastError: null,
  }));

  const actions: TraceActions = {
    async hydrate() {
      store.setState({ loading: true });
      const r = await deps.traceRepo.listAll();
      if (r.kind === 'err') {
        store.setState({ loading: false, lastError: r.error });
        return r;
      }
      const split = splitByOrigin(r.value);
      store.setState({
        recorded: Object.freeze([...split.recorded]),
        imported: Object.freeze([...split.imported]),
        loading: false,
        lastError: null,
      });
      return ok(undefined);
    },

    async saveRecording(trace) {
      const r = await deps.traceRepo.save(trace);
      if (r.kind === 'err') {
        store.setState({ lastError: r.error });
        return r;
      }
      const state = store.getState();
      const updated =
        trace.driverKind !== undefined
          ? {
              recorded: Object.freeze([...state.recorded, trace]),
              imported: state.imported,
            }
          : {
              recorded: state.recorded,
              imported: Object.freeze([...state.imported, trace]),
            };
      store.setState({ ...updated, lastError: null });
      return ok(undefined);
    },

    async importTouchstone(blob, opts) {
      const r = await deps.traceRepo.importTouchstone(blob, opts);
      if (r.kind === 'err') {
        store.setState({ lastError: r.error });
        return r;
      }
      const state = store.getState();
      store.setState({
        imported: Object.freeze([...state.imported, r.value.trace]),
        lastError: null,
      });
      return ok(r.value.trace);
    },

    async exportTouchstone(id) {
      const r = await deps.traceRepo.exportTouchstone(id);
      if (r.kind === 'err') {
        store.setState({ lastError: r.error });
      }
      return r;
    },

    async delete(id) {
      const r = await deps.traceRepo.delete(id);
      if (r.kind === 'err') {
        store.setState({ lastError: r.error });
        return r;
      }
      const state = store.getState();
      store.setState({
        recorded: Object.freeze(state.recorded.filter((t) => t.id !== id)),
        imported: Object.freeze(state.imported.filter((t) => t.id !== id)),
      });
      return ok(undefined);
    },

    async clear() {
      const r = await deps.traceRepo.clear();
      if (r.kind === 'err') {
        store.setState({ lastError: r.error });
        return r;
      }
      store.setState({ recorded: Object.freeze([]), imported: Object.freeze([]) });
      return ok(undefined);
    },
  };

  return { store, actions };
}

export function useTraceStore<T>(
  store: StoreApi<TraceLibrary>,
  selector: (state: TraceLibrary) => T,
): T {
  return useZustandStore(store, selector);
}
