import { type LogEntry, isOk } from '@nanovnaweb/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type NanoVnaWebDb, closeDatabase, openDatabase } from '../src/db.js';
import { type LogRepository, createLogRepository } from '../src/repositories/log-repository.js';

const TEST_DB_NAME = 'nanovnaweb-test-log-repo';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return Object.freeze({
    level: 'info',
    category: 'io',
    message: 'hello',
    timestamp: Date.now(),
    ...overrides,
  });
}

describe('LogRepository', () => {
  let db: NanoVnaWebDb;
  let repo: LogRepository;

  beforeEach(async () => {
    const r = await openDatabase({ name: TEST_DB_NAME });
    if (r.kind === 'err') throw new Error('failed to open test db');
    db = r.value;
    repo = createLogRepository(db);
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

  it('append + listRecent roundtrip', async () => {
    await repo.append(makeEntry({ message: 'one' }));
    await repo.append(makeEntry({ message: 'two', timestamp: Date.now() + 1 }));
    const got = await repo.listRecent(10);
    expect(isOk(got)).toBe(true);
    if (isOk(got)) {
      expect(got.value.map((e) => e.message)).toEqual(['two', 'one']);
    }
  });

  it('appendBatch writes multiple entries', async () => {
    const entries = [
      makeEntry({ message: 'a', timestamp: 1 }),
      makeEntry({ message: 'b', timestamp: 2 }),
      makeEntry({ message: 'c', timestamp: 3 }),
    ];
    await repo.appendBatch(entries);
    const got = await repo.listRecent(10);
    expect(isOk(got)).toBe(true);
    if (isOk(got)) {
      expect(got.value.map((e) => e.message)).toEqual(['c', 'b', 'a']);
    }
  });

  it('listByLevel filters correctly', async () => {
    await repo.append(makeEntry({ level: 'info', message: 'i', timestamp: 1 }));
    await repo.append(makeEntry({ level: 'warn', message: 'w', timestamp: 2 }));
    await repo.append(makeEntry({ level: 'error', message: 'e', timestamp: 3 }));
    const got = await repo.listByLevel('warn', 10);
    expect(isOk(got)).toBe(true);
    if (isOk(got)) {
      expect(got.value.map((e) => e.message)).toEqual(['w']);
    }
  });

  it('clear empties the table', async () => {
    await repo.append(makeEntry({ message: 'x' }));
    await repo.clear();
    const got = await repo.listRecent(10);
    expect(isOk(got)).toBe(true);
    if (isOk(got)) expect(got.value).toEqual([]);
  });

  it('retention preserves newest entries when count exceeds cap', async () => {
    // We'll mock the cap to 5 for this test by creating a repo with a
    // custom retentionCap parameter. See implementation: createLogRepository
    // takes an optional { retentionCap?: number } second arg.
    const smallRepo = createLogRepository(db, { retentionCap: 5 });
    const batch: LogEntry[] = [];
    for (let i = 0; i < 8; i++) {
      batch.push(makeEntry({ message: `msg${i}`, timestamp: i }));
    }
    await smallRepo.appendBatch(batch);
    const got = await smallRepo.listRecent(10);
    expect(isOk(got)).toBe(true);
    if (isOk(got)) {
      // Newest 5 preserved: msg3..msg7 (in reverse timestamp order)
      expect(got.value.map((e) => e.message)).toEqual(['msg7', 'msg6', 'msg5', 'msg4', 'msg3']);
    }
  });

  it('startAutoFlush calls produce on interval', async () => {
    vi.useFakeTimers();
    const produce = vi.fn(() => [makeEntry({ message: 'auto' })]);
    const handle = repo.startAutoFlush(1000, produce);
    expect(handle.active).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(produce).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(produce).toHaveBeenCalledTimes(2);
    handle.stop();
    vi.useRealTimers();
  });

  it('stop() prevents further produce calls', async () => {
    vi.useFakeTimers();
    const produce = vi.fn(() => [] as readonly LogEntry[]);
    const handle = repo.startAutoFlush(1000, produce);
    handle.stop();
    expect(handle.active).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(produce).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('stop() is idempotent', async () => {
    vi.useFakeTimers();
    const produce = vi.fn(() => [] as readonly LogEntry[]);
    const handle = repo.startAutoFlush(1000, produce);
    handle.stop();
    handle.stop();
    expect(handle.active).toBe(false);
    vi.useRealTimers();
  });

  it('append is fire-and-forget — errors do not throw', async () => {
    // Close the db first so any subsequent append throws internally
    await closeDatabase(db);
    // append should NOT throw even though db is closed
    await expect(repo.append(makeEntry())).resolves.toBeUndefined();
    // Re-open for afterEach cleanup
    const r = await openDatabase({ name: TEST_DB_NAME });
    if (r.kind === 'ok') db = r.value;
  });
});
