import { isErr, isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { readerV2 } from '../src/touchstone/reader-v2.js';
import { tokenize } from '../src/touchstone/tokenize.js';

function parse(content: string) {
  return readerV2(tokenize(content));
}

describe('readerV2', () => {
  it('parses a minimal 1-port 2.0 file', () => {
    const r = parse(`[Version] 2.0
[Number of Ports] 1
[Reference] 50
# Hz S MA R 50
[Network Data]
1000000  0.5  -45
2000000  0.4  -30
[End]
`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.frame.frequencies).toHaveLength(2);
      expect(r.value.trace.frame.s21).toBeUndefined();
    }
  });

  it('parses a 2-port 2.0 file with default 21_12 order', () => {
    const r = parse(`[Version] 2.0
[Number of Ports] 2
[Reference] 50 50
# Hz S MA R 50
[Network Data]
1000000  0.5 -45  0.9 10  0 0  0 0
[End]
`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      const { trace } = r.value;
      expect(trace.frame.s11[0]?.re).toBeCloseTo(0.5 * Math.cos((-45 * Math.PI) / 180), 10);
      expect(trace.frame.s21).toBeDefined();
    }
  });

  it('parses 12_21 data order and still picks S11 and S21 correctly', () => {
    // In 12_21 order columns are: S11 S12 S21 S22
    // We expect S21 at columns 5-6 (0-indexed after freq)
    const r = parse(`[Version] 2.0
[Number of Ports] 2
[Two-Port Data Order] 12_21
[Reference] 50 50
# Hz S MA R 50
[Network Data]
1000000  0.5 -45  0 0  0.9 10  0 0
[End]
`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.frame.s11[0]?.re).toBeCloseTo(0.5 * Math.cos((-45 * Math.PI) / 180), 10);
      expect(r.value.trace.frame.s21?.[0]?.re).toBeCloseTo(
        0.9 * Math.cos((10 * Math.PI) / 180),
        10,
      );
    }
  });

  it('rejects when [Reference] includes non-50 impedance', () => {
    const r = parse(`[Version] 2.0
[Number of Ports] 2
[Reference] 50 75
# Hz S MA R 50
[Network Data]
1000000  0.5 -45  0.9 10  0 0  0 0
[End]
`);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('unsupported-reference');
  });

  it('rejects when version is not 2.0', () => {
    const r = parse(`[Version] 3.0
[Number of Ports] 1
# Hz S MA R 50
[Network Data]
1e6  0.5  -45
`);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('unsupported-version');
  });

  it('rejects when port count > 2', () => {
    const r = parse(`[Version] 2.0
[Number of Ports] 4
# Hz S MA R 50
[Network Data]
1e6  0 0  0 0  0 0  0 0  0 0  0 0  0 0  0 0  0 0  0 0  0 0  0 0  0 0  0 0  0 0  0 0
`);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('unsupported-version');
  });

  it('rejects non-Full matrix format', () => {
    const r = parse(`[Version] 2.0
[Number of Ports] 2
[Matrix Format] Lower
# Hz S MA R 50
[Network Data]
1000000  0.5 -45  0.9 10
[End]
`);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('unsupported-version');
  });

  it('warns on unknown keyword', () => {
    const r = parse(`[Version] 2.0
[Number of Ports] 1
[Mixed-Mode Order] D2,C2
# Hz S MA R 50
[Network Data]
1000000  0.5  -45
[End]
`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.warnings.some((w) => w.kind === 'unknown-keyword')).toBe(true);
    }
  });

  it('rejects when [Network Data] is missing', () => {
    const r = parse(`[Version] 2.0
[Number of Ports] 1
# Hz S MA R 50
1000000  0.5  -45
`);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('malformed-header');
  });
});
