import { type StoreApi, useStore as useZustandStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface AppStoreState {
  readonly bootPhase: 'starting' | 'workerReady' | 'hydrated' | 'ready';
  readonly workerError: string | null;
  readonly hydrationError: string | null;
  readonly viewerMode: 'host' | 'viewer' | null;
}

export interface AppStoreActions {
  setBootPhase(phase: AppStoreState['bootPhase']): void;
  setWorkerError(err: string | null): void;
  setHydrationError(err: string | null): void;
  setViewerMode(mode: AppStoreState['viewerMode']): void;
  getPublicSnapshot(): { readonly viewerMode: AppStoreState['viewerMode'] };
}

export function createAppStore(): {
  readonly store: StoreApi<AppStoreState>;
  readonly actions: AppStoreActions;
} {
  const store = createStore<AppStoreState>()(() => ({
    bootPhase: 'starting',
    workerError: null,
    hydrationError: null,
    viewerMode: null,
  }));

  const actions: AppStoreActions = {
    setBootPhase(phase) {
      store.setState({ bootPhase: phase });
    },
    setWorkerError(err) {
      store.setState({ workerError: err });
    },
    setHydrationError(err) {
      store.setState({ hydrationError: err });
    },
    setViewerMode(mode) {
      store.setState({ viewerMode: mode });
    },
    getPublicSnapshot() {
      return { viewerMode: store.getState().viewerMode };
    },
  };

  return { store, actions };
}

export function useAppStore<T>(
  store: StoreApi<AppStoreState>,
  selector: (state: AppStoreState) => T,
): T {
  return useZustandStore(store, selector);
}
