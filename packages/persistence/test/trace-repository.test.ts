import { type Frame, type TraceRecord, asHz, isErr, isOk } from '@nanovnaweb/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type NanoVnaWebDb, closeDatabase, openDatabase } from '../src/db.js';
import {
  type TraceRepository,
  createTraceRepository,
} from '../src/repositories/trace-repository.js';

const TEST_DB_NAME = 'nanovnaweb-test-trace-repo';

function makeTrace(overrides: Partial<TraceRecord> = {}): TraceRecord {
  const frame: Frame = Object.freeze({
    sequence: 0,
    timestamp: Date.now(),
    frequencies: Object.freeze([asHz(1_000_000), asHz(2_000_000)]),
    s11: Object.freeze([
      { re: 0.5, im: -0.3 },
      { re: 0.4, im: -0.2 },
    ]),
  });
  return {
    id: `trace-${Math.random().toString(36).slice(2)}`,
    name: 'Test Trace',
    createdAt: Date.now(),
    driverKind: 'v1',
    frame,
    tags: Object.freeze(['test']),
    ...overrides,
  };
}

describe('TraceRepository', () => {
  let db: NanoVnaWebDb;
  let repo: TraceRepository;

  beforeEach(async () => {
    const r = await openDatabase({ name: TEST_DB_NAME });
    if (r.kind === 'err') throw new Error('failed to open test db');
    db = r.value;
    repo = createTraceRepository(db);
  });

  afterEach(async () => {
    await closeDatabase(db);
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(TEST_DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });

  it('save + getById roundtrip', async () => {
    const trace = makeTrace();
    await repo.save(trace);
    const got = await repo.getById(trace.id);
    expect(isOk(got)).toBe(true);
    if (isOk(got) && got.value) {
      expect(got.value.id).toBe(trace.id);
      expect(got.value.frame.s11).toHaveLength(2);
    }
  });

  it('save is upsert — re-saving updates', async () => {
    const trace = makeTrace({ name: 'Original' });
    await repo.save(trace);
    await repo.save({ ...trace, name: 'Updated' });
    const got = await repo.getById(trace.id);
    expect(isOk(got)).toBe(true);
    if (isOk(got) && got.value) {
      expect(got.value.name).toBe('Updated');
    }
  });

  it('getById returns null for missing id', async () => {
    const got = await repo.getById('does-not-exist');
    expect(isOk(got)).toBe(true);
    if (isOk(got)) expect(got.value).toBeNull();
  });

  it('listAll returns traces in reverse createdAt order', async () => {
    const t1 = makeTrace({ id: 't1', createdAt: 1000 });
    const t2 = makeTrace({ id: 't2', createdAt: 2000 });
    const t3 = makeTrace({ id: 't3', createdAt: 3000 });
    await repo.save(t1);
    await repo.save(t2);
    await repo.save(t3);
    const got = await repo.listAll();
    expect(isOk(got)).toBe(true);
    if (isOk(got)) {
      expect(got.value.map((t) => t.id)).toEqual(['t3', 't2', 't1']);
    }
  });

  it('listAll respects limit', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.save(makeTrace({ id: `t${i}`, createdAt: i * 1000 }));
    }
    const got = await repo.listAll({ limit: 2 });
    expect(isOk(got)).toBe(true);
    if (isOk(got)) {
      expect(got.value).toHaveLength(2);
    }
  });

  it('listAll respects since', async () => {
    await repo.save(makeTrace({ id: 'old', createdAt: 100 }));
    await repo.save(makeTrace({ id: 'new', createdAt: 5000 }));
    const got = await repo.listAll({ since: 1000 });
    expect(isOk(got)).toBe(true);
    if (isOk(got)) {
      expect(got.value.map((t) => t.id)).toEqual(['new']);
    }
  });

  it('listByTag filters correctly', async () => {
    await repo.save(makeTrace({ id: 'a', tags: Object.freeze(['alpha']) }));
    await repo.save(makeTrace({ id: 'b', tags: Object.freeze(['beta']) }));
    await repo.save(makeTrace({ id: 'ab', tags: Object.freeze(['alpha', 'beta']) }));
    const got = await repo.listByTag('alpha');
    expect(isOk(got)).toBe(true);
    if (isOk(got)) {
      expect(got.value.map((t) => t.id).sort()).toEqual(['a', 'ab']);
    }
  });

  it('delete removes a trace', async () => {
    const trace = makeTrace();
    await repo.save(trace);
    await repo.delete(trace.id);
    const got = await repo.getById(trace.id);
    expect(isOk(got)).toBe(true);
    if (isOk(got)) expect(got.value).toBeNull();
  });

  it('clear empties the table', async () => {
    await repo.save(makeTrace({ id: 'a' }));
    await repo.save(makeTrace({ id: 'b' }));
    await repo.clear();
    const got = await repo.listAll();
    expect(isOk(got)).toBe(true);
    if (isOk(got)) expect(got.value).toEqual([]);
  });

  it('retrieved Frame is deep-frozen', async () => {
    const trace = makeTrace();
    await repo.save(trace);
    const got = await repo.getById(trace.id);
    if (isOk(got) && got.value) {
      expect(Object.isFrozen(got.value.frame)).toBe(true);
      expect(Object.isFrozen(got.value.frame.s11)).toBe(true);
    }
  });

  it('importTouchstone saves the parsed trace', async () => {
    const blob = new Blob(['# Hz S MA R 50\n1000000  0.5  -45\n']);
    const r = await repo.importTouchstone(blob);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.frame.frequencies[0]).toBe(1_000_000);
      const all = await repo.listAll();
      if (isOk(all)) expect(all.value).toHaveLength(1);
    }
  });

  it('importTouchstone returns ParseError on malformed input', async () => {
    const blob = new Blob(['garbage']);
    const r = await repo.importTouchstone(blob);
    expect(isErr(r)).toBe(true);
  });

  it('importTouchstone returns warnings array alongside saved trace', async () => {
    // RI format triggers format-variant-converted warning
    const blob = new Blob(['# Hz S RI R 50\n1000000  1.0  0.0\n']);
    const r = await repo.importTouchstone(blob);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.warnings.some((w) => w.kind === 'format-variant-converted')).toBe(true);
    }
  });

  it('exportTouchstone returns a stream whose bytes re-parse', async () => {
    const trace = makeTrace();
    await repo.save(trace);
    const streamR = await repo.exportTouchstone(trace.id);
    expect(isOk(streamR)).toBe(true);
    if (isOk(streamR)) {
      const reader = streamR.value.getReader();
      let text = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += new TextDecoder().decode(value);
      }
      expect(text).toContain('# Hz S MA R 50');
    }
  });

  it('exportTouchstone returns not-found for missing id', async () => {
    const r = await repo.exportTouchstone('does-not-exist');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect((r.error as { kind: string }).kind).toBe('not-found');
    }
  });
});
