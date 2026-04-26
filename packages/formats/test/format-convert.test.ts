import { describe, expect, it } from 'vitest';
import { fromDB, fromMA, fromRI, toMA } from '../src/touchstone/format-convert.js';

describe('fromRI', () => {
  it('returns the real and imaginary parts directly', () => {
    expect(fromRI(1.5, -0.5)).toEqual({ re: 1.5, im: -0.5 });
  });

  it('handles zero values', () => {
    expect(fromRI(0, 0)).toEqual({ re: 0, im: 0 });
  });
});

describe('fromMA', () => {
  it('converts magnitude + 0° to real-only', () => {
    const c = fromMA(2, 0);
    expect(c.re).toBeCloseTo(2, 10);
    expect(c.im).toBeCloseTo(0, 10);
  });

  it('converts magnitude + 90° to imaginary-only', () => {
    const c = fromMA(1, 90);
    expect(c.re).toBeCloseTo(0, 10);
    expect(c.im).toBeCloseTo(1, 10);
  });

  it('converts magnitude + 180° to negative real', () => {
    const c = fromMA(0.5, 180);
    expect(c.re).toBeCloseTo(-0.5, 10);
    expect(c.im).toBeCloseTo(0, 10);
  });

  it('handles negative angles', () => {
    const c = fromMA(1, -90);
    expect(c.re).toBeCloseTo(0, 10);
    expect(c.im).toBeCloseTo(-1, 10);
  });
});

describe('fromDB', () => {
  it('0 dB produces magnitude 1', () => {
    const c = fromDB(0, 0);
    expect(c.re).toBeCloseTo(1, 10);
    expect(c.im).toBeCloseTo(0, 10);
  });

  it('-20 dB produces magnitude 0.1', () => {
    const c = fromDB(-20, 0);
    expect(c.re).toBeCloseTo(0.1, 10);
    expect(c.im).toBeCloseTo(0, 10);
  });

  it('combines dB magnitude with angle', () => {
    const c = fromDB(-20, 90);
    expect(c.re).toBeCloseTo(0, 10);
    expect(c.im).toBeCloseTo(0.1, 10);
  });
});

describe('toMA', () => {
  it('inverts fromMA within float tolerance', () => {
    const c = fromMA(0.75, 45);
    const { mag, angDeg } = toMA(c);
    expect(mag).toBeCloseTo(0.75, 10);
    expect(angDeg).toBeCloseTo(45, 10);
  });

  it('handles zero', () => {
    const { mag, angDeg } = toMA({ re: 0, im: 0 });
    expect(mag).toBe(0);
    expect(angDeg).toBe(0);
  });

  it('returns angle in range (-180, 180]', () => {
    const { angDeg } = toMA({ re: -1, im: 0 });
    expect(angDeg).toBeCloseTo(180, 10);
    const { angDeg: negQuadrant } = toMA({ re: 0, im: -1 });
    expect(negQuadrant).toBeCloseTo(-90, 10);
  });
});
