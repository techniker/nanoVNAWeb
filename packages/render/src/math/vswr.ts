import type { Complex } from '@nanovnaweb/shared';

export function computeVswr(gamma: Complex): number {
  const mag = Math.hypot(gamma.re, gamma.im);
  if (mag >= 1) return Number.POSITIVE_INFINITY;
  return (1 + mag) / (1 - mag);
}
