import type REGL from 'regl';
import type { ReglContext } from './setup.js';

export interface LinePassInput {
  readonly positions: Float32Array;
  readonly color: readonly [number, number, number, number];
  readonly lineWidth: number;
}

export interface LinePass {
  draw(input: LinePassInput): void;
  destroy(): void;
}

/**
 * Fat-line rendering via expanded triangle strip. Each input segment is
 * expanded perpendicular by lineWidth/2 on each side. For a polyline of
 * N vertices, the expanded geometry has 2N triangles. Adjacent vertices
 * share corners (miter joins); no end caps (flat ends sufficient for
 * charts that extend to the axis edge).
 *
 * The fragment shader derives a smooth signed distance from the line
 * centerline (via the varying `vSide` which runs [-1..+1] across the
 * thickness) and uses smoothstep to soften the last ~1 px on each side.
 * This eliminates the aliased "staircase" look that pure triangle-strip
 * geometry produces when edges fall between pixel centers.
 */
export function createLinePass(ctx: ReglContext): LinePass {
  const { regl } = ctx;

  interface Uniforms {
    viewport: [number, number];
    color: [number, number, number, number];
    lineWidth: number;
  }

  interface Attributes {
    position: Float32Array;
    normal: Float32Array;
    side: Float32Array;
  }

  type Props = Attributes & Uniforms & { count: number };

  const cmd = regl({
    vert: `
      precision highp float;
      attribute vec2 position;
      attribute vec2 normal;
      attribute float side;
      uniform vec2 viewport;
      uniform float lineWidth;
      varying float vSide;
      varying float vHalfWidth;
      void main() {
        vec2 offset = normal * (lineWidth * 0.5) * side;
        vec2 px = position + offset;
        vec2 ndc = (px / viewport) * 2.0 - 1.0;
        gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
        vSide = side;
        vHalfWidth = lineWidth * 0.5;
      }
    `,
    frag: `
      precision highp float;
      uniform vec4 color;
      varying float vSide;
      varying float vHalfWidth;
      void main() {
        // vSide runs [-1, +1] across the strip. Distance from centerline
        // in pixels is abs(vSide) * vHalfWidth. Fade the last ~1 px.
        float distPx = abs(vSide) * vHalfWidth;
        float feather = clamp(vHalfWidth - distPx, 0.0, 1.0);
        gl_FragColor = vec4(color.rgb, color.a * feather);
      }
    `,
    attributes: {
      position: regl.prop<Attributes, 'position'>('position'),
      normal: regl.prop<Attributes, 'normal'>('normal'),
      side: regl.prop<Attributes, 'side'>('side'),
    },
    uniforms: {
      viewport: regl.prop<Uniforms, 'viewport'>('viewport'),
      color: regl.prop<Uniforms, 'color'>('color'),
      lineWidth: regl.prop<Uniforms, 'lineWidth'>('lineWidth'),
    },
    primitive: 'triangle strip',
    count: (_ctx, props) => (props as unknown as { count: number }).count,
    blend: {
      enable: true,
      func: { src: 'src alpha', dst: 'one minus src alpha' },
    },
  } as Parameters<typeof regl>[0]) as REGL.DrawCommand<REGL.DefaultContext, Props>;

  function buildTriStripData(positions: Float32Array): {
    position: Float32Array;
    normal: Float32Array;
    side: Float32Array;
    count: number;
  } {
    const n = positions.length / 2;
    if (n < 2) {
      return {
        position: new Float32Array(0),
        normal: new Float32Array(0),
        side: new Float32Array(0),
        count: 0,
      };
    }
    // For each vertex, emit it twice: once with side=+1, once with side=-1.
    const count = n * 2;
    const outPos = new Float32Array(count * 2);
    const outNorm = new Float32Array(count * 2);
    const outSide = new Float32Array(count);
    for (let i = 0; i < n; i++) {
      const px = positions[i * 2] ?? 0;
      const py = positions[i * 2 + 1] ?? 0;
      // Compute the tangent of this segment (forward difference,
      // backward for last vertex).
      let tx: number;
      let ty: number;
      if (i < n - 1) {
        tx = (positions[(i + 1) * 2] ?? 0) - px;
        ty = (positions[(i + 1) * 2 + 1] ?? 0) - py;
      } else {
        tx = px - (positions[(i - 1) * 2] ?? 0);
        ty = py - (positions[(i - 1) * 2 + 1] ?? 0);
      }
      const tLen = Math.hypot(tx, ty) || 1;
      const nx = -ty / tLen;
      const ny = tx / tLen;
      // Pair of vertices (+side, -side)
      outPos[i * 4] = px;
      outPos[i * 4 + 1] = py;
      outPos[i * 4 + 2] = px;
      outPos[i * 4 + 3] = py;
      outNorm[i * 4] = nx;
      outNorm[i * 4 + 1] = ny;
      outNorm[i * 4 + 2] = nx;
      outNorm[i * 4 + 3] = ny;
      outSide[i * 2] = 1;
      outSide[i * 2 + 1] = -1;
    }
    return { position: outPos, normal: outNorm, side: outSide, count };
  }

  return {
    draw(input) {
      const data = buildTriStripData(input.positions);
      if (data.count === 0) return;
      // Add 1 px of padding on each side so the AA feather has room to fade.
      cmd({
        position: data.position,
        normal: data.normal,
        side: data.side,
        viewport: [ctx.sizePx.width, ctx.sizePx.height],
        color: [...input.color] as [number, number, number, number],
        lineWidth: input.lineWidth + 2,
        count: data.count,
      });
    },
    destroy() {
      // regl draw commands are released when regl.destroy() is called.
    },
  };
}
