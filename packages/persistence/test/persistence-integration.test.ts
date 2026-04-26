import { isOk } from '@nanovnaweb/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { closeDatabase, createTraceRepository, openDatabase } from '../src/index.js';

const TEST_DB_NAME = 'nanovnaweb-test-integration';

const SAMPLE_S2P = `# Hz S MA R 50
1000000   0.100000   0.000000   0.800000   0.000000   0.000000   0.000000   0.000000   0.000000
2000000   0.150000  10.000000   0.750000  -5.000000   0.000000   0.000000   0.000000   0.000000
`;

describe('persistence integration', () => {
  afterEach(async () => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(TEST_DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });

  it('import Touchstone → listAll → exportTouchstone → re-parse', async () => {
    const dbR = await openDatabase({ name: TEST_DB_NAME });
    expect(isOk(dbR)).toBe(true);
    if (!isOk(dbR)) return;
    const db = dbR.value;
    const repo = createTraceRepository(db);

    const blob = new Blob([SAMPLE_S2P]);
    const importR = await repo.importTouchstone(blob, { suggestedName: 'Sample' });
    expect(isOk(importR)).toBe(true);
    if (!isOk(importR)) {
      await closeDatabase(db);
      return;
    }
    const trace = importR.value.trace;
    expect(trace.name).toBe('Sample');
    expect(trace.frame.frequencies).toHaveLength(2);
    expect(trace.frame.s21).toBeDefined();

    const listR = await repo.listAll();
    expect(isOk(listR)).toBe(true);
    if (isOk(listR)) expect(listR.value).toHaveLength(1);

    const exportR = await repo.exportTouchstone(trace.id);
    expect(isOk(exportR)).toBe(true);
    if (isOk(exportR)) {
      const reader = exportR.value.getReader();
      let text = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += new TextDecoder().decode(value);
      }
      expect(text).toContain('# Hz S MA R 50');
      expect(text).toMatch(/^1000000\b/m);
      expect(text).toMatch(/^2000000\b/m);
    }

    await repo.delete(trace.id);
    const afterDelete = await repo.listAll();
    if (isOk(afterDelete)) expect(afterDelete.value).toEqual([]);

    await closeDatabase(db);
  });
});
