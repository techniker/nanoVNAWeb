import type { StoreApi } from 'zustand';
import { type AppStoreActions, type AppStoreState, createAppStore } from './slices/app-store.js';
import { type ChartActions, type ChartState, createChartStore } from './slices/chart-store.js';
import {
  type ConnectionActions,
  type ConnectionInternalActions,
  type ConnectionState,
  createConnectionStore,
} from './slices/connection-store.js';
import {
  type DebugActions,
  type DebugInternalActions,
  type DebugState,
  createDebugStore,
} from './slices/debug-store.js';
import {
  type LiveActions,
  type LiveInternalActions,
  type LiveState,
  createLiveStore,
} from './slices/live-store.js';
import { type ModeActions, type ModeState, createModeStore } from './slices/mode-store.js';
import { type SweepActions, type SweepState, createSweepStore } from './slices/sweep-store.js';
import { type TraceActions, type TraceLibrary, createTraceStore } from './slices/trace-store.js';
import type { AppDeps } from './types.js';

// We re-import internal types by value-free path; TypeScript resolves them
// from the slice files where the internal action types are exported but
// not re-exported from the package barrel.

export interface AppState {
  readonly stores: {
    readonly app: {
      readonly store: StoreApi<AppStoreState>;
      readonly actions: AppStoreActions;
    };
    readonly connection: {
      readonly store: StoreApi<ConnectionState>;
      readonly actions: ConnectionActions;
      readonly internal: ConnectionInternalActions;
    };
    readonly sweep: {
      readonly store: StoreApi<SweepState>;
      readonly actions: SweepActions;
    };
    readonly mode: {
      readonly store: StoreApi<ModeState>;
      readonly actions: ModeActions;
    };
    readonly live: {
      readonly store: StoreApi<LiveState>;
      readonly actions: LiveActions;
      readonly internal: LiveInternalActions;
    };
    readonly trace: {
      readonly store: StoreApi<TraceLibrary>;
      readonly actions: TraceActions;
    };
    readonly debug: {
      readonly store: StoreApi<DebugState>;
      readonly actions: DebugActions;
      readonly internal: DebugInternalActions;
    };
    readonly chart: {
      readonly store: StoreApi<ChartState>;
      readonly actions: ChartActions;
    };
    // SigGenStore deferred to Plan #8 (requires IoApi.setSigGen).
  };
  dispose(): Promise<void>;
}

export async function createAppState(deps: AppDeps): Promise<AppState> {
  const app = createAppStore();
  const connection = createConnectionStore({ io: deps.io });
  const sweep = createSweepStore({ io: deps.io });
  const mode = createModeStore({ io: deps.io });
  const live = createLiveStore();
  const trace = createTraceStore({ traceRepo: deps.traceRepo });
  const debug = createDebugStore({ logRepo: deps.logRepo });
  const chart = createChartStore();
  // SigGenStore deferred to Plan #8 (requires IoApi.setSigGen).

  const unsubs = [
    await deps.io.onStatus((s) => connection.internal._updateStatus(s)),
    await deps.io.onFrame((f) => live.internal._ingestFrame(f)),
    await deps.io.onLog((e) => debug.internal._appendLocal(e)),
  ];

  app.actions.setBootPhase('starting');
  void trace.actions.hydrate().then((r) => {
    if (r.kind === 'err') {
      app.actions.setHydrationError(r.error.message);
    }
    app.actions.setBootPhase('hydrated');
  });

  return {
    stores: { app, connection, sweep, mode, live, trace, debug, chart },
    async dispose() {
      for (const unsub of unsubs) await unsub();
      debug.actions.stopFlush();
    },
  };
}
