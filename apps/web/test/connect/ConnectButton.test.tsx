import { type AppState, AppStateProvider } from '@nanovnaweb/state';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConnectButton } from '../../src/connect/ConnectButton.js';

function fakeAppState(status: { state: string; info?: unknown }): AppState {
  const connectionState = {
    status,
    lastError: null,
    reconnectEnabled: false,
    reconnectAttempt: 0,
  };
  const store = {
    getState: () => connectionState,
    setState: () => {},
    subscribe: () => () => {},
    getInitialState: () => connectionState,
  };
  const okResult = async (): Promise<{ kind: 'ok'; value: undefined }> => ({
    kind: 'ok',
    value: undefined,
  });
  return {
    stores: {
      connection: {
        store: store as unknown as AppState['stores']['connection']['store'],
        actions: {
          connect: okResult,
          disconnect: okResult,
          setReconnectEnabled: () => {},
        },
        internal: { _updateStatus: () => {}, _clearError: () => {} },
      },
    } as unknown as AppState['stores'],
    dispose: async () => {},
  };
}

describe('<ConnectButton/>', () => {
  it('shows "Connect" when disconnected', () => {
    const state = fakeAppState({ state: 'disconnected' });
    render(
      <AppStateProvider value={state}>
        <ConnectButton onError={vi.fn()} />
      </AppStateProvider>,
    );
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });

  it('shows "Connecting…" and is disabled while connecting', () => {
    const state = fakeAppState({ state: 'connecting' });
    render(
      <AppStateProvider value={state}>
        <ConnectButton onError={vi.fn()} />
      </AppStateProvider>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent(/connecting/i);
    expect(btn).toBeDisabled();
  });

  it('shows "Disconnect" when connected', () => {
    const state = fakeAppState({
      state: 'connected',
      info: { displayName: 'NanoVNA V2', driverKind: 'v2', capabilities: {} },
    });
    render(
      <AppStateProvider value={state}>
        <ConnectButton onError={vi.fn()} />
      </AppStateProvider>,
    );
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });
});
