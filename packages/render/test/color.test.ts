import { describe, expect, it } from 'vitest';
import { parseCssColor } from '../src/color.js';

describe('parseCssColor', () => {
  it('parses #rrggbb', () => {
    expect(parseCssColor('#3ba5ff')).toEqual([0x3b / 255, 0xa5 / 255, 0xff / 255, 1]);
  });

  it('parses #rgb shorthand', () => {
    expect(parseCssColor('#f0a')).toEqual([1, 0, 170 / 255, 1]);
  });

  it('parses #rrggbbaa with alpha', () => {
    const [, , , a] = parseCssColor('#ffffff80');
    expect(a).toBeCloseTo(0x80 / 255, 4);
  });

  it('parses rgb(r, g, b) with commas', () => {
    expect(parseCssColor('rgb(59, 165, 255)')).toEqual([59 / 255, 165 / 255, 1, 1]);
  });

  it('parses rgb(r g b) space-separated', () => {
    expect(parseCssColor('rgb(59 165 255)')).toEqual([59 / 255, 165 / 255, 1, 1]);
  });

  it('parses rgba(r g b / a)', () => {
    const rgba = parseCssColor('rgb(59 165 255 / 0.5)');
    expect(rgba[3]).toBeCloseTo(0.5, 4);
  });

  it('parses rgba(r, g, b, a)', () => {
    const rgba = parseCssColor('rgba(59, 165, 255, 0.25)');
    expect(rgba[3]).toBeCloseTo(0.25, 4);
  });

  it('returns opaque black for empty or unparseable input', () => {
    expect(parseCssColor('')).toEqual([0, 0, 0, 1]);
    expect(parseCssColor('var(--does-not-resolve)')).toEqual([0, 0, 0, 1]);
    expect(parseCssColor('chartreuse')).toEqual([0, 0, 0, 1]);
  });

  it('clamps out-of-range channels', () => {
    expect(parseCssColor('rgb(300 -5 128)')).toEqual([1, 0, 128 / 255, 1]);
  });
});
