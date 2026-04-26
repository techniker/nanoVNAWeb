import { type Result, err, ok } from '@nanovnaweb/shared';
import Dexie, { type Table } from 'dexie';
import { PersistenceError } from './errors.js';

export interface TraceRow {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly driverKind?: 'v1' | 'v2';
  readonly frameJson: string;
  readonly tags: readonly string[];
  readonly schemaVersion: number;
}

export interface LogRow {
  readonly id?: number;
  readonly timestamp: number;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly category: string;
  readonly message: string;
  readonly dataJson?: string;
  readonly schemaVersion: number;
}

export class NanoVnaWebDb extends Dexie {
  traces!: Table<TraceRow, string>;
  logs!: Table<LogRow, number>;

  constructor(name = 'nanovnaweb') {
    super(name);
    this.version(1).stores({
      traces: 'id, name, createdAt, *tags, driverKind',
      logs: '++id, timestamp, level, category',
    });
  }
}

export const DB_NAME_DEFAULT = 'nanovnaweb';
export const ROW_SCHEMA_VERSION_V1 = 1;

export async function openDatabase(opts?: { name?: string }): Promise<
  Result<NanoVnaWebDb, PersistenceError>
> {
  if (typeof globalThis === 'undefined' || typeof globalThis.indexedDB === 'undefined') {
    return err(new PersistenceError('database-unavailable', 'IndexedDB not available'));
  }
  const db = new NanoVnaWebDb(opts?.name ?? DB_NAME_DEFAULT);
  try {
    await db.open();
    return ok(db);
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'VersionError') {
      return err(new PersistenceError('migration-failed', cause.message, cause));
    }
    if (cause instanceof Error && cause.name === 'QuotaExceededError') {
      return err(new PersistenceError('quota-exceeded', cause.message, cause));
    }
    return err(new PersistenceError('database-unavailable', 'failed to open database', cause));
  }
}

export async function closeDatabase(db: NanoVnaWebDb): Promise<void> {
  try {
    db.close();
  } catch {
    /* ignore */
  }
}
