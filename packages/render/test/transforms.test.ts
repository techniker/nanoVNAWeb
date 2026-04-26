import { describe, expect, it } from 'vitest';
import { autoYRange, freqToX, resolveYRange, valueToY, yToValue } from '../src/math/transforms.js';

describe('freqToX', () => {
  it('linear: fMin maps to 0, fMax to width', () => {
    expect(freqToX(1e6, 1e6, 1e9, 1000, 'linear')).toBeCloseTo(0, 6);
    expect(freqToX(1e9, 1e6, 1e9, 1000, 'linear')).toBeCloseTo(1000, 6);
  });

  it('linear: midpoint is width/2', () => {
    expect(freqToX(5e8, 0, 1e9, 1000, 'linear')).toBeCloseTo(500, 6);
  });

  it('log: fMin maps to 0, fMax to width', () => {
    expect(freqToX(1e6, 1e6, 1e9, 1000, 'log')).toBeCloseTo(0, 6);
    expect(freqToX(1e9, 1e6, 1e9, 1000, 'log')).toBeCloseTo(1000, 6);
  });

  it('log: geometric midpoint is width/2', () => {
    const f = Math.sqrt(1e6 * 1e9);
    expect(freqToX(f, 1e6, 1e9, 1000, 'log')).toBeCloseTo(500, 6);
  });
});

describe('valueToY', () => {
  it('vMax maps to 0 (top)', () => {
    expect(valueToY(10, -10, 10, 500)).toBeCloseTo(0, 6);
  });

  it('vMin maps to height (bottom)', () => {
    expect(valueToY(-10, -10, 10, 500)).toBeCloseTo(500, 6);
  });

  it('midpoint maps to height/2', () => {
    expect(valueToY(0, -10, 10, 500)).toBeCloseTo(250, 6);
  });
});

describe('yToValue (inverse of valueToY)', () => {
  it('round-trips within float tolerance', () => {
    for (const v of [-20, -5, 0, 3.7, 10, 42.5]) {
      const y = valueToY(v, -20, 50, 600);
      expect(yToValue(y, -20, 50, 600)).toBeCloseTo(v, 6);
    }
  });
});

describe('autoYRange', () => {
  it('pads slightly below min and above max', () => {
    const r = autoYRange([-10, -5, 0, 5, 10]);
    expect(r.min).toBeLessThan(-10);
    expect(r.max).toBeGreaterThan(10);
  });

  it('handles a single-value array', () => {
    const r = autoYRange([5]);
    expect(r.min).toBeLessThan(5);
    expect(r.max).toBeGreaterThan(5);
  });

  it('returns fallback for empty array', () => {
    const r = autoYRange([]);
    expect(r.min).toBe(-1);
    expect(r.max).toBe(1);
  });
});

describe('resolveYRange', () => {
  it('vswr: defaults to [1, 10] regardless of data', () => {
    expect(resolveYRange('vswr', [1.1, 2.3, 50])).toEqual({ min: 1, max: 10 });
    expect(resolveYRange('vswr', [])).toEqual({ min: 1, max: 10 });
  });

  it('vswr: honors explicit yMin/yMax opts', () => {
    const r = resolveYRange('vswr', [1, 2, 3], { vswr: { xScale: 'linear', yMin: 1, yMax: 5 } });
    expect(r).toEqual({ min: 1, max: 5 });
  });

  it('phase (deg, non-unwrapped): fixed [-180, 180] regardless of data', () => {
    expect(resolveYRange('phase', [-170, 0, 175])).toEqual({ min: -180, max: 180 });
  });

  it('phase (rad, non-unwrapped): fixed [-π, π]', () => {
    const r = resolveYRange('phase', [-2, 0, 2], {
      phase: { unwrap: false, units: 'rad', xScale: 'linear' },
    });
    expect(r.min).toBeCloseTo(-Math.PI, 6);
    expect(r.max).toBeCloseTo(Math.PI, 6);
  });

  it('phase (unwrapped): auto-ranges from the unwrapped data', () => {
    const r = resolveYRange('phase', [-540, -180, 0, 180, 540], {
      phase: { unwrap: true, units: 'deg', xScale: 'linear' },
    });
    expect(r.min).toBeLessThan(-540);
    expect(r.max).toBeGreaterThan(540);
  });

  it('rect: auto-ranges when no explicit yMin/yMax', () => {
    const r = resolveYRange('rect', [-40, -10, 0]);
    expect(r.min).toBeLessThan(-40);
    expect(r.max).toBeGreaterThan(0);
  });

  it('rect: honors explicit yMin/yMax opts', () => {
    const r = resolveYRange('rect', [-40, -10, 0], {
      rect: { mode: 'db-mag', xScale: 'linear', yMin: -30, yMax: 10 },
    });
    expect(r).toEqual({ min: -30, max: 10 });
  });

  it('groupDelay: auto-ranges from data', () => {
    const r = resolveYRange('groupDelay', [1e-9, 2e-9, 3e-9]);
    expect(r.min).toBeLessThan(1e-9);
    expect(r.max).toBeGreaterThan(3e-9);
  });
});
