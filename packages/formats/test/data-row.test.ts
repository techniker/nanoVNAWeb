import { describe, expect, it } from 'vitest';
import { emitDataRow1Port, emitDataRow2Port } from '../src/touchstone/data-row.js';

describe('emitDataRow1Port', () => {
  it('emits `<freq> <mag> <angDeg>` with 6-decimal precision', () => {
    const out = emitDataRow1Port(1_000_000, { mag: 0.5, angDeg: -45 });
    // Whitespace-insensitive check
    expect(out.trim().split(/\s+/)).toEqual(['1000000', '0.500000', '-45.000000']);
  });
});

describe('emitDataRow2Port', () => {
  it('emits S11 S21 S12(=0) S22(=0) in Touchstone 1.0 column order', () => {
    const out = emitDataRow2Port(
      1_000_000,
      { mag: 0.5, angDeg: -45 }, // S11
      { mag: 0.9, angDeg: 10 }, // S21
    );
    expect(out.trim().split(/\s+/)).toEqual([
      '1000000',
      '0.500000',
      '-45.000000',
      '0.900000',
      '10.000000',
      '0.000000',
      '0.000000',
      '0.000000',
      '0.000000',
    ]);
  });
});
