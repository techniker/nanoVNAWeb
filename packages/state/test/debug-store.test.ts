import { type LogEntry, isOk } from '@nanovnaweb/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebugStore } from '../src/slices/debug-store.js';
import { makeFakeLogRepo } from './helpers/fake-repos.js';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return Object.freeze({
    level: 'info',
    category: 'io',
    message: 'hello',
    timestamp: Date.now(),
    ...overrides,
  });
}

describe('DebugStore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts empty, flushActive=false', () => {
    const repo = makeFakeLogRepo();
    const { store } = createDebugStore({ logRepo: repo });
    expect(store.getState()).toEqual({ recent: [], flushActive: false });
  });

  it('append adds to ring (recent)', () => {
    const repo = makeFakeLogRepo();
    const { store, actions } = createDebugStore({ logRepo: repo });
    actions.append(makeEntry({ message: 'one' }));
    actions.append(makeEntry({ message: 'two' }));
    expect(store.getState().recent.map((e) => e.message)).toEqual(['one', 'two']);
  });

  it('ring caps at 10000 entries', () => {
    const repo = makeFakeLogRepo();
    const { store, actions } = createDebugStore({ logRepo: repo });
    for (let i = 0; i < 10050; i++) {
      actions.append(makeEntry({ message: `${i}`, timestamp: i }));
    }
    const recent = store.getState().recent;
    expect(recent).toHaveLength(10000);
    // Oldest preserved should be index 50 (0..49 dropped)
    expect(recent[0]?.message).toBe('50');
  });

  it('internal _appendLocal adds to ring AND pending buffer (drains on flush)', () => {
    const repo = makeFakeLogRepo();
    const { store, internal, actions } = createDebugStore({ logRepo: repo });
    internal._appendLocal(makeEntry({ message: 'worker-log' }));
    // Ring populated
    expect(store.getState().recent).toHaveLength(1);
    // Start flush; tick drains the buffer into repo
    actions.startFlush(500);
    vi.advanceTimersByTime(500);
    expect(repo.snapshot()).toHaveLength(1);
    actions.stopFlush();
  });

  it('startFlush activates timer and drains appended entries on tick', () => {
    const repo = makeFakeLogRepo();
    const { store, actions } = createDebugStore({ logRepo: repo });
    actions.startFlush(500);
    expect(store.getState().flushActive).toBe(true);
    actions.append(makeEntry({ message: 'drain-me' }));
    vi.advanceTimersByTime(500);
    // Drained to repo
    expect(repo.snapshot()).toHaveLength(1);
    actions.stopFlush();
  });

  it('stopFlush clears flushActive', () => {
    const repo = makeFakeLogRepo();
    const { store, actions } = createDebugStore({ logRepo: repo });
    actions.startFlush(500);
    actions.stopFlush();
    expect(store.getState().flushActive).toBe(false);
  });

  it('clear empties the ring', () => {
    const repo = makeFakeLogRepo();
    const { store, actions } = createDebugStore({ logRepo: repo });
    actions.append(makeEntry({ message: 'x' }));
    actions.clear();
    expect(store.getState().recent).toEqual([]);
  });

  it('listStored delegates to repo', async () => {
    const repo = makeFakeLogRepo();
    await repo.appendBatch([makeEntry({ message: 's' })]);
    const { actions } = createDebugStore({ logRepo: repo });
    const r = await actions.listStored(10);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toHaveLength(1);
  });

  it('clearStored delegates to repo.clear', async () => {
    const repo = makeFakeLogRepo();
    await repo.appendBatch([makeEntry({ message: 'x' })]);
    const { actions } = createDebugStore({ logRepo: repo });
    const r = await actions.clearStored();
    expect(isOk(r)).toBe(true);
    expect(repo.snapshot()).toHaveLength(0);
  });
});
