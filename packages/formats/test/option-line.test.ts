import { isErr, isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { emitOptionLine, parseOptionLine } from '../src/touchstone/option-line.js';

describe('parseOptionLine', () => {
  it('parses canonical `# Hz S MA R 50`', () => {
    const r = parseOptionLine('# Hz S MA R 50', 1);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.frequencyUnit).toBe('Hz');
      expect(r.value.parameterType).toBe('S');
      expect(r.value.format).toBe('MA');
      expect(r.value.referenceOhm).toBe(50);
    }
  });

  it('is case-insensitive', () => {
    const r = parseOptionLine('# mhz s ma r 50', 1);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.frequencyUnit).toBe('MHz');
      expect(r.value.format).toBe('MA');
    }
  });

  it('accepts fields in any order', () => {
    const r = parseOptionLine('# MA R 50 S GHz', 1);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.frequencyUnit).toBe('GHz');
      expect(r.value.format).toBe('MA');
    }
  });

  it('accepts RI and DB formats', () => {
    const ri = parseOptionLine('# MHz S RI R 50', 1);
    expect(isOk(ri)).toBe(true);
    if (isOk(ri)) expect(ri.value.format).toBe('RI');
    const db = parseOptionLine('# MHz S DB R 50', 1);
    expect(isOk(db)).toBe(true);
    if (isOk(db)) expect(db.value.format).toBe('DB');
  });

  it('rejects non-S parameter types', () => {
    for (const p of ['Y', 'Z', 'H', 'G']) {
      const r = parseOptionLine(`# MHz ${p} MA R 50`, 1);
      expect(isErr(r)).toBe(true);
      if (isErr(r)) expect(r.error.kind).toBe('unsupported-parameter-type');
    }
  });

  it('rejects non-50 reference impedance', () => {
    const r = parseOptionLine('# MHz S MA R 75', 1);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('unsupported-reference');
  });

  it('rejects a line that does not start with #', () => {
    const r = parseOptionLine('MHz S MA R 50', 1);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('missing-option-line');
  });

  it('rejects unrecognized tokens', () => {
    const r = parseOptionLine('# MHz S MA R 50 ZZZ', 1);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('malformed-header');
  });

  it('rejects R with no following value as malformed-header', () => {
    const r = parseOptionLine('# MHz S MA R', 1);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.kind).toBe('malformed-header');
      expect(r.error.message).toContain('numeric value');
    }
  });
});

describe('emitOptionLine', () => {
  it('always emits canonical `# Hz S MA R 50`', () => {
    expect(emitOptionLine()).toBe('# Hz S MA R 50');
  });
});
