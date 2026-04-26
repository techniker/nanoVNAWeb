import type { Complex } from '@nanovnaweb/shared';

export function phaseDeg(g: Complex): number {
  return (Math.atan2(g.im, g.re) * 180) / Math.PI;
}

export function unwrapPhaseDeg(phases: readonly number[]): readonly number[] {
  if (phases.length === 0) return [];
  const out: number[] = [phases[0] ?? 0];
  let offset = 0;
  for (let i = 1; i < phases.length; i++) {
    const raw = phases[i] ?? 0;
    const prev = phases[i - 1] ?? 0;
    const diff = raw - prev;
    if (diff > 180) offset -= 360;
    else if (diff < -180) offset += 360;
    out.push(raw + offset);
  }
  return out;
}

export function computePhase(gammas: readonly Complex[], unwrap: boolean): readonly number[] {
  const raw = gammas.map(phaseDeg);
  return unwrap ? unwrapPhaseDeg(raw) : raw;
}
