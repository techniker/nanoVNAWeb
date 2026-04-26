import { type AppState, AppStateProvider } from '@nanovnaweb/state';
import { renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useImportTouchstone } from '../../src/recordings/useImportTouchstone.js';

function stubState(importMock: ReturnType<typeof vi.fn>): AppState {
  const trace = { recorded: [], imported: [], loading: false, lastError: null };
  const traceStore = {
    getState: () => trace,
    subscribe: () => () => {},
    setState: () => {},
    getInitialState: () => trace,
  };
  return {
    stores: {
      trace: {
        store: traceStore as unknown as AppState['stores']['trace']['store'],
        actions: {
          hydrate: vi.fn(),
          saveRecording: vi.fn(),
          importTouchstone: importMock,
          exportTouchstone: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
        },
      },
    } as unknown as AppState['stores'],
    dispose: async () => {},
  };
}

describe('useImportTouchstone', () => {
  it('delegates blob to trace.actions.importTouchstone', async () => {
    const fn = vi.fn().mockResolvedValue({ kind: 'ok', value: { id: '1' } });
    const state = stubState(fn);
    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <AppStateProvider value={state}>{children}</AppStateProvider>
    );
    const { result } = renderHook(() => useImportTouchstone(), { wrapper });
    await result.current.import(new Blob(['']), 'test.s1p');
    expect(fn).toHaveBeenCalled();
  });

  it('throws on err result', async () => {
    const fn = vi.fn().mockResolvedValue({ kind: 'err', error: { message: 'bad' } });
    const state = stubState(fn);
    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <AppStateProvider value={state}>{children}</AppStateProvider>
    );
    const { result } = renderHook(() => useImportTouchstone(), { wrapper });
    await expect(result.current.import(new Blob(['']))).rejects.toThrow('bad');
  });
});
