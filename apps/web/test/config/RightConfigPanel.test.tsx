import { type AppState, AppStateProvider } from '@nanovnaweb/state';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RightConfigPanel } from '../../src/config/RightConfigPanel.js';

function stub(selectedId: string | null): AppState {
  const chart = {
    preset: 'single' as const,
    slots: {
      'slot-0': {
        id: 'slot-0',
        kind: 'rect' as const,
        primarySParam: 's11' as const,
        primaryColor: 'var(--color-trace-1)',
        overlayIds: [],
        crosshairEnabled: false,
      },
    },
    slotOrder: ['slot-0'],
    selectedSlotId: selectedId,
  };
  const connection = {
    status: { state: 'disconnected' as const },
    lastError: null,
    reconnectEnabled: false,
    reconnectAttempt: 0,
  };
  const sweep = { params: null, isStreaming: false };
  const trace = { recorded: [], imported: [], loading: false, lastError: null };
  const mk = <T,>(value: T) => ({
    getState: () => value,
    subscribe: () => () => {},
    setState: () => {},
    getInitialState: () => value,
  });
  return {
    stores: {
      chart: {
        store: mk(chart) as unknown as AppState['stores']['chart']['store'],
        actions: {
          setPreset: vi.fn(),
          setSlot: vi.fn(),
          selectSlot: vi.fn(),
          toggleOverlay: vi.fn(),
          toggleCrosshair: vi.fn(),
        },
      },
      connection: {
        store: mk(connection) as unknown as AppState['stores']['connection']['store'],
        actions: { connect: vi.fn(), disconnect: vi.fn(), setReconnectEnabled: vi.fn() },
        internal: { _updateStatus: vi.fn(), _clearError: vi.fn() },
      },
      sweep: {
        store: mk(sweep) as unknown as AppState['stores']['sweep']['store'],
        actions: {
          setParams: vi.fn(),
          startStream: vi.fn(),
          stopStream: vi.fn(),
          reset: vi.fn(),
        },
      },
      trace: {
        store: mk(trace) as unknown as AppState['stores']['trace']['store'],
        actions: {
          hydrate: vi.fn(),
          saveRecording: vi.fn(),
          importTouchstone: vi.fn(),
          exportTouchstone: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
        },
      },
    } as unknown as AppState['stores'],
    dispose: async () => {},
  };
}

describe('<RightConfigPanel/>', () => {
  it('renders Stimulus, Display, Marker, and Overlays group headers', () => {
    render(
      <AppStateProvider value={stub('slot-0')}>
        <RightConfigPanel />
      </AppStateProvider>,
    );
    expect(screen.getByRole('button', { name: /stimulus/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /display/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /marker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /overlays/i })).toBeInTheDocument();
  });

  it('shows layout picker in the Display group', () => {
    render(
      <AppStateProvider value={stub('slot-0')}>
        <RightConfigPanel />
      </AppStateProvider>,
    );
    const layout = screen.getByRole('combobox', { name: /layout/i });
    expect(layout).toHaveValue('single');
  });
});
