export function nearestSampleIndex(freqs: readonly number[], target: number): number {
  if (freqs.length === 0) return -1;
  if (freqs.length === 1) return 0;
  const firstHz = freqs[0] ?? 0;
  const lastHz = freqs[freqs.length - 1] ?? 0;
  if (target <= firstHz) return 0;
  if (target >= lastHz) return freqs.length - 1;
  let lo = 0;
  let hi = freqs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    const v = freqs[mid] ?? 0;
    if (v === target) return mid;
    if (v < target) lo = mid;
    else hi = mid;
  }
  const loV = freqs[lo] ?? 0;
  const hiV = freqs[hi] ?? 0;
  return Math.abs(target - loV) <= Math.abs(target - hiV) ? lo : hi;
}
