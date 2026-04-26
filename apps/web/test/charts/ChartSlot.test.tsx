import { type AppState, AppStateProvider } from '@nanovnaweb/state';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChartSlot } from '../../src/charts/ChartSlot.js';

vi.mock('@nanovnaweb/render', async (orig) => {
  const actual = await orig<typeof import('@nanovnaweb/render')>();
  return {
    ...actual,
    createDefaultRegistry: () => ({
      register: () => {},
      get: () => ({
        kind: 'rect' as const,
        displayName: 'Rectangular',
        mount: () => ({
          resize: vi.fn(),
          draw: vi.fn(),
          destroy: vi.fn(),
        }),
      }),
      list: () => [],
    }),
  };
});

function stubState(): AppState {
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
    selectedSlotId: 'slot-0',
  };
  const chartStore = {
    getState: () => chart,
    subscribe: () => () => {},
    setState: () => {},
    getInitialState: () => chart,
  };
  const live = { latestFrame: null, sweepRateHz: 0, frameCount: 0 };
  const trace = { recorded: [], imported: [], loading: false, lastError: null };
  const liveStore = {
    getState: () => live,
    subscribe: () => () => {},
    setState: () => {},
    getInitialState: () => live,
  };
  const traceStore = {
    getState: () => trace,
    subscribe: () => () => {},
    setState: () => {},
    getInitialState: () => trace,
  };
  return {
    stores: {
      chart: {
        store: chartStore as unknown as AppState['stores']['chart']['store'],
        actions: {
          setPreset: vi.fn(),
          setSlot: vi.fn(),
          selectSlot: vi.fn(),
          toggleOverlay: vi.fn(),
          toggleCrosshair: vi.fn(),
        },
      },
      live: {
        store: liveStore as unknown as AppState['stores']['live']['store'],
        actions: { clear: vi.fn() },
        internal: { _ingestFrame: vi.fn() },
      },
      trace: {
        store: traceStore as unknown as AppState['stores']['trace']['store'],
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

describe('<ChartSlot/>', () => {
  it('mounts and unmounts without throwing', () => {
    const state = stubState();
    const { unmount } = render(
      <AppStateProvider value={state}>
        <ChartSlot slotId="slot-0" />
      </AppStateProvider>,
    );
    expect(screen.getByTestId('chart-slot-slot-0')).toBeInTheDocument();
    unmount();
  });
});
