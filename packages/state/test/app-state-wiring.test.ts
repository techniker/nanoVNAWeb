import { type Frame, type LogEntry, asHz } from '@nanovnaweb/shared';
import { describe, expect, it, vi } from 'vitest';
import { createAppState } from '../src/app-state.js';
import { makeFakeIo } from './helpers/fake-io.js';
import { makeFakeLogRepo, makeFakeTraceRepo } from './helpers/fake-repos.js';

function makeFrame(): Frame {
  return Object.freeze({
    sequence: 0,
    timestamp: Date.now(),
    frequencies: Object.freeze([asHz(1_000_000)]),
    s11: Object.freeze([{ re: 0.5, im: 0 }]),
  });
}

function makeLog(): LogEntry {
  return Object.freeze({
    level: 'info',
    category: 'test',
    message: 'log entry',
    timestamp: Date.now(),
  });
}

describe('createAppState wiring', () => {
  it('wires io.onStatus to connection._updateStatus', async () => {
    const fake = makeFakeIo();
    const app = await createAppState({
      io: fake.io,
      traceRepo: makeFakeTraceRepo(),
      logRepo: makeFakeLogRepo(),
    });
    fake.emitStatus({ state: 'connecting' });
    expect(app.stores.connection.store.getState().status).toEqual({ state: 'connecting' });
    await app.dispose();
  });

  it('wires io.onFrame to live._ingestFrame', async () => {
    const fake = makeFakeIo();
    const app = await createAppState({
      io: fake.io,
      traceRepo: makeFakeTraceRepo(),
      logRepo: makeFakeLogRepo(),
    });
    fake.emitFrame(makeFrame());
    expect(app.stores.live.store.getState().latestFrame).not.toBeNull();
    expect(app.stores.live.store.getState().frameCount).toBe(1);
    await app.dispose();
  });

  it('wires io.onLog to debug._appendLocal', async () => {
    const fake = makeFakeIo();
    const app = await createAppState({
      io: fake.io,
      traceRepo: makeFakeTraceRepo(),
      logRepo: makeFakeLogRepo(),
    });
    fake.emitLog(makeLog());
    expect(app.stores.debug.store.getState().recent).toHaveLength(1);
    await app.dispose();
  });

  it('dispose unsubscribes — subsequent emits do not update state', async () => {
    const fake = makeFakeIo();
    const app = await createAppState({
      io: fake.io,
      traceRepo: makeFakeTraceRepo(),
      logRepo: makeFakeLogRepo(),
    });
    await app.dispose();
    fake.emitFrame(makeFrame());
    expect(app.stores.live.store.getState().latestFrame).toBeNull();
  });

  it('dispose() stops the debug-store auto-flush', async () => {
    const fake = makeFakeIo();
    const app = await createAppState({
      io: fake.io,
      traceRepo: makeFakeTraceRepo(),
      logRepo: makeFakeLogRepo(),
    });
    app.stores.debug.actions.startFlush(1000);
    expect(app.stores.debug.store.getState().flushActive).toBe(true);
    await app.dispose();
    expect(app.stores.debug.store.getState().flushActive).toBe(false);
  });

  it('hydrate populates trace store on creation', async () => {
    const fake = makeFakeIo();
    const traceRepo = makeFakeTraceRepo();
    await traceRepo.save({
      id: 'a',
      name: 'pre-hydrated',
      createdAt: Date.now(),
      driverKind: 'v1',
      frame: makeFrame(),
    });
    const app = await createAppState({
      io: fake.io,
      traceRepo,
      logRepo: makeFakeLogRepo(),
    });
    // Hydrate runs asynchronously; allow it to settle
    await vi.waitFor(() => {
      expect(app.stores.trace.store.getState().recorded).toHaveLength(1);
    });
    await app.dispose();
  });
});
