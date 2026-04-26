import { asHz, isOk } from '@nanovnaweb/shared';
import type { Frame, TraceRecord } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { readTouchstoneString } from '../src/touchstone/reader.js';
import { writeTouchstoneString } from '../src/touchstone/writer.js';

function traceFrom(opts: {
  freqs: number[];
  s11: [number, number][];
  s21?: [number, number][];
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
    name: 'roundtrip',
    createdAt: 0,
    frame,
    driverKind: 'v1',
  };
}

describe('Touchstone roundtrip', () => {
  it('1-port data round-trips within float tolerance', () => {
    const original = traceFrom({
      freqs: [1_000_000, 2_000_000, 3_000_000],
      s11: [
        [0.5, -0.3],
        [0.4, -0.2],
        [0.3, -0.1],
      ],
    });
    const written = writeTouchstoneString(original);
    const readResult = readTouchstoneString(written);
    expect(isOk(readResult)).toBe(true);
    if (isOk(readResult)) {
      const reimported = readResult.value.trace;
      expect(reimported.frame.frequencies.map(Number)).toEqual(
        original.frame.frequencies.map(Number),
      );
      for (let i = 0; i < 3; i++) {
        expect(reimported.frame.s11[i]?.re).toBeCloseTo(original.frame.s11[i]?.re ?? 0, 5);
        expect(reimported.frame.s11[i]?.im).toBeCloseTo(original.frame.s11[i]?.im ?? 0, 5);
      }
    }
  });

  it('2-port data round-trips within float tolerance', () => {
    const original = traceFrom({
      freqs: [1_000_000, 2_000_000],
      s11: [
        [0.5, -0.3],
        [0.4, -0.2],
      ],
      s21: [
        [0.9, 0.05],
        [0.85, 0.03],
      ],
    });
    const written = writeTouchstoneString(original);
    const r = readTouchstoneString(written);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      const t = r.value.trace;
      expect(t.frame.s21).toBeDefined();
      for (let i = 0; i < 2; i++) {
        expect(t.frame.s11[i]?.re).toBeCloseTo(original.frame.s11[i]?.re ?? 0, 5);
        expect(t.frame.s21?.[i]?.re).toBeCloseTo(original.frame.s21?.[i]?.re ?? 0, 5);
      }
    }
  });

  it('re-imported trace has no driverKind (metadata differs by design)', () => {
    const original = traceFrom({
      freqs: [1_000_000],
      s11: [[0.5, -0.3]],
    });
    const written = writeTouchstoneString(original);
    const r = readTouchstoneString(written);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.driverKind).toBeUndefined();
      expect(r.value.trace.id).not.toBe(original.id);
      expect(r.value.trace.name).toBe('Imported Touchstone 1.0');
    }
  });

  it('warnings array is empty on a clean canonical-canonical roundtrip', () => {
    const original = traceFrom({
      freqs: [1_000_000],
      s11: [[0.5, -0.3]],
    });
    const written = writeTouchstoneString(original);
    const r = readTouchstoneString(written);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.warnings).toEqual([]);
    }
  });
});
