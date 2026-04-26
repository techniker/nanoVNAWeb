import { isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { readTouchstoneString } from '../src/touchstone/reader.js';

// Fixture resembling scikit-rf's canonical .s2p output: MHz, S, MA, 50-ohm,
// 1-comment-line preamble, 4-pair data.
const SCIKIT_RF_STYLE_S2P = `! Touchstone file exported by sample tool
# MHz S MA R 50
100.000000   0.100000   0.000000   0.800000   0.000000   0.800000   0.000000   0.100000   0.000000
200.000000   0.150000  10.000000   0.750000  -5.000000   0.750000  -5.000000   0.150000  10.000000
300.000000   0.200000  20.000000   0.700000 -10.000000   0.700000 -10.000000   0.200000  20.000000
`;

describe('external-tool compatibility', () => {
  it('parses a scikit-rf-style .s2p file', () => {
    const r = readTouchstoneString(SCIKIT_RF_STYLE_S2P);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      const t = r.value.trace;
      expect(t.frame.frequencies).toHaveLength(3);
      expect(t.frame.frequencies[0]).toBe(100_000_000);
      expect(t.frame.frequencies[1]).toBe(200_000_000);
      expect(t.frame.frequencies[2]).toBe(300_000_000);
      expect(t.frame.s11).toHaveLength(3);
      expect(t.frame.s21).toBeDefined();
      expect(t.frame.s21).toHaveLength(3);
      // S11 at 100 MHz: mag 0.1, angle 0° → Complex { re: 0.1, im: 0 }
      expect(t.frame.s11[0]?.re).toBeCloseTo(0.1, 6);
      expect(t.frame.s11[0]?.im).toBeCloseTo(0, 6);
      // S21 at 100 MHz: mag 0.8, angle 0°
      expect(t.frame.s21?.[0]?.re).toBeCloseTo(0.8, 6);
      expect(t.frame.s21?.[0]?.im).toBeCloseTo(0, 6);
    }
  });
});
