import { isErr, isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { readerV1 } from '../src/touchstone/reader-v1.js';
import { tokenize } from '../src/touchstone/tokenize.js';

function parse(content: string) {
  return readerV1(tokenize(content));
}

describe('readerV1', () => {
  it('parses a minimal 1-port file', () => {
    const r = parse(`! sample
# Hz S MA R 50
1000000  0.5  -45
2000000  0.4  -30
`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      const { trace, warnings } = r.value;
      expect(trace.frame.frequencies).toEqual([1_000_000, 2_000_000]);
      expect(trace.frame.s11).toHaveLength(2);
      expect(trace.frame.s21).toBeUndefined();
      expect(warnings).toEqual([]);
    }
  });

  it('parses a 2-port file with S11, S21, S12, S22 columns', () => {
    const r = parse(`# Hz S MA R 50
1000000  0.5 -45  0.9 10  0 0  0 0
`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      const { trace } = r.value;
      expect(trace.frame.s11).toHaveLength(1);
      expect(trace.frame.s21).toBeDefined();
      expect(trace.frame.s21).toHaveLength(1);
    }
  });

  it('warns when format is RI and converts', () => {
    const r = parse(`# Hz S RI R 50
1000000  1.0  0.0
`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.warnings.some((w) => w.kind === 'format-variant-converted')).toBe(true);
      expect(r.value.trace.frame.s11[0]).toEqual({ re: 1, im: 0 });
    }
  });

  it('warns when format is DB and converts', () => {
    const r = parse(`# Hz S DB R 50
1000000  0  0
`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.warnings.some((w) => w.kind === 'format-variant-converted')).toBe(true);
      expect(r.value.trace.frame.s11[0]?.re).toBeCloseTo(1, 10);
    }
  });

  it('rejects when option line is missing', () => {
    const r = parse('1000000  0.5  -45\n');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('missing-option-line');
  });

  it('rejects unsupported parameter type', () => {
    const r = parse('# Hz Y MA R 50\n1000000  0.5  -45\n');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('unsupported-parameter-type');
  });

  it('rejects non-50 ohm reference', () => {
    const r = parse('# Hz S MA R 75\n1000000  0.5  -45\n');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('unsupported-reference');
  });

  it('rejects malformed-header when first data row has wrong token count', () => {
    const r = parse(`# Hz S MA R 50
1000000  0.5  -45  extra  tokens
`);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('malformed-header');
  });

  it('skips mid-body malformed rows as warnings', () => {
    const r = parse(`# Hz S MA R 50
1000000  0.5  -45
2000000  0.4  -30  extra
3000000  0.3  -20
`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.frame.s11).toHaveLength(2);
      expect(r.value.warnings.filter((w) => w.kind === 'malformed-data-line').length).toBe(1);
    }
  });

  it('rejects when >50% data rows are malformed', () => {
    const r = parse(`# Hz S MA R 50
1000000  0.5  -45
2000000  bad  -30
3000000  bad  -20
4000000  bad  -10
`);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('too-many-malformed-lines');
  });

  it('rejects when no data rows are present', () => {
    const r = parse('# Hz S MA R 50\n');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('no-data-section');
  });

  it('scales frequency units to Hz internally', () => {
    const r = parse('# GHz S MA R 50\n1.5  0.5  -45\n');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.frame.frequencies[0]).toBeCloseTo(1.5e9, 0);
    }
  });

  it('emits trailing-garbage warning when keyword or option line appears mid-data', () => {
    const r = parse(`# Hz S MA R 50
1000000  0.5  -45
[UnexpectedKeyword]
2000000  0.4  -30
`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.warnings.some((w) => w.kind === 'trailing-garbage')).toBe(true);
      expect(r.value.trace.frame.s11).toHaveLength(2);
    }
  });
});
