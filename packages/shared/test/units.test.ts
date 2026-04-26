import { describe, expect, it } from 'vitest';
import {
  type Hz,
  asDb,
  asDeg,
  asHz,
  asOhm,
  formatDb,
  formatDeg,
  formatHz,
  formatOhm,
} from '../src/units.js';

describe('units', () => {
  it('asHz brands a number as Hz', () => {
    const f: Hz = asHz(12_345_678);
    expect(f).toBe(12_345_678);
  });

  it('formatHz picks MHz for values >= 1e6 and < 1e9', () => {
    expect(formatHz(asHz(12_345_678))).toBe('12.3457 MHz');
  });

  it('formatHz picks kHz for values >= 1e3 and < 1e6', () => {
    expect(formatHz(asHz(12_345))).toBe('12.3450 kHz');
  });

  it('formatHz picks GHz for values >= 1e9', () => {
    expect(formatHz(asHz(2_400_000_000))).toBe('2.4000 GHz');
  });

  it('formatHz uses Hz for values < 1e3', () => {
    expect(formatHz(asHz(999))).toBe('999 Hz');
  });

  it('formatDb prints with 2 decimal places', () => {
    expect(formatDb(asDb(-17.346))).toBe('-17.35 dB');
  });

  it('formatDeg prints with 1 decimal place', () => {
    expect(formatDeg(asDeg(45.6789))).toBe('45.7°');
  });

  it('formatOhm prints with 1 decimal place', () => {
    expect(formatOhm(asOhm(50.12))).toBe('50.1 Ω');
  });
});
