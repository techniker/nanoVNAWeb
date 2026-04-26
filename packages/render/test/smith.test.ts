import type { Complex } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { gammaToImpedance, impedanceToGamma, normalizedToOhm } from '../src/math/smith.js';

function close(a: Complex, b: Complex, digits = 10): void {
  expect(a.re).toBeCloseTo(b.re, digits);
  expect(a.im).toBeCloseTo(b.im, digits);
}

describe('impedanceToGamma', () => {
  it('z=1+0j (matched 50Ω normalized) → Γ=0', () => {
    close(impedanceToGamma({ re: 1, im: 0 }), { re: 0, im: 0 });
  });

  it('z=∞ (open, represented as large value) → Γ≈1', () => {
    const g = impedanceToGamma({ re: 1e9, im: 0 });
    expect(g.re).toBeCloseTo(1, 6);
    expect(g.im).toBeCloseTo(0, 6);
  });

  it('z=0 (short) → Γ=-1', () => {
    close(impedanceToGamma({ re: 0, im: 0 }), { re: -1, im: 0 });
  });

  it('z=0+j (pure +inductance) → Γ on unit circle', () => {
    const g = impedanceToGamma({ re: 0, im: 1 });
    const mag = Math.hypot(g.re, g.im);
    expect(mag).toBeCloseTo(1, 6);
  });
});

describe('gammaToImpedance (inverse)', () => {
  it('round-trips for z=1+0j', () => {
    const z = { re: 1, im: 0 };
    close(gammaToImpedance(impedanceToGamma(z)), z);
  });

  it('round-trips for z=2+j1', () => {
    const z = { re: 2, im: 1 };
    close(gammaToImpedance(impedanceToGamma(z)), z);
  });

  it('Γ=0 → z=1', () => {
    close(gammaToImpedance({ re: 0, im: 0 }), { re: 1, im: 0 });
  });
});

describe('normalizedToOhm', () => {
  it('z=1+0j with 50Ω reference → 50+0j', () => {
    close(normalizedToOhm({ re: 1, im: 0 }, 50), { re: 50, im: 0 });
  });

  it('scales imaginary part too', () => {
    close(normalizedToOhm({ re: 2, im: 1 }, 50), { re: 100, im: 50 });
  });
});
