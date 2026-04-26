import { act, render, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { createAppState } from '../src/app-state.js';
import { AppStateProvider, useStores } from '../src/react.js';
import { useConnectionStore } from '../src/slices/connection-store.js';
import { makeFakeIo } from './helpers/fake-io.js';
import { makeFakeLogRepo, makeFakeTraceRepo } from './helpers/fake-repos.js';

async function makeApp() {
  return createAppState({
    io: makeFakeIo().io,
    traceRepo: makeFakeTraceRepo(),
    logRepo: makeFakeLogRepo(),
  });
}

describe('React bindings', () => {
  it('useStores returns stores inside AppStateProvider', async () => {
    const app = await makeApp();
    const { result } = renderHook(() => useStores(), {
      wrapper: ({ children }) => <AppStateProvider value={app}>{children}</AppStateProvider>,
    });
    expect(result.current.connection).toBeDefined();
    expect(result.current.live).toBeDefined();
    await app.dispose();
  });

  it('useStores throws a clear error outside AppStateProvider', () => {
    expect(() => renderHook(() => useStores())).toThrow(/useStores must be called inside/);
  });

  it('useConnectionStore selector re-renders on state changes', async () => {
    const fake = makeFakeIo();
    const app = await createAppState({
      io: fake.io,
      traceRepo: makeFakeTraceRepo(),
      logRepo: makeFakeLogRepo(),
    });
    const renders: string[] = [];
    function Probe(): React.ReactElement {
      const status = useConnectionStore(app.stores.connection.store, (s) => s.status.state);
      renders.push(status);
      return React.createElement('div', null, status);
    }
    render(React.createElement(Probe));
    expect(renders).toEqual(['disconnected']);
    act(() => fake.emitStatus({ state: 'connecting' }));
    expect(renders[renders.length - 1]).toBe('connecting');
    await app.dispose();
  });

  it('AppStateProvider passes AppState via context', async () => {
    const app = await makeApp();
    function ReadStores(): React.ReactElement {
      const stores = useStores();
      return React.createElement('div', null, stores.app ? 'present' : 'missing');
    }
    const { container } = render(
      <AppStateProvider value={app}>
        <ReadStores />
      </AppStateProvider>,
    );
    expect(container.textContent).toBe('present');
    await app.dispose();
  });
});
