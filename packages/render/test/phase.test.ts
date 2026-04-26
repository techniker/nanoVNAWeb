import type { Complex } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { computePhase, phaseDeg, unwrapPhaseDeg } from '../src/math/phase.js';

describe('phaseDeg', () => {
  it('1+0j → 0°', () => {
    expect(phaseDeg({ re: 1, im: 0 })).toBeCloseTo(0, 10);
  });

  it('0+1j → 90°', () => {
    expect(phaseDeg({ re: 0, im: 1 })).toBeCloseTo(90, 10);
  });

  it('-1+0j → 180°', () => {
    expect(phaseDeg({ re: -1, im: 0 })).toBeCloseTo(180, 10);
  });

  it('0-1j → -90°', () => {
    expect(phaseDeg({ re: 0, im: -1 })).toBeCloseTo(-90, 10);
  });
});

describe('unwrapPhaseDeg', () => {
  it('passes through a monotonic array unchanged', () => {
    const input = [0, 30, 60, 90, 120];
    expect(Array.from(unwrapPhaseDeg(input))).toEqual(input);
  });

  it('unwraps a +360 jump (e.g., 170 → -170)', () => {
    const input = [170, -170];
    // The second sample jumped by -340°, which is close to a -360 wrap;
    // unwrap should add 360° to bring it back to +190°.
    const out = Array.from(unwrapPhaseDeg(input));
    expect(out[0]).toBe(170);
    expect(out[1]).toBeCloseTo(190, 10);
  });

  it('unwraps multiple consecutive wraps', () => {
    // Monotonically rising phase 170 → 190 → 350 → 530, wrapped to ±180:
    // 170, -170 (=190-360), -10 (=350-360), 170 (=530-360).
    const input = [170, -170, -10, 170];
    const out = Array.from(unwrapPhaseDeg(input));
    expect(out[0]).toBe(170);
    expect(out[1]).toBeCloseTo(190, 10);
    expect(out[2]).toBeCloseTo(350, 10);
    expect(out[3]).toBeCloseTo(170 + 360, 10);
  });

  it('handles empty array', () => {
    expect(Array.from(unwrapPhaseDeg([]))).toEqual([]);
  });
});

describe('computePhase', () => {
  const gammas: readonly Complex[] = [
    { re: 1, im: 0 },
    { re: 0, im: 1 },
    { re: -1, im: 0 },
    { re: 0, im: -1 },
  ];

  it('returns raw degrees without unwrap', () => {
    const out = computePhase(gammas, false);
    expect(Array.from(out)).toEqual([0, 90, 180, -90]);
  });

  it('applies unwrap when requested', () => {
    const out = computePhase(gammas, true);
    // Raw: [0, 90, 180, -90]. Jump 180→-90 is -270° which after +360
    // becomes +90°. Jump (step 3, samples 2→3) = -270° → +90° after +360.
    // So unwrapped: [0, 90, 180, 270].
    expect(out[3]).toBeCloseTo(270, 10);
  });
});
