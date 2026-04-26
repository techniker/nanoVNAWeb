import { type AppState, AppStateProvider } from '@nanovnaweb/state';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecordingsPanel } from '../../src/recordings/RecordingsPanel.js';

function stubState(): AppState {
  const chart = {
    preset: 'single' as const,
    slots: {
      'slot-0': {
        id: 'slot-0',
        kind: 'rect' as const,
        primarySParam: 's11' as const,
        primaryColor: '',
        overlayIds: [],
        crosshairEnabled: false,
      },
    },
    slotOrder: ['slot-0'],
    selectedSlotId: 'slot-0',
  };
  const trace = { recorded: [], imported: [], loading: false, lastError: null };
  const live = { latestFrame: null, sweepRateHz: 0, frameCount: 0 };
  const mk = <T,>(v: T) => ({
    getState: () => v,
    subscribe: () => () => {},
    setState: () => {},
    getInitialState: () => v,
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
      live: {
        store: mk(live) as unknown as AppState['stores']['live']['store'],
        actions: { clear: vi.fn() },
        internal: { _ingestFrame: vi.fn() },
      },
    } as unknown as AppState['stores'],
    dispose: async () => {},
  };
}

describe('<RecordingsPanel/>', () => {
  it('renders header and empty list', () => {
    render(
      <AppStateProvider value={stubState()}>
        <RecordingsPanel />
      </AppStateProvider>,
    );
    expect(screen.getByText('Recordings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save snapshot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import touchstone/i })).toBeInTheDocument();
  });
});
