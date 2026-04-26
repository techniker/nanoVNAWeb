import type { DeviceCapabilities, Hz } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { validateSweep } from '../../src/sweep/validation.js';

const caps: DeviceCapabilities = {
  minFrequencyHz: 5e4 as Hz,
  maxFrequencyHz: 3e9 as Hz,
  maxPoints: 1601,
  supportsS11: true,
  supportsS21: true,
  supportsAveraging: false,
};

describe('validateSweep', () => {
  it('accepts a valid sweep', () => {
    const r = validateSweep({ start: 1e6 as Hz, stop: 1e9 as Hz, points: 401 }, caps);
    expect(r.kind).toBe('ok');
  });

  it('rejects start < minFrequencyHz', () => {
    const r = validateSweep({ start: 10 as Hz, stop: 1e9 as Hz, points: 401 }, caps);
    expect(r.kind).toBe('err');
    if (r.kind === 'err') expect(r.error.field).toBe('start');
  });

  it('rejects stop > maxFrequencyHz', () => {
    const r = validateSweep({ start: 1e6 as Hz, stop: 5e9 as Hz, points: 401 }, caps);
    expect(r.kind).toBe('err');
    if (r.kind === 'err') expect(r.error.field).toBe('stop');
  });

  it('rejects stop <= start', () => {
    const r = validateSweep({ start: 1e9 as Hz, stop: 1e6 as Hz, points: 401 }, caps);
    expect(r.kind).toBe('err');
    if (r.kind === 'err') expect(r.error.field).toBe('range');
  });

  it('rejects points > maxPoints', () => {
    const r = validateSweep({ start: 1e6 as Hz, stop: 1e9 as Hz, points: 2000 }, caps);
    expect(r.kind).toBe('err');
    if (r.kind === 'err') expect(r.error.field).toBe('points');
  });

  it('rejects non-positive points', () => {
    const r = validateSweep({ start: 1e6 as Hz, stop: 1e9 as Hz, points: 0 }, caps);
    expect(r.kind).toBe('err');
    if (r.kind === 'err') expect(r.error.field).toBe('points');
  });
});
