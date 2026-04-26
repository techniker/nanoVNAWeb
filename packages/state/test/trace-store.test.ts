import type { PersistenceError } from '@nanovnaweb/persistence';
import { type Frame, type TraceRecord, asHz, err, isErr, isOk, ok } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { createTraceStore } from '../src/slices/trace-store.js';
import { makeFakeTraceRepo } from './helpers/fake-repos.js';

function makeTrace(overrides: Partial<TraceRecord> = {}): TraceRecord {
  const frame: Frame = Object.freeze({
    sequence: 0,
    timestamp: Date.now(),
    frequencies: Object.freeze([asHz(1_000_000)]),
    s11: Object.freeze([{ re: 1, im: 0 }]),
  });
  return {
    id: `t-${Math.random().toString(36).slice(2)}`,
    name: 'Test',
    createdAt: Date.now(),
    driverKind: 'v1',
    frame,
    ...overrides,
  };
}

describe('TraceStore', () => {
  it('starts empty, loading=false, no error', () => {
    const repo = makeFakeTraceRepo();
    const { store } = createTraceStore({ traceRepo: repo });
    expect(store.getState()).toEqual({
      recorded: [],
      imported: [],
      loading: false,
      lastError: null,
    });
  });

  it('hydrate populates recorded and imported arrays', async () => {
    const repo = makeFakeTraceRepo();
    await repo.save(makeTrace({ id: 'r1', driverKind: 'v1' }));
    await repo.save(makeTrace({ id: 'i1', driverKind: undefined }));
    const { store, actions } = createTraceStore({ traceRepo: repo });
    await actions.hydrate();
    const state = store.getState();
    expect(state.recorded.map((t) => t.id).sort()).toEqual(['r1']);
    expect(state.imported.map((t) => t.id).sort()).toEqual(['i1']);
  });

  it('saveRecording adds to recorded[]', async () => {
    const repo = makeFakeTraceRepo();
    const { store, actions } = createTraceStore({ traceRepo: repo });
    await actions.saveRecording(makeTrace({ id: 'a', driverKind: 'v1' }));
    expect(store.getState().recorded).toHaveLength(1);
    expect(repo.snapshot()).toHaveLength(1);
  });

  it('importTouchstone on ok adds to imported[]', async () => {
    const repo = makeFakeTraceRepo();
    const imported = makeTrace({ id: 'x', driverKind: undefined });
    repo.importResult(ok({ trace: imported, warnings: [] }));
    const { store, actions } = createTraceStore({ traceRepo: repo });
    const r = await actions.importTouchstone(new Blob(['# Hz S MA R 50\n1e6 0.5 -45\n']));
    expect(isOk(r)).toBe(true);
    expect(store.getState().imported).toHaveLength(1);
  });

  it('importTouchstone on err sets lastError', async () => {
    const repo = makeFakeTraceRepo();
    const parseErr = {
      kind: 'missing-option-line',
      message: 'no #',
    } as unknown as PersistenceError;
    repo.importResult(err(parseErr));
    const { store, actions } = createTraceStore({ traceRepo: repo });
    const r = await actions.importTouchstone(new Blob(['garbage']));
    expect(isErr(r)).toBe(true);
    expect(store.getState().lastError).toEqual(parseErr);
  });

  it('exportTouchstone delegates to repo', async () => {
    const repo = makeFakeTraceRepo();
    await repo.save(makeTrace({ id: 'e', driverKind: 'v1' }));
    const { actions } = createTraceStore({ traceRepo: repo });
    const r = await actions.exportTouchstone('e');
    expect(isOk(r)).toBe(true);
  });

  it('delete removes from both arrays', async () => {
    const repo = makeFakeTraceRepo();
    const { store, actions } = createTraceStore({ traceRepo: repo });
    await actions.saveRecording(makeTrace({ id: 'd', driverKind: 'v1' }));
    await actions.delete('d');
    expect(store.getState().recorded).toHaveLength(0);
  });

  it('clear empties both arrays', async () => {
    const repo = makeFakeTraceRepo();
    const { store, actions } = createTraceStore({ traceRepo: repo });
    await actions.saveRecording(makeTrace({ id: 'a', driverKind: 'v1' }));
    await actions.clear();
    expect(store.getState().recorded).toHaveLength(0);
    expect(store.getState().imported).toHaveLength(0);
  });

  it('hydrate sets loading=true during fetch', async () => {
    const repo = makeFakeTraceRepo();
    const { store, actions } = createTraceStore({ traceRepo: repo });
    const hydratePromise = actions.hydrate();
    // Loading is true during the in-flight call
    expect(store.getState().loading).toBe(true);
    await hydratePromise;
    expect(store.getState().loading).toBe(false);
  });

  it('successful save clears lastError', async () => {
    const repo = makeFakeTraceRepo();
    const { store, actions } = createTraceStore({ traceRepo: repo });
    store.setState({ lastError: { kind: 'unknown', message: 'x' } as PersistenceError });
    await actions.saveRecording(makeTrace({ id: 'c', driverKind: 'v1' }));
    expect(store.getState().lastError).toBeNull();
  });

  it('saveRecording with driverKind=undefined routes to imported[] not recorded[]', async () => {
    const repo = makeFakeTraceRepo();
    const { store, actions } = createTraceStore({ traceRepo: repo });
    await actions.saveRecording(makeTrace({ id: 'ud', driverKind: undefined }));
    expect(store.getState().recorded).toHaveLength(0);
    expect(store.getState().imported).toHaveLength(1);
  });
});
