import { asHz, isErr, isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import {
  computeFrequencies,
  divComplex,
  parseFifoRecord,
  parseRead1Response,
  parseRead2Response,
  parseRead4Response,
} from '../src/v2/parsers.js';

describe('V2 response parsers — READ', () => {
  it('parseRead1Response returns the single byte value', () => {
    const r = parseRead1Response(Uint8Array.of(0x42));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(0x42);
  });

  it('parseRead1Response errors on empty input', () => {
    const r = parseRead1Response(new Uint8Array(0));
    expect(isErr(r)).toBe(true);
  });

  it('parseRead2Response decodes little-endian uint16', () => {
    const r = parseRead2Response(Uint8Array.of(0x34, 0x12));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(0x1234);
  });

  it('parseRead2Response errors on truncated input', () => {
    const r = parseRead2Response(Uint8Array.of(0x34));
    expect(isErr(r)).toBe(true);
  });

  it('parseRead4Response decodes little-endian uint32', () => {
    const r = parseRead4Response(Uint8Array.of(0x78, 0x56, 0x34, 0x12));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(0x12345678);
  });

  it('parseRead4Response handles values above 2^31', () => {
    const r = parseRead4Response(Uint8Array.of(0x98, 0xba, 0xdc, 0xfe));
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe(0xfedcba98);
  });
});

describe('V2 parseFifoRecord', () => {
  function makeRecord(fields: {
    fwd0: [number, number];
    rev0: [number, number];
    rev1: [number, number];
    freqIndex: number;
  }): Uint8Array {
    const buf = new Uint8Array(32);
    const view = new DataView(buf.buffer);
    view.setInt32(0, fields.fwd0[0], true);
    view.setInt32(4, fields.fwd0[1], true);
    view.setInt32(8, fields.rev0[0], true);
    view.setInt32(12, fields.rev0[1], true);
    view.setInt32(16, fields.rev1[0], true);
    view.setInt32(20, fields.rev1[1], true);
    view.setUint16(24, fields.freqIndex, true);
    return buf;
  }

  it('parses a canned record with known field values', () => {
    const bytes = makeRecord({
      fwd0: [100, 0],
      rev0: [50, -25],
      rev1: [10, 5],
      freqIndex: 7,
    });
    const r = parseFifoRecord(bytes, 0);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.fwd0).toEqual({ re: 100, im: 0 });
      expect(r.value.rev0).toEqual({ re: 50, im: -25 });
      expect(r.value.rev1).toEqual({ re: 10, im: 5 });
      expect(r.value.freqIndex).toBe(7);
    }
  });

  it('parses at a non-zero offset', () => {
    const prefix = new Uint8Array(32);
    const record = makeRecord({
      fwd0: [1, 0],
      rev0: [2, 0],
      rev1: [3, 0],
      freqIndex: 0,
    });
    const combined = new Uint8Array(64);
    combined.set(prefix, 0);
    combined.set(record, 32);
    const r = parseFifoRecord(combined, 32);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.fwd0.re).toBe(1);
      expect(r.value.rev0.re).toBe(2);
      expect(r.value.rev1.re).toBe(3);
    }
  });

  it('errors when fewer than 32 bytes are available from offset', () => {
    const r = parseFifoRecord(new Uint8Array(16), 0);
    expect(isErr(r)).toBe(true);
  });

  it('handles negative int32 values', () => {
    const bytes = makeRecord({
      fwd0: [-1, -2],
      rev0: [-3, -4],
      rev1: [-5, -6],
      freqIndex: 0,
    });
    const r = parseFifoRecord(bytes, 0);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.fwd0).toEqual({ re: -1, im: -2 });
      expect(r.value.rev0).toEqual({ re: -3, im: -4 });
      expect(r.value.rev1).toEqual({ re: -5, im: -6 });
    }
  });
});

describe('V2 divComplex', () => {
  it('divides (2+0i)/(1+0i) = 2+0i', () => {
    expect(divComplex({ re: 2, im: 0 }, { re: 1, im: 0 })).toEqual({ re: 2, im: 0 });
  });

  it('divides (1+0i)/(2+0i) = 0.5+0i', () => {
    expect(divComplex({ re: 1, im: 0 }, { re: 2, im: 0 })).toEqual({ re: 0.5, im: 0 });
  });

  it('divides (1+2i)/(3+4i) = 11/25 + 2/25 i', () => {
    const r = divComplex({ re: 1, im: 2 }, { re: 3, im: 4 });
    expect(r.re).toBeCloseTo(11 / 25, 10);
    expect(r.im).toBeCloseTo(2 / 25, 10);
  });

  it('returns {re:0, im:0} when denominator is zero (avoids NaN)', () => {
    expect(divComplex({ re: 1, im: 1 }, { re: 0, im: 0 })).toEqual({ re: 0, im: 0 });
  });
});

describe('V2 computeFrequencies', () => {
  it('returns [start] for points=1', () => {
    const fs = computeFrequencies({ start: asHz(100), stop: asHz(200), points: 1 });
    expect(fs).toEqual([100]);
  });

  it('returns N linearly-spaced values for points=3', () => {
    const fs = computeFrequencies({ start: asHz(100), stop: asHz(200), points: 3 });
    expect(fs).toEqual([100, 150, 200]);
  });

  it('handles a 1024-point sweep', () => {
    const fs = computeFrequencies({ start: asHz(0), stop: asHz(1023), points: 1024 });
    expect(fs.length).toBe(1024);
    expect(fs[0]).toBe(0);
    expect(fs[1023]).toBe(1023);
    expect(fs[512]).toBe(512);
  });
});
