import { type AppState, AppStateProvider } from '@nanovnaweb/state';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SweepDialog } from '../../src/sweep/SweepDialog.js';

function makeState(): AppState {
  const caps = {
    minFrequencyHz: 5e4,
    maxFrequencyHz: 3e9,
    maxPoints: 1601,
    supportsS11: true,
    supportsS21: true,
    supportsAveraging: false,
  };
  const connection = {
    status: {
      state: 'connected' as const,
      info: { driverKind: 'v2' as const, displayName: 'V2', capabilities: caps },
    },
    lastError: null,
    reconnectEnabled: false,
    reconnectAttempt: 0,
  };
  const sweep = { params: null, isStreaming: false };
  return {
    stores: {
      connection: {
        store: {
          getState: () => connection,
          subscribe: () => () => {},
          setState: () => {},
          getInitialState: () => connection,
        } as unknown as AppState['stores']['connection']['store'],
        actions: {
          connect: vi.fn(),
          disconnect: vi.fn(),
          setReconnectEnabled: vi.fn(),
        },
        internal: { _updateStatus: vi.fn(), _clearError: vi.fn() },
      },
      sweep: {
        store: {
          getState: () => sweep,
          subscribe: () => () => {},
          setState: () => {},
          getInitialState: () => sweep,
        } as unknown as AppState['stores']['sweep']['store'],
        actions: {
          setParams: vi.fn().mockResolvedValue({ kind: 'ok', value: undefined }),
          startStream: vi.fn(),
          stopStream: vi.fn(),
          reset: vi.fn(),
        },
      },
    } as unknown as AppState['stores'],
    dispose: async () => {},
  };
}

describe('<SweepDialog/>', () => {
  it('renders with current sweep params', () => {
    render(
      <AppStateProvider value={makeState()}>
        <SweepDialog open={true} onOpenChange={() => {}} />
      </AppStateProvider>,
    );
    expect(screen.getByText('Sweep parameters')).toBeInTheDocument();
  });

  it('shows inline error on invalid submit', async () => {
    render(
      <AppStateProvider value={makeState()}>
        <SweepDialog open={true} onOpenChange={() => {}} />
      </AppStateProvider>,
    );
    fireEvent.change(screen.getByLabelText(/Start/i), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
