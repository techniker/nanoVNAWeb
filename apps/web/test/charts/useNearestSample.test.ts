import { describe, expect, it } from 'vitest';
import { nearestSampleIndex } from '../../src/charts/useNearestSample.js';

describe('nearestSampleIndex', () => {
  const freqs = [1e6, 2e6, 3e6, 4e6, 5e6];

  it('returns 0 for freq below first', () => {
    expect(nearestSampleIndex(freqs, 0)).toBe(0);
  });
  it('returns last index for freq above last', () => {
    expect(nearestSampleIndex(freqs, 10e6)).toBe(4);
  });
  it('returns exact match', () => {
    expect(nearestSampleIndex(freqs, 3e6)).toBe(2);
  });
  it('rounds to the closer neighbor', () => {
    expect(nearestSampleIndex(freqs, 2.4e6)).toBe(1);
    expect(nearestSampleIndex(freqs, 2.6e6)).toBe(2);
  });
  it('handles single-element arrays', () => {
    expect(nearestSampleIndex([5e6], 1e6)).toBe(0);
  });
  it('handles empty arrays by returning -1', () => {
    expect(nearestSampleIndex([], 1e6)).toBe(-1);
  });
});
