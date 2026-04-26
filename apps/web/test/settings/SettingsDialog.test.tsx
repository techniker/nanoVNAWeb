import { type AppState, AppStateProvider } from '@nanovnaweb/state';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsDialog } from '../../src/settings/SettingsDialog.js';

function stub(): AppState {
  const debug = { recent: [], flushActive: false };
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

describe('<SettingsDialog/>', () => {
  it('renders tabs', () => {
    render(
      <AppStateProvider value={stub()}>
        <SettingsDialog open={true} onOpenChange={() => {}} />
      </AppStateProvider>,
    );
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Logs' })).toBeInTheDocument();
  });
});
