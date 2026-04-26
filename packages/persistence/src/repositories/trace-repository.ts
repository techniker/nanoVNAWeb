import type { ParseError, ParseWarning } from '@nanovnaweb/formats';
import { type Result, type TraceRecord, err, ok } from '@nanovnaweb/shared';
import type { NanoVnaWebDb } from '../db.js';
import { PersistenceError } from '../errors.js';
import {
  buildTouchstoneExport,
  parseTouchstoneImport,
} from '../import-export/touchstone-bridge.js';
import { fromTraceRow, toTraceRow } from '../schema/trace-row.js';

export interface TraceRepository {
  save(trace: TraceRecord): Promise<Result<void, PersistenceError>>;
  getById(id: string): Promise<Result<TraceRecord | null, PersistenceError>>;
  listAll(opts?: {
    limit?: number;
    since?: number;
  }): Promise<Result<readonly TraceRecord[], PersistenceError>>;
  listByTag(tag: string): Promise<Result<readonly TraceRecord[], PersistenceError>>;
  delete(id: string): Promise<Result<void, PersistenceError>>;
  clear(): Promise<Result<void, PersistenceError>>;
  importTouchstone(
    blob: Blob,
    opts?: { suggestedName?: string },
  ): Promise<
    Result<{ trace: TraceRecord; warnings: readonly ParseWarning[] }, PersistenceError | ParseError>
  >;
  exportTouchstone(id: string): Promise<Result<ReadableStream<Uint8Array>, PersistenceError>>;
}

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

export function createTraceRepository(db: NanoVnaWebDb): TraceRepository {
  const self: TraceRepository = {
    async save(trace) {
      try {
        await db.traces.put(toTraceRow(trace));
        return ok(undefined);
      } catch (cause) {
        return err(wrapDexieError('save', cause));
      }
    },

    async getById(id) {
      try {
        const row = await db.traces.get(id);
        return ok(row ? fromTraceRow(row) : null);
      } catch (cause) {
        return err(wrapDexieError('getById', cause));
      }
    },

    async listAll(opts) {
      try {
        let coll =
          opts?.since !== undefined
            ? db.traces.where('createdAt').aboveOrEqual(opts.since).reverse()
            : db.traces.orderBy('createdAt').reverse();
        if (opts?.limit !== undefined) {
          coll = coll.limit(opts.limit);
        }
        const rows = await coll.toArray();
        return ok(Object.freeze(rows.map(fromTraceRow)));
      } catch (cause) {
        return err(wrapDexieError('listAll', cause));
      }
    },

    async listByTag(tag) {
      try {
        const rows = await db.traces.where('tags').equals(tag).toArray();
        return ok(Object.freeze(rows.map(fromTraceRow)));
      } catch (cause) {
        return err(wrapDexieError('listByTag', cause));
      }
    },

    async delete(id) {
      try {
        await db.traces.delete(id);
        return ok(undefined);
      } catch (cause) {
        return err(wrapDexieError('delete', cause));
      }
    },

    async clear() {
      try {
        await db.traces.clear();
        return ok(undefined);
      } catch (cause) {
        return err(wrapDexieError('clear', cause));
      }
    },

    async importTouchstone(blob, opts) {
      const parseResult = await parseTouchstoneImport(blob, opts);
      if (parseResult.kind === 'err') return parseResult;
      const trace = parseResult.value.trace;
      const saveResult = await self.save(trace);
      if (saveResult.kind === 'err') return saveResult;
      return ok({ trace, warnings: parseResult.value.warnings });
    },

    async exportTouchstone(id) {
      const found = await self.getById(id);
      if (found.kind === 'err') return found;
      if (found.value === null) {
        return err(new PersistenceError('not-found', `trace ${id} not found`));
      }
      return ok(buildTouchstoneExport(found.value));
    },
  };
  return self;
}
