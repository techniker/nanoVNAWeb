import { isErr, isOk } from '@nanovnaweb/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { NanoVnaWebDb, closeDatabase, openDatabase } from '../src/db.js';

const TEST_DB_NAME = 'nanovnaweb-test-lifecycle';

describe('openDatabase / closeDatabase', () => {
  afterEach(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(TEST_DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });

  it('opens a fresh database successfully', async () => {
    const r = await openDatabase({ name: TEST_DB_NAME });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value).toBeInstanceOf(NanoVnaWebDb);
      expect(r.value.name).toBe(TEST_DB_NAME);
      await closeDatabase(r.value);
    }
  });

  it('re-opening the same named database is idempotent', async () => {
    const first = await openDatabase({ name: TEST_DB_NAME });
    expect(isOk(first)).toBe(true);
    if (isOk(first)) await closeDatabase(first.value);
    const second = await openDatabase({ name: TEST_DB_NAME });
    expect(isOk(second)).toBe(true);
    if (isOk(second)) await closeDatabase(second.value);
  });

  it('closeDatabase is safe to call twice', async () => {
    const r = await openDatabase({ name: TEST_DB_NAME });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      await closeDatabase(r.value);
      // Second close should not throw
      await closeDatabase(r.value);
    }
  });

  it('returns database-unavailable err when IndexedDB is absent', async () => {
    const originalIdb = globalThis.indexedDB;
    (globalThis as { indexedDB?: IDBFactory }).indexedDB = undefined;
    try {
      const r = await openDatabase({ name: TEST_DB_NAME });
      expect(isErr(r)).toBe(true);
      if (isErr(r)) {
        expect(r.error.kind).toBe('database-unavailable');
      }
    } finally {
      globalThis.indexedDB = originalIdb;
    }
  });

  it('exposes the traces and logs tables on the db handle', async () => {
    const r = await openDatabase({ name: TEST_DB_NAME });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.traces).toBeDefined();
      expect(r.value.logs).toBeDefined();
      await closeDatabase(r.value);
    }
  });
});
