/**
 * Group delay τ = −dφ/dω. Numerical form:
 *   τ_i = −(φ[i+1] − φ[i]) / (2π × (f[i+1] − f[i]))
 * Output length = phasesRad.length − 1.
 *
 * The phase difference is wrapped into (−π, π] before taking the
 * derivative so an atan2 wrap between adjacent samples (e.g. +179° →
 * −179°) reads as the natural −2° step, not a 358° jump. Without this,
 * any resonance that sweeps through ±180° produces multi-microsecond
 * fake spikes in the trace while the true group delay is only a few
 * nanoseconds — and the spikes distort the auto-scaled Y range, so the
 * marker and the trace no longer share a pixel row.
 */
export function computeGroupDelay(
  phasesRad: readonly number[],
  frequenciesHz: readonly number[],
): readonly number[] {
  if (phasesRad.length < 2) return [];
  const TWO_PI = 2 * Math.PI;
  const out: number[] = [];
  for (let i = 0; i < phasesRad.length - 1; i++) {
    const p1 = phasesRad[i] ?? 0;
    const p2 = phasesRad[i + 1] ?? 0;
    const f1 = frequenciesHz[i] ?? 0;
    const f2 = frequenciesHz[i + 1] ?? 0;
    const df = f2 - f1;
    if (df === 0) {
      out.push(0);
      continue;
    }
    // Wrap (p2 - p1) into [−π, π] by subtracting the nearest multiple of
    // 2π. Math.round is numerically exact when dphi is already in range
    // (round(tiny/2π) = 0 → dphi unchanged), so this preserves the small
    // steps of a linear phase ramp bit-for-bit while still collapsing
    // atan2 wraps at ±π.
    let dphi = p2 - p1;
    dphi -= TWO_PI * Math.round(dphi / TWO_PI);
    out.push(-dphi / (TWO_PI * df));
  }
  return out;
}
