import { describe, expect, it } from 'vitest';
import { computeVswr } from '../src/math/vswr.js';

describe('computeVswr', () => {
  it('Γ=0 → VSWR=1 (matched)', () => {
    expect(computeVswr({ re: 0, im: 0 })).toBeCloseTo(1, 10);
  });

  it('|Γ|=0.5 → VSWR=3', () => {
    expect(computeVswr({ re: 0.5, im: 0 })).toBeCloseTo(3, 10);
    expect(computeVswr({ re: -0.5, im: 0 })).toBeCloseTo(3, 10);
    expect(computeVswr({ re: 0, im: 0.5 })).toBeCloseTo(3, 10);
  });

  it('|Γ|→1 → VSWR=Infinity', () => {
    expect(computeVswr({ re: 1, im: 0 })).toBe(Number.POSITIVE_INFINITY);
    expect(computeVswr({ re: 0.99999999, im: 0 })).toBeGreaterThan(1e7);
  });

  it('complex Γ uses magnitude', () => {
    // |Γ| = √(0.3² + 0.4²) = 0.5 → VSWR = 3
    expect(computeVswr({ re: 0.3, im: 0.4 })).toBeCloseTo(3, 6);
  });

  it("returns Infinity when |Γ|>=1 (shouldn't happen physically but guard)", () => {
    expect(computeVswr({ re: 1.5, im: 0 })).toBe(Number.POSITIVE_INFINITY);
  });
});
