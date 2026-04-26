import type { Complex } from '@nanovnaweb/shared';

export function fromRI(re: number, im: number): Complex {
  return { re, im };
}

export function fromMA(mag: number, angDeg: number): Complex {
  const rad = (angDeg * Math.PI) / 180;
  return { re: mag * Math.cos(rad), im: mag * Math.sin(rad) };
}

export function fromDB(dbMag: number, angDeg: number): Complex {
  const mag = 10 ** (dbMag / 20);
  return fromMA(mag, angDeg);
}

export function toMA(c: Complex): { mag: number; angDeg: number } {
  const mag = Math.hypot(c.re, c.im);
  const angDeg = mag === 0 ? 0 : (Math.atan2(c.im, c.re) * 180) / Math.PI;
  return { mag, angDeg };
}
