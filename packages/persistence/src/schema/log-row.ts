import type { LogEntry } from '@nanovnaweb/shared';
import { type LogRow, ROW_SCHEMA_VERSION_V1 } from '../db.js';

export function toLogRow(entry: LogEntry): LogRow {
  return {
    timestamp: entry.timestamp,
    level: entry.level,
    category: entry.category,
    message: entry.message,
    ...(entry.data !== undefined ? { dataJson: JSON.stringify(entry.data) } : {}),
    schemaVersion: ROW_SCHEMA_VERSION_V1,
  };
}

export function fromLogRow(row: LogRow): LogEntry {
  return Object.freeze({
    timestamp: row.timestamp,
    level: row.level,
    category: row.category,
    message: row.message,
    ...(row.dataJson !== undefined ? { data: JSON.parse(row.dataJson) as unknown } : {}),
  });
}
