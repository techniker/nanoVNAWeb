import { asHz } from '@nanovnaweb/shared';
import type { Frame, TraceRecord } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { writeTouchstoneString } from '../src/touchstone/writer.js';

function makeTrace(opts: {
  name?: string;
  driverKind?: 'v1' | 'v2';
  s11: [number, number][];
  s21?: [number, number][];
  freqs: number[];
}): TraceRecord {
  const frame: Frame = Object.freeze({
    sequence: 0,
    timestamp: 0,
    frequencies: Object.freeze(opts.freqs.map(asHz)),
    s11: Object.freeze(opts.s11.map(([re, im]) => ({ re, im }))),
    ...(opts.s21 ? { s21: Object.freeze(opts.s21.map(([re, im]) => ({ re, im }))) } : {}),
  });
  return {
    id: 'test-id',
    name: opts.name ?? 'Test Trace',
    createdAt: 0,
    frame,
    ...(opts.driverKind ? { driverKind: opts.driverKind } : {}),
  };
}

describe('writeTouchstoneString', () => {
  it('emits canonical 1-port output', () => {
    const out = writeTouchstoneString(makeTrace({ freqs: [1_000_000], s11: [[1, 0]] }));
    const lines = out.trim().split('\n');
    expect(lines.some((l) => l === '# Hz S MA R 50')).toBe(true);
    // 1-port data row: freq + 2 tokens = 3 tokens total
    const dataLines = lines.filter((l) => !l.startsWith('!') && !l.startsWith('#'));
    expect(dataLines).toHaveLength(1);
    expect(dataLines[0]?.trim().split(/\s+/)).toHaveLength(3);
  });

  it('emits canonical 2-port output with zero-filled S12/S22', () => {
    const out = writeTouchstoneString(
      makeTrace({ freqs: [1_000_000], s11: [[0.5, 0]], s21: [[0.9, 0]] }),
    );
    const dataLines = out
      .trim()
      .split('\n')
      .filter((l) => !l.startsWith('!') && !l.startsWith('#'));
    expect(dataLines).toHaveLength(1);
    const tokens = dataLines[0]?.trim().split(/\s+/) ?? [];
    // freq + 4 complex pairs = 9 tokens
    expect(tokens).toHaveLength(9);
    // Last 4 values (S12 re/im S22 re/im) should all be 0.000000
    expect(tokens.slice(5)).toEqual(['0.000000', '0.000000', '0.000000', '0.000000']);
  });

  it('writes source label based on driverKind', () => {
    const v1 = writeTouchstoneString(makeTrace({ driverKind: 'v1', freqs: [1e6], s11: [[1, 0]] }));
    expect(v1).toMatch(/^! Source: NanoVNA V1$/m);
    const v2 = writeTouchstoneString(makeTrace({ driverKind: 'v2', freqs: [1e6], s11: [[1, 0]] }));
    expect(v2).toMatch(/^! Source: NanoVNA V2$/m);
    const imported = writeTouchstoneString(makeTrace({ freqs: [1e6], s11: [[1, 0]] }));
    expect(imported).toMatch(/^! Source: Imported$/m);
  });

  it('sanitizes newlines in trace name', () => {
    const out = writeTouchstoneString(
      makeTrace({ name: 'Line1\nLine2', freqs: [1e6], s11: [[1, 0]] }),
    );
    expect(out).toMatch(/^! Trace: Line1 Line2$/m);
  });

  it('emits 2-port explanatory comment only for 2-port traces', () => {
    const onePort = writeTouchstoneString(makeTrace({ freqs: [1e6], s11: [[1, 0]] }));
    expect(onePort).not.toMatch(/S12 and S22/);
    const twoPort = writeTouchstoneString(
      makeTrace({ freqs: [1e6], s11: [[1, 0]], s21: [[0.9, 0]] }),
    );
    expect(twoPort).toMatch(/S12 and S22 are zero/);
  });

  it('writes frequencies as integer Hz values', () => {
    const out = writeTouchstoneString(makeTrace({ freqs: [1_500_000_000], s11: [[1, 0]] }));
    expect(out).toMatch(/^1500000000\b/m);
  });

  it('writes magnitude and angle with 6-decimal precision', () => {
    const out = writeTouchstoneString(makeTrace({ freqs: [1e6], s11: [[0.5, 0]] }));
    const dataLines = out
      .trim()
      .split('\n')
      .filter((l) => !l.startsWith('!') && !l.startsWith('#'));
    const tokens = dataLines[0]?.trim().split(/\s+/) ?? [];
    expect(tokens[1]).toBe('0.500000');
    expect(tokens[2]).toBe('0.000000');
  });
});
