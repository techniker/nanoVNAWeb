import { asHz, err, isErr, isOk } from '@nanovnaweb/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSweepStore } from '../src/slices/sweep-store.js';
import { makeFakeIo } from './helpers/fake-io.js';

const params = {
  start: asHz(1_000_000),
  stop: asHz(900_000_000),
  points: 101,
};

const LAST_PARAMS_KEY = 'nanovnaweb.sweep.lastParams';

// In-memory Storage shim. Node 25 exposes a skeleton `globalThis.localStorage`
// without functional methods unless launched with `--localstorage-file`, so
// we can't rely on the runtime default here. Stubbing gives us a consistent
// Storage-compatible object regardless of Node version or jsdom presence.
function makeMemoryStorage(): Storage {
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? (data.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
  };
  return storage;
}

describe('SweepStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMemoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with null params, isStreaming=false, and no remembered lastParams', () => {
    const fake = makeFakeIo();
    const { store } = createSweepStore({ io: fake.io });
    expect(store.getState()).toEqual({ params: null, isStreaming: false, lastParams: null });
  });

  it('setParams calls io.setSweep and stores params on ok', async () => {
    const fake = makeFakeIo();
    const { store, actions } = createSweepStore({ io: fake.io });
    const r = await actions.setParams(params);
    expect(isOk(r)).toBe(true);
    expect(store.getState().params).toEqual(params);
    expect(fake.calls.setSweep[0]).toEqual(params);
  });

  it('setParams does NOT store params when io.setSweep fails', async () => {
    const fake = makeFakeIo();
    fake.setSweepResult(err({ kind: 'command-failed', message: 'bad sweep' }));
    const { store, actions } = createSweepStore({ io: fake.io });
    const r = await actions.setParams(params);
    expect(isErr(r)).toBe(true);
    expect(store.getState().params).toBeNull();
    expect(store.getState().lastParams).toBeNull();
  });

  it('startStream sets isStreaming=true on ok', async () => {
    const fake = makeFakeIo();
    const { store, actions } = createSweepStore({ io: fake.io });
    await actions.startStream();
    expect(store.getState().isStreaming).toBe(true);
    expect(fake.calls.startStream).toBe(1);
  });

  it('stopStream sets isStreaming=false on ok', async () => {
    const fake = makeFakeIo();
    const { store, actions } = createSweepStore({ io: fake.io });
    await actions.startStream();
    await actions.stopStream();
    expect(store.getState().isStreaming).toBe(false);
    expect(fake.calls.stopStream).toBe(1);
  });

  it('reset clears params and isStreaming but preserves lastParams', async () => {
    const fake = makeFakeIo();
    const { store, actions } = createSweepStore({ io: fake.io });
    await actions.setParams(params);
    await actions.startStream();
    actions.reset();
    expect(store.getState().params).toBeNull();
    expect(store.getState().isStreaming).toBe(false);
    // lastParams survives disconnect — the user's stimulus preferences
    // should not evaporate just because the device went away.
    expect(store.getState().lastParams).toEqual(params);
  });

  it('persists lastParams to localStorage on successful setParams', async () => {
    const fake = makeFakeIo();
    const { actions } = createSweepStore({ io: fake.io });
    await actions.setParams(params);
    const raw = globalThis.localStorage.getItem(LAST_PARAMS_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed).toEqual({
      start: Number(params.start),
      stop: Number(params.stop),
      points: params.points,
    });
  });

  it('rehydrates lastParams from localStorage on store init', () => {
    globalThis.localStorage.setItem(
      LAST_PARAMS_KEY,
      JSON.stringify({ start: 2_000_000, stop: 500_000_000, points: 201 }),
    );
    const fake = makeFakeIo();
    const { store } = createSweepStore({ io: fake.io });
    expect(store.getState().lastParams).toEqual({
      start: 2_000_000,
      stop: 500_000_000,
      points: 201,
    });
    expect(store.getState().params).toBeNull(); // not auto-applied to the device
  });

  it('ignores malformed localStorage payloads', () => {
    globalThis.localStorage.setItem(LAST_PARAMS_KEY, '{not valid json');
    const fake = makeFakeIo();
    const { store } = createSweepStore({ io: fake.io });
    expect(store.getState().lastParams).toBeNull();
  });

  it('rejects stored params that violate basic invariants (stop <= start, points < 2)', () => {
    globalThis.localStorage.setItem(
      LAST_PARAMS_KEY,
      JSON.stringify({ start: 500_000_000, stop: 1_000_000, points: 201 }),
    );
    const fake = makeFakeIo();
    const { store } = createSweepStore({ io: fake.io });
    expect(store.getState().lastParams).toBeNull();
  });

  it('failed setParams does NOT overwrite a previously-persisted lastParams', async () => {
    globalThis.localStorage.setItem(
      LAST_PARAMS_KEY,
      JSON.stringify({ start: 2_000_000, stop: 500_000_000, points: 201 }),
    );
    const fake = makeFakeIo();
    fake.setSweepResult(err({ kind: 'command-failed', message: 'bad sweep' }));
    const { store, actions } = createSweepStore({ io: fake.io });
    await actions.setParams(params);
    expect(store.getState().lastParams).toEqual({
      start: 2_000_000,
      stop: 500_000_000,
      points: 201,
    });
  });
});
