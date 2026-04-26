import { type LogEntry, type Result, err, ok } from '@nanovnaweb/shared';
import type { NanoVnaWebDb } from '../db.js';
import { PersistenceError } from '../errors.js';
import { fromLogRow, toLogRow } from '../schema/log-row.js';

export interface LogAutoFlushHandle {
  stop(): void;
  readonly active: boolean;
}

export interface LogRepository {
  append(entry: LogEntry): Promise<void>;
  appendBatch(entries: readonly LogEntry[]): Promise<void>;
  listRecent(limit: number): Promise<Result<readonly LogEntry[], PersistenceError>>;
  listByLevel(
    level: LogEntry['level'],
    limit: number,
  ): Promise<Result<readonly LogEntry[], PersistenceError>>;
  clear(): Promise<Result<void, PersistenceError>>;
  startAutoFlush(intervalMs: number, produce: () => readonly LogEntry[]): LogAutoFlushHandle;
}

const DEFAULT_LOG_RETENTION_CAP = 50_000;
const APPEND_RETENTION_STRIDE = 100;

function wrapDexieError(op: string, cause: unknown): PersistenceError {
  if (cause instanceof Error) {
    if (cause.name === 'QuotaExceededError') {
      return new PersistenceError('quota-exceeded', `${op}: ${cause.message}`, cause);
    }
    if (cause.name === 'DatabaseClosedError' || cause.name === 'InvalidStateError') {
      return new PersistenceError('database-closed', `${op}: ${cause.message}`, cause);
    }
  }
  return new PersistenceError('unknown', `${op} failed`, cause);
}

export function createLogRepository(
  db: NanoVnaWebDb,
  opts?: { retentionCap?: number },
): LogRepository {
  const retentionCap = opts?.retentionCap ?? DEFAULT_LOG_RETENTION_CAP;
  let appendStrideCounter = 0;

  async function enforceRetention(): Promise<void> {
    try {
      const count = await db.logs.count();
      if (count <= retentionCap) return;
      const excess = count - retentionCap;
      const oldestIds = await db.logs.orderBy('id').limit(excess).primaryKeys();
      await db.logs.bulkDelete(oldestIds);
    } catch {
      /* best-effort */
    }
  }

  const self: LogRepository = {
    async append(entry) {
      try {
        await db.logs.add(toLogRow(entry));
        appendStrideCounter++;
        if (appendStrideCounter % APPEND_RETENTION_STRIDE === 0) {
          void enforceRetention();
        }
      } catch (cause) {
        console.warn('LogRepository.append failed', cause);
      }
    },

    async appendBatch(entries) {
      if (entries.length === 0) return;
      try {
        await db.logs.bulkAdd(entries.map(toLogRow));
        await enforceRetention();
      } catch (cause) {
        console.warn('LogRepository.appendBatch failed', cause);
      }
    },

    async listRecent(limit) {
      try {
        const rows = await db.logs.orderBy('timestamp').reverse().limit(limit).toArray();
        return ok(Object.freeze(rows.map(fromLogRow)));
      } catch (cause) {
        return err(wrapDexieError('listRecent', cause));
      }
    },

    async listByLevel(level, limit) {
      try {
        // Entries with the same level are tied on the secondary index;
        // Dexie tie-breaks on the primary key (auto-increment id), so
        // .reverse() yields most-recently-inserted first for a given level.
        const rows = await db.logs.where('level').equals(level).reverse().limit(limit).toArray();
        return ok(Object.freeze(rows.map(fromLogRow)));
      } catch (cause) {
        return err(wrapDexieError('listByLevel', cause));
      }
    },

    async clear() {
      try {
        await db.logs.clear();
        return ok(undefined);
      } catch (cause) {
        return err(wrapDexieError('clear', cause));
      }
    },

    startAutoFlush(intervalMs, produce) {
      let active = true;
      const tick = async (): Promise<void> => {
        if (!active) return;
        const batch = produce();
        if (batch.length > 0) {
          try {
            await self.appendBatch(batch);
          } catch {
            /* silenced */
          }
        }
      };
      const handle = setInterval(() => void tick(), intervalMs);
      return {
        stop() {
          if (!active) return;
          active = false;
          clearInterval(handle);
        },
        get active() {
          return active;
        },
      };
    },
  };

  return self;
}
