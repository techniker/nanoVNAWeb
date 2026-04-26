/**
 * Catmull-Rom spline subdivision for 2D polylines. Produces a smooth curve
 * that passes through every input point, inserting `subdivisions` extra
 * samples between each consecutive pair. The endpoints are duplicated so the
 * tangent calculations have neighbors on both sides.
 *
 * Uniform parameterization (α = 0). Deliberately chosen over centripetal
 * (α = 0.5) because our samples are evenly spaced in frequency; uniform
 * gives the cleanest interpolation and avoids cusps when adjacent samples
 * sit close together after a resonance.
 */
export function catmullRomSubdivide(positions: Float32Array, subdivisions: number): Float32Array {
  const n = positions.length / 2;
  if (n < 2 || subdivisions < 1) return positions;

  const segments = n - 1;
  const perSegment = subdivisions + 1; // including the starting vertex
  // Output has `segments * perSegment + 1` points (add the final vertex).
  const out = new Float32Array((segments * perSegment + 1) * 2);

  const getX = (i: number): number => {
    const clamped = i < 0 ? 0 : i > n - 1 ? n - 1 : i;
    return positions[clamped * 2] ?? 0;
  };
  const getY = (i: number): number => {
    const clamped = i < 0 ? 0 : i > n - 1 ? n - 1 : i;
    return positions[clamped * 2 + 1] ?? 0;
  };

  let w = 0;
  for (let i = 0; i < segments; i++) {
    const p0x = getX(i - 1);
    const p0y = getY(i - 1);
    const p1x = getX(i);
    const p1y = getY(i);
    const p2x = getX(i + 1);
    const p2y = getY(i + 1);
    const p3x = getX(i + 2);
    const p3y = getY(i + 2);

    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      // Catmull-Rom basis (α=0), tension τ=0.5 (the canonical formulation):
      // p(t) = 0.5 * ((2p1) + (-p0 + p2)t + (2p0 - 5p1 + 4p2 - p3)t² + (-p0 + 3p1 - 3p2 + p3)t³)
      const b0 = -0.5 * t3 + t2 - 0.5 * t;
      const b1 = 1.5 * t3 - 2.5 * t2 + 1;
      const b2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
      const b3 = 0.5 * t3 - 0.5 * t2;
      out[w++] = b0 * p0x + b1 * p1x + b2 * p2x + b3 * p3x;
      out[w++] = b0 * p0y + b1 * p1y + b2 * p2y + b3 * p3y;
    }
  }
  // Final vertex: the original last point.
  out[w++] = getX(n - 1);
  out[w++] = getY(n - 1);
  return out;
}
