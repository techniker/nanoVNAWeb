import type { DeviceInfo, Result } from '@nanovnaweb/shared';
import type { ConnectOptions, ConnectionStatus, IoApi, IoError } from '@nanovnaweb/workers';
import { type StoreApi, useStore as useZustandStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface ConnectionState {
  readonly status: ConnectionStatus;
  readonly lastError: IoError | null;
  readonly reconnectEnabled: boolean;
  readonly reconnectAttempt: number;
}

export interface ConnectionActions {
  connect(opts?: ConnectOptions): Promise<Result<DeviceInfo, IoError>>;
  disconnect(): Promise<void>;
  setReconnectEnabled(enabled: boolean): void;
}

export interface ConnectionInternalActions {
  _updateStatus(s: ConnectionStatus): void;
  _clearError(): void;
}

export interface ConnectionStoreDeps {
  readonly io: IoApi;
}

export function createConnectionStore(deps: ConnectionStoreDeps): {
  readonly store: StoreApi<ConnectionState>;
  readonly actions: ConnectionActions;
  readonly internal: ConnectionInternalActions;
} {
  const store = createStore<ConnectionState>()(() => ({
    status: { state: 'disconnected' },
    lastError: null,
    reconnectEnabled: false,
    reconnectAttempt: 0,
  }));

  const actions: ConnectionActions = {
    async connect(opts) {
      store.setState({ lastError: null });
      const r = await deps.io.connect(opts);
      if (r.kind === 'err') {
        store.setState({ lastError: r.error });
      }
      return r;
    },
    async disconnect() {
      await deps.io.disconnect();
    },
    setReconnectEnabled(enabled) {
      store.setState({ reconnectEnabled: enabled });
    },
  };

  const internal: ConnectionInternalActions = {
    _updateStatus(s) {
      store.setState({ status: s });
    },
    _clearError() {
      store.setState({ lastError: null });
    },
  };

  return { store, actions, internal };
}

export function useConnectionStore<T>(
  store: StoreApi<ConnectionState>,
  selector: (state: ConnectionState) => T,
): T {
  return useZustandStore(store, selector);
}
