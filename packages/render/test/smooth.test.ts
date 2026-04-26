import { describe, expect, it } from 'vitest';
import { catmullRomSubdivide } from '../src/smooth.js';

describe('catmullRomSubdivide', () => {
  it('returns the input unchanged when subdivisions = 0', () => {
    const input = new Float32Array([0, 0, 1, 1, 2, 2]);
    const out = catmullRomSubdivide(input, 0);
    expect(out).toBe(input);
  });

  it('returns the input unchanged when fewer than 2 points', () => {
    const single = new Float32Array([1, 2]);
    expect(catmullRomSubdivide(single, 4)).toBe(single);
  });

  it('produces (segments * (subdivisions + 1) + 1) output points', () => {
    const input = new Float32Array([0, 0, 1, 0, 2, 0, 3, 0]); // 4 points, 3 segments
    const out = catmullRomSubdivide(input, 3);
    expect(out.length / 2).toBe(3 * 4 + 1); // 3 segments * 4 per-segment + 1 end
  });

  it('passes through every original sample', () => {
    const input = new Float32Array([0, 0, 10, 5, 20, 3, 30, 8]);
    const out = catmullRomSubdivide(input, 5);
    // Original vertices appear at indices 0, perSegment, 2*perSegment, ...
    // where perSegment = subdivisions + 1 = 6.
    const perSegment = 6;
    const n = input.length / 2;
    for (let i = 0; i < n; i++) {
      const outIdx = i * perSegment * 2;
      // The last vertex is placed as the final pair, not at i*perSegment*2
      // when it's the last segment's end.
      if (i === n - 1) {
        const last = (out.length / 2 - 1) * 2;
        expect(out[last]).toBeCloseTo(input[i * 2] ?? 0, 5);
        expect(out[last + 1]).toBeCloseTo(input[i * 2 + 1] ?? 0, 5);
      } else {
        expect(out[outIdx]).toBeCloseTo(input[i * 2] ?? 0, 5);
        expect(out[outIdx + 1]).toBeCloseTo(input[i * 2 + 1] ?? 0, 5);
      }
    }
  });

  it('interpolated midpoint of an interior segment lies on a straight line', () => {
    // Use a 4-point straight line so the midpoint we test sits between
    // p1 and p2 (interior segment — no endpoint clamping distortion).
    const input = new Float32Array([0, 0, 10, 10, 20, 20, 30, 30]);
    const out = catmullRomSubdivide(input, 3);
    // perSegment = 4. Segment 1 (p1→p2) starts at output index 4*2 = 8.
    // t = 0.5 is s=2 within that segment → output index 8 + 2*2 = 12.
    expect(out[12]).toBeCloseTo(15, 5);
    expect(out[13]).toBeCloseTo(15, 5);
  });
});
