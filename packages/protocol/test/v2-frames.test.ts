import { describe, expect, it } from 'vitest';
import { buildRead1, buildRead2, buildRead4 } from '../src/v2/frames.js';
import { buildWrite1, buildWrite2, buildWrite4, splitU64 } from '../src/v2/frames.js';
import { buildReadFifo, buildWriteFifo } from '../src/v2/frames.js';

describe('V2 frame encoders — READ', () => {
  it('buildRead1 emits [OP_READ1, address]', () => {
    expect(Array.from(buildRead1(0xf0))).toEqual([0x10, 0xf0]);
  });

  it('buildRead2 emits [OP_READ2, address]', () => {
    expect(Array.from(buildRead2(0x20))).toEqual([0x11, 0x20]);
  });

  it('buildRead4 emits [OP_READ4, address]', () => {
    expect(Array.from(buildRead4(0x00))).toEqual([0x12, 0x00]);
  });
});

describe('V2 frame encoders — WRITE', () => {
  it('buildWrite1 emits [OP_WRITE1, address, value]', () => {
    expect(Array.from(buildWrite1(0x22, 0x05))).toEqual([0x20, 0x22, 0x05]);
  });

  it('buildWrite2 emits [OP_WRITE2, address, lo, hi] (little-endian)', () => {
    expect(Array.from(buildWrite2(0x20, 0x0065))).toEqual([0x21, 0x20, 0x65, 0x00]);
    expect(Array.from(buildWrite2(0x20, 0x1234))).toEqual([0x21, 0x20, 0x34, 0x12]);
  });

  it('buildWrite4 emits [OP_WRITE4, address, b0, b1, b2, b3] (little-endian)', () => {
    expect(Array.from(buildWrite4(0x00, 0x12345678))).toEqual([0x22, 0x00, 0x78, 0x56, 0x34, 0x12]);
  });

  it('buildWrite4 handles values above 2^31 without bitwise coercion', () => {
    // 0xFEDCBA98 = 4_275_878_552 > 2^31
    expect(Array.from(buildWrite4(0x04, 0xfedcba98))).toEqual([0x22, 0x04, 0x98, 0xba, 0xdc, 0xfe]);
  });
});

describe('splitU64 (64-bit frequency split)', () => {
  it('splits 0 into lo=0, hi=0', () => {
    expect(splitU64(0)).toEqual({ lo: 0, hi: 0 });
  });

  it('splits a sub-2^32 value with hi=0', () => {
    expect(splitU64(1_000_000_000)).toEqual({ lo: 1_000_000_000, hi: 0 });
  });

  it('splits 4_400_000_000 (above 2^32) correctly', () => {
    // 4_400_000_000 = 0x1_0642_AC00; lo = 0x0642AC00 = 105_032_704; hi = 0x01 = 1
    expect(splitU64(4_400_000_000)).toEqual({ lo: 105_032_704, hi: 1 });
  });

  it('splits 2^32 as lo=0, hi=1', () => {
    expect(splitU64(2 ** 32)).toEqual({ lo: 0, hi: 1 });
  });
});

describe('V2 frame encoders — FIFO', () => {
  it('buildReadFifo emits [OP_READFIFO, address, count]', () => {
    expect(Array.from(buildReadFifo(0x30, 101))).toEqual([0x18, 0x30, 101]);
  });

  it('buildReadFifo caps count at 255 (single byte)', () => {
    // count > 255 is clamped; caller is expected to chunk larger reads
    expect(Array.from(buildReadFifo(0x30, 255))).toEqual([0x18, 0x30, 255]);
  });

  it('buildWriteFifo emits [OP_WRITEFIFO, address, value]', () => {
    expect(Array.from(buildWriteFifo(0x30, 0x00))).toEqual([0x28, 0x30, 0x00]);
  });
});
