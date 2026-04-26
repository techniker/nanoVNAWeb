import { err, isErr, isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { createConnectionStore } from '../src/slices/connection-store.js';
import { makeFakeIo } from './helpers/fake-io.js';

describe('ConnectionStore', () => {
  it('starts in disconnected state with no error', () => {
    const { io } = makeFakeIo();
    const { store } = createConnectionStore({ io });
    const state = store.getState();
    expect(state.status).toEqual({ state: 'disconnected' });
    expect(state.lastError).toBeNull();
    expect(state.reconnectEnabled).toBe(false);
    expect(state.reconnectAttempt).toBe(0);
  });

  it('connect returns the io result and clears lastError on success', async () => {
    const fake = makeFakeIo();
    const { actions, store } = createConnectionStore({ io: fake.io });
    store.setState({ lastError: { kind: 'unknown', message: 'stale' } });
    const r = await actions.connect({ baudRate: 115200 });
    expect(isOk(r)).toBe(true);
    expect(store.getState().lastError).toBeNull();
    expect(fake.calls.connect).toHaveLength(1);
  });

  it('connect records lastError on failure', async () => {
    const fake = makeFakeIo();
    fake.setConnectResult(err({ kind: 'permission-denied', message: 'user declined' }));
    const { actions, store } = createConnectionStore({ io: fake.io });
    const r = await actions.connect();
    expect(isErr(r)).toBe(true);
    expect(store.getState().lastError).toEqual({
      kind: 'permission-denied',
      message: 'user declined',
    });
  });

  it('disconnect calls io.disconnect', async () => {
    const fake = makeFakeIo();
    const { actions } = createConnectionStore({ io: fake.io });
    await actions.disconnect();
    expect(fake.calls.disconnect).toBe(1);
  });

  it('internal _updateStatus writes state', () => {
    const fake = makeFakeIo();
    const { store, internal } = createConnectionStore({ io: fake.io });
    internal._updateStatus({ state: 'connecting' });
    expect(store.getState().status).toEqual({ state: 'connecting' });
  });

  it('internal _clearError sets lastError to null', () => {
    const fake = makeFakeIo();
    const { store, internal } = createConnectionStore({ io: fake.io });
    store.setState({ lastError: { kind: 'unknown', message: 'x' } });
    internal._clearError();
    expect(store.getState().lastError).toBeNull();
  });

  it('setReconnectEnabled toggles the flag', () => {
    const fake = makeFakeIo();
    const { store, actions } = createConnectionStore({ io: fake.io });
    actions.setReconnectEnabled(true);
    expect(store.getState().reconnectEnabled).toBe(true);
    actions.setReconnectEnabled(false);
    expect(store.getState().reconnectEnabled).toBe(false);
  });

  it('connect forwards connect options verbatim to io', async () => {
    const fake = makeFakeIo();
    const { actions } = createConnectionStore({ io: fake.io });
    await actions.connect({ baudRate: 9600, probeTimeoutMs: 500 });
    expect(fake.calls.connect[0]).toEqual({ baudRate: 9600, probeTimeoutMs: 500 });
  });
});
