import { type AppState, AppStateProvider } from '@nanovnaweb/state';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastRoot } from '../../src/toasts/ToastRoot.js';

describe('<ToastRoot/>', () => {
  it('emits a toast for warn-level entries', () => {
    type Listener = (state: { recent: unknown[] }) => void;
    const listeners: Listener[] = [];
    let state: { recent: unknown[] } = { recent: [] };
    const store = {
      getState: () => state,
      setState: () => {},
      subscribe: (fn: Listener) => {
        listeners.push(fn);
        return () => {
          const idx = listeners.indexOf(fn);
          if (idx >= 0) listeners.splice(idx, 1);
        };
      },
      getInitialState: () => state,
    };

    const appState = {
      stores: {
        debug: {
          store: store as unknown as AppState['stores']['debug']['store'],
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

    render(
      <AppStateProvider value={appState}>
        <ToastRoot />
      </AppStateProvider>,
    );

    act(() => {
      state = {
        recent: [{ level: 'warn', category: 'test', message: 'careful', timestamp: Date.now() }],
      };
      for (const l of listeners) l(state);
    });

    expect(screen.getByText('careful')).toBeInTheDocument();
  });
});
