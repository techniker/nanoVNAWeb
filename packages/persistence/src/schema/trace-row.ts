import type { Complex, Frame, TraceRecord } from '@nanovnaweb/shared';
import { ROW_SCHEMA_VERSION_V1, type TraceRow } from '../db.js';

export function toTraceRow(trace: TraceRecord): TraceRow {
  return {
    id: trace.id,
    name: trace.name,
    createdAt: trace.createdAt,
    ...(trace.driverKind !== undefined ? { driverKind: trace.driverKind } : {}),
    frameJson: JSON.stringify(trace.frame),
    tags: trace.tags ? [...trace.tags] : [],
    schemaVersion: ROW_SCHEMA_VERSION_V1,
  };
}

export function fromTraceRow(row: TraceRow): TraceRecord {
  const frameRaw = JSON.parse(row.frameJson) as {
    sequence: number;
    timestamp: number;
    frequencies: readonly number[];
    s11: readonly Complex[];
    s21?: readonly Complex[];
  };
  const frame: Frame = Object.freeze({
    sequence: frameRaw.sequence,
    timestamp: frameRaw.timestamp,
    frequencies: Object.freeze([...frameRaw.frequencies]) as Frame['frequencies'],
    s11: Object.freeze([...frameRaw.s11]),
    ...(frameRaw.s21 ? { s21: Object.freeze([...frameRaw.s21]) } : {}),
  });
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    ...(row.driverKind !== undefined ? { driverKind: row.driverKind } : {}),
    frame,
    ...(row.tags.length > 0 ? { tags: Object.freeze([...row.tags]) } : {}),
  };
}
