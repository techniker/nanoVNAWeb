import { type Result, ok } from '@nanovnaweb/shared';
import type { IoApi, IoError } from '@nanovnaweb/workers';
import { type StoreApi, useStore as useZustandStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export type AppMode = 'sweep' | 'siggen' | 'idle';

export interface ModeState {
  readonly mode: AppMode;
}

export interface ModeActions {
  setMode(mode: AppMode): Promise<Result<void, IoError>>;
}

export interface ModeStoreDeps {
  readonly io: IoApi;
}

export function createModeStore(_deps: ModeStoreDeps): {
  readonly store: StoreApi<ModeState>;
  readonly actions: ModeActions;
} {
  const store = createStore<ModeState>()(() => ({ mode: 'idle' }));
  const actions: ModeActions = {
    async setMode(mode) {
      // IoApi.setMode will land in Plan #8+. For now, we track intent
      // locally; hardware-level mode exclusion is enforced by the
      // driver when setSweep / setSigGen are called.
      store.setState({ mode });
      return ok(undefined);
    },
  };
  return { store, actions };
}

export function useModeStore<T>(store: StoreApi<ModeState>, selector: (state: ModeState) => T): T {
  return useZustandStore(store, selector);
}
