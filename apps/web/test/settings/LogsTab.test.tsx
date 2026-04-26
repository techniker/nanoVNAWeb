import { type AppState, AppStateProvider } from '@nanovnaweb/state';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LogsTab } from '../../src/settings/LogsTab.js';

function stub(entries: unknown[]): AppState {
  const debug = { recent: entries, flushActive: false };
  const mk = () => ({
    getState: () => debug,
    subscribe: () => () => {},
    setState: () => {},
    getInitialState: () => debug,
  });
  return {
    stores: {
      debug: {
        store: mk() as unknown as AppState['stores']['debug']['store'],
        actions: {
          append: vi.fn(),
          clear: vi.fn(),
          startFlush: vi.fn(),
          stopFlush: vi.fn(),
          listStored: vi.fn(),
          clearStored: vi.fn(),
        },
        internal: { _appendLocal: vi.fn() },
      },
    } as unknown as AppState['stores'],
    dispose: async () => {},
  };
}

describe('<LogsTab/>', () => {
  it('renders empty list', () => {
    render(
      <AppStateProvider value={stub([])}>
        <LogsTab />
      </AppStateProvider>,
    );
    expect(screen.getByLabelText(/min level/i)).toBeInTheDocument();
  });

  it('renders entries above the threshold', () => {
    render(
      <AppStateProvider
        value={stub([
          { level: 'warn', category: 'test', message: 'careful', timestamp: Date.now() },
          { level: 'debug', category: 'test', message: 'noise', timestamp: Date.now() },
        ])}
      >
        <LogsTab />
      </AppStateProvider>,
    );
    expect(screen.getByText(/careful/)).toBeInTheDocument();
    expect(screen.queryByText(/noise/)).toBeNull();
  });
});
