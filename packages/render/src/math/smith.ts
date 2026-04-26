import type { Complex } from '@nanovnaweb/shared';

/**
 * Reflection coefficient Γ = (z − 1) / (z + 1), where z is a normalized
 * impedance (z = Z / Z0).
 */
export function impedanceToGamma(z: Complex): Complex {
  // numerator = z − 1
  const nRe = z.re - 1;
  const nIm = z.im;
  // denominator = z + 1
  const dRe = z.re + 1;
  const dIm = z.im;
  // complex division: (nRe + j·nIm) / (dRe + j·dIm)
  const denom = dRe * dRe + dIm * dIm;
  if (denom === 0) return { re: 0, im: 0 };
  return {
    re: (nRe * dRe + nIm * dIm) / denom,
    im: (nIm * dRe - nRe * dIm) / denom,
  };
}

/**
 * Normalized impedance z = (1 + Γ) / (1 − Γ).
 */
export function gammaToImpedance(gamma: Complex): Complex {
  const nRe = 1 + gamma.re;
  const nIm = gamma.im;
  const dRe = 1 - gamma.re;
  const dIm = -gamma.im;
  const denom = dRe * dRe + dIm * dIm;
  if (denom === 0) return { re: Number.POSITIVE_INFINITY, im: 0 };
  return {
    re: (nRe * dRe + nIm * dIm) / denom,
    im: (nIm * dRe - nRe * dIm) / denom,
  };
}

export function normalizedToOhm(z: Complex, referenceOhm: number): Complex {
  return { re: z.re * referenceOhm, im: z.im * referenceOhm };
}
