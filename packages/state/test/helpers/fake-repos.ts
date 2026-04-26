import type { ParseError, ParseWarning } from '@nanovnaweb/formats';
import type {
  LogAutoFlushHandle,
  LogRepository,
  PersistenceError,
  TraceRepository,
} from '@nanovnaweb/persistence';
import { type LogEntry, type Result, type TraceRecord, err, ok } from '@nanovnaweb/shared';

export function makeFakeTraceRepo(): TraceRepository & {
  readonly snapshot: () => readonly TraceRecord[];
  readonly importResult: (
    r: Result<
      { trace: TraceRecord; warnings: readonly ParseWarning[] },
      PersistenceError | ParseError
    >,
  ) => void;
} {
  const byId = new Map<string, TraceRecord>();
  let nextImportResult: Result<
    { trace: TraceRecord; warnings: readonly ParseWarning[] },
    PersistenceError | ParseError
  > | null = null;

  return {
    async save(trace) {
      byId.set(trace.id, trace);
      return ok(undefined);
    },
    async getById(id) {
      return ok(byId.get(id) ?? null);
    },
    async listAll(opts) {
      const all = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
      const filtered =
        opts?.since !== undefined ? all.filter((t) => t.createdAt >= (opts?.since ?? 0)) : all;
      const limited = opts?.limit !== undefined ? filtered.slice(0, opts.limit) : filtered;
      return ok(Object.freeze([...limited]));
    },
    async listByTag(tag) {
      const out = [...byId.values()].filter((t) => t.tags?.includes(tag) ?? false);
      return ok(Object.freeze(out));
    },
    async delete(id) {
      byId.delete(id);
      return ok(undefined);
    },
    async clear() {
      byId.clear();
      return ok(undefined);
    },
    async importTouchstone(_blob, _opts) {
      if (nextImportResult !== null) {
        const r = nextImportResult;
        nextImportResult = null;
        if (r.kind === 'ok') byId.set(r.value.trace.id, r.value.trace);
        return r;
      }
      return err({
        kind: 'unknown' as const,
        message: 'importTouchstone not scripted',
      } as PersistenceError);
    },
    async exportTouchstone(id) {
      if (!byId.has(id)) {
        return err({ kind: 'not-found', message: `trace ${id} not found` } as PersistenceError);
      }
      return ok(
        new ReadableStream<Uint8Array>({
          start(c) {
            c.close();
          },
        }),
      );
    },
    snapshot: () => Object.freeze([...byId.values()]),
    importResult: (r) => {
      nextImportResult = r;
    },
  };
}

export function makeFakeLogRepo(): LogRepository & {
  readonly snapshot: () => readonly LogEntry[];
} {
  const entries: LogEntry[] = [];
  return {
    async append(entry) {
      entries.push(entry);
    },
    async appendBatch(batch) {
      entries.push(...batch);
    },
    async listRecent(limit) {
      const recent = [...entries].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
      return ok(Object.freeze(recent));
    },
    async listByLevel(level, limit) {
      const filtered = [...entries]
        .filter((e) => e.level === level)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
      return ok(Object.freeze(filtered));
    },
    async clear() {
      entries.length = 0;
      return ok(undefined);
    },
    startAutoFlush(intervalMs, produce) {
      let active = true;
      const handle = setInterval(() => {
        if (!active) return;
        const batch = produce();
        if (batch.length > 0) entries.push(...batch);
      }, intervalMs);
      const autoFlush: LogAutoFlushHandle = {
        stop() {
          if (!active) return;
          active = false;
          clearInterval(handle);
        },
        get active() {
          return active;
        },
      };
      return autoFlush;
    },
    snapshot: () => Object.freeze([...entries]),
  };
}
