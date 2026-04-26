import { describe, expect, it } from 'vitest';
import { computeGroupDelay } from '../src/math/group-delay.js';

describe('computeGroupDelay', () => {
  it('returns length = phases.length - 1', () => {
    const phases = [0, 0.1, 0.2, 0.3];
    const freqs = [1e6, 2e6, 3e6, 4e6];
    expect(computeGroupDelay(phases, freqs)).toHaveLength(3);
  });

  it('linear phase ramp yields constant delay', () => {
    // φ = −2π × τ × f. If τ = 1 ns = 1e-9 s, at 1e6 Hz step Δf = 1e6,
    // Δφ = −2π × 1e-9 × 1e6 = −6.283e-3 rad.
    const tau = 1e-9;
    const phases: number[] = [];
    const freqs: number[] = [];
    for (let i = 0; i < 5; i++) {
      const f = 1e6 + i * 1e6;
      freqs.push(f);
      phases.push(-2 * Math.PI * tau * f);
    }
    const delays = computeGroupDelay(phases, freqs);
    for (const d of delays) {
      expect(d).toBeCloseTo(tau, 12);
    }
  });

  it('returns empty array for input of length <= 1', () => {
    expect(computeGroupDelay([], [])).toEqual([]);
    expect(computeGroupDelay([0], [1e6])).toEqual([]);
  });

  it('handles non-uniform frequency spacing', () => {
    // τ = 2 ns; constant delay regardless of spacing
    const tau = 2e-9;
    const freqs = [1e6, 5e6, 12e6, 20e6];
    const phases = freqs.map((f) => -2 * Math.PI * tau * f);
    const delays = computeGroupDelay(phases, freqs);
    for (const d of delays) {
      expect(d).toBeCloseTo(tau, 12);
    }
  });
});
