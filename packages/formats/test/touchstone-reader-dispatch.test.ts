import { isErr, isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { readTouchstoneString } from '../src/touchstone/reader.js';

describe('readTouchstoneString (dispatcher)', () => {
  it('dispatches to 1.0 reader when first content line starts with #', () => {
    const r = readTouchstoneString('# Hz S MA R 50\n1e6 0.5 -45\n');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.name).toBe('Imported Touchstone 1.0');
    }
  });

  it('dispatches to 2.0 reader when first content line starts with [', () => {
    const r = readTouchstoneString(`[Version] 2.0
[Number of Ports] 1
# Hz S MA R 50
[Network Data]
1e6 0.5 -45
[End]
`);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.name).toBe('Imported Touchstone 2.0');
    }
  });

  it('rejects empty input', () => {
    const r = readTouchstoneString('');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('empty-file');
  });

  it('rejects input with only comments', () => {
    const r = readTouchstoneString('! nothing to see\n! move along\n');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('empty-file');
  });

  it('rejects input whose first content line is neither # nor [', () => {
    const r = readTouchstoneString('1e6 0.5 -45\n');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('missing-option-line');
  });
});
