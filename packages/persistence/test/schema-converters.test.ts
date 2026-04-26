import { type Frame, type LogEntry, type TraceRecord, asHz } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { ROW_SCHEMA_VERSION_V1 } from '../src/db.js';
import { fromLogRow, toLogRow } from '../src/schema/log-row.js';
import { fromTraceRow, toTraceRow } from '../src/schema/trace-row.js';

function makeTrace(overrides: Partial<TraceRecord> = {}): TraceRecord {
  const frame: Frame = Object.freeze({
    sequence: 42,
    timestamp: 1_700_000_000_000,
    frequencies: Object.freeze([asHz(1_000_000), asHz(2_000_000)]),
    s11: Object.freeze([
      { re: 0.5, im: -0.3 },
      { re: 0.4, im: -0.2 },
    ]),
  });
  return {
    id: 'test-id',
    name: 'Test Trace',
    createdAt: 1_700_000_000_000,
    driverKind: 'v1',
    frame,
    tags: Object.freeze(['test']),
    ...overrides,
  };
}

describe('toTraceRow', () => {
  it('round-trips scalar fields', () => {
    const trace = makeTrace();
    const row = toTraceRow(trace);
    expect(row.id).toBe(trace.id);
    expect(row.name).toBe(trace.name);
    expect(row.createdAt).toBe(trace.createdAt);
    expect(row.driverKind).toBe('v1');
    expect(row.schemaVersion).toBe(ROW_SCHEMA_VERSION_V1);
  });

  it('serializes frame as JSON in frameJson', () => {
    const trace = makeTrace();
    const row = toTraceRow(trace);
    const parsed = JSON.parse(row.frameJson);
    expect(parsed.sequence).toBe(42);
    expect(parsed.s11).toHaveLength(2);
  });

  it('includes tags as array; empty array when absent', () => {
    const row1 = toTraceRow(makeTrace({ tags: Object.freeze(['a', 'b']) }));
    expect(row1.tags).toEqual(['a', 'b']);
    const row2 = toTraceRow(makeTrace({ tags: undefined }));
    expect(row2.tags).toEqual([]);
  });

  it('omits driverKind when absent on trace', () => {
    const row = toTraceRow(makeTrace({ driverKind: undefined }));
    expect(row.driverKind).toBeUndefined();
  });
});

describe('fromTraceRow', () => {
  it('round-trips a saved trace back to TraceRecord', () => {
    const trace = makeTrace();
    const row = toTraceRow(trace);
    const restored = fromTraceRow(row);
    expect(restored.id).toBe(trace.id);
    expect(restored.name).toBe(trace.name);
    expect(restored.driverKind).toBe('v1');
    expect(restored.frame.s11).toHaveLength(2);
    expect(restored.frame.s11[0]).toEqual({ re: 0.5, im: -0.3 });
    expect(restored.tags).toEqual(['test']);
  });

  it('produces a deep-frozen Frame', () => {
    const trace = makeTrace();
    const row = toTraceRow(trace);
    const restored = fromTraceRow(row);
    expect(Object.isFrozen(restored.frame)).toBe(true);
    expect(Object.isFrozen(restored.frame.frequencies)).toBe(true);
    expect(Object.isFrozen(restored.frame.s11)).toBe(true);
  });

  it('omits driverKind when row has no driverKind', () => {
    const row = toTraceRow(makeTrace({ driverKind: undefined }));
    const restored = fromTraceRow(row);
    expect(restored.driverKind).toBeUndefined();
  });

  it('omits tags when row has empty tags array', () => {
    const row = toTraceRow(makeTrace({ tags: undefined }));
    const restored = fromTraceRow(row);
    expect(restored.tags).toBeUndefined();
  });

  it('preserves s21 when present', () => {
    const s21Trace = makeTrace({
      frame: Object.freeze({
        sequence: 0,
        timestamp: 0,
        frequencies: Object.freeze([asHz(1_000_000)]),
        s11: Object.freeze([{ re: 0.5, im: 0 }]),
        s21: Object.freeze([{ re: 0.9, im: 0 }]),
      }),
    });
    const row = toTraceRow(s21Trace);
    const restored = fromTraceRow(row);
    expect(restored.frame.s21).toBeDefined();
    expect(restored.frame.s21).toHaveLength(1);
    expect(restored.frame.s21?.[0]).toEqual({ re: 0.9, im: 0 });
  });
});

describe('toLogRow / fromLogRow', () => {
  const entry: LogEntry = Object.freeze({
    level: 'info',
    category: 'io',
    message: 'test message',
    timestamp: 1_700_000_000_000,
    data: { foo: 'bar', n: 42 },
  });

  it('round-trips scalar fields', () => {
    const row = toLogRow(entry);
    expect(row.level).toBe('info');
    expect(row.category).toBe('io');
    expect(row.message).toBe('test message');
    expect(row.timestamp).toBe(1_700_000_000_000);
    expect(row.schemaVersion).toBe(ROW_SCHEMA_VERSION_V1);
  });

  it('serializes data as JSON when present', () => {
    const row = toLogRow(entry);
    expect(row.dataJson).toBeDefined();
    expect(JSON.parse(row.dataJson ?? 'null')).toEqual({ foo: 'bar', n: 42 });
  });

  it('omits dataJson when data is absent', () => {
    const e: LogEntry = Object.freeze({
      level: 'debug',
      category: 'ui',
      message: 'no data',
      timestamp: 1_700_000_000_000,
    });
    const row = toLogRow(e);
    expect(row.dataJson).toBeUndefined();
  });

  it('fromLogRow restores data when dataJson is present', () => {
    const row = toLogRow(entry);
    const restored = fromLogRow({ ...row, id: 1 });
    expect(restored.data).toEqual({ foo: 'bar', n: 42 });
  });

  it('fromLogRow sets data undefined when dataJson is absent', () => {
    const e: LogEntry = Object.freeze({
      level: 'debug',
      category: 'ui',
      message: 'no data',
      timestamp: 1_700_000_000_000,
    });
    const row = toLogRow(e);
    const restored = fromLogRow({ ...row, id: 1 });
    expect(restored.data).toBeUndefined();
  });
});
