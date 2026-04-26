import { useConnectionStore, useStores } from '@nanovnaweb/state';
import type { ConnectionStatus, IoError } from '@nanovnaweb/workers';
import { useCallback } from 'react';

export interface UseConnectResult {
  readonly status: ConnectionStatus;
  readonly lastError: IoError | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export function useConnect(): UseConnectResult {
  const stores = useStores();
  const status = useConnectionStore(stores.connection.store, (s) => s.status);
  const lastError = useConnectionStore(stores.connection.store, (s) => s.lastError);

  const connect = useCallback(async (): Promise<void> => {
    const r = await stores.connection.actions.connect();
    if (r.kind === 'err') {
      throw new Error(r.error.message);
    }
  }, [stores]);

  const disconnect = useCallback(async (): Promise<void> => {
    await stores.connection.actions.disconnect();
  }, [stores]);

  return { status, lastError, connect, disconnect };
}
