import type REGL from 'regl';
import type { ReglContext } from './setup.js';

export interface GridSpec {
  readonly major: Float32Array; // pairs of pixel coords: x0,y0,x1,y1,…
  readonly minor: Float32Array;
  readonly majorColor: readonly [number, number, number, number];
  readonly minorColor: readonly [number, number, number, number];
}

export interface GridPass {
  draw(spec: GridSpec): void;
  destroy(): void;
}

export function createGridPass(ctx: ReglContext): GridPass {
  const { regl } = ctx;

  interface Props {
    positions: Float32Array;
    color: [number, number, number, number];
    viewport: [number, number];
    count: number;
  }

  const cmd = regl({
    vert: `
      precision highp float;
      attribute vec2 position;
      uniform vec2 viewport;
      void main() {
        vec2 ndc = (position / viewport) * 2.0 - 1.0;
        gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
      }
    `,
    frag: `
      precision highp float;
      uniform vec4 color;
      void main() { gl_FragColor = color; }
    `,
    attributes: {
      position: regl.prop<Props, 'positions'>('positions'),
    },
    uniforms: {
      viewport: regl.prop<Props, 'viewport'>('viewport'),
      color: regl.prop<Props, 'color'>('color'),
    },
    primitive: 'lines',
    count: (_c, p) => (p as unknown as Props).count,
    blend: {
      enable: true,
      func: { src: 'src alpha', dst: 'one minus src alpha' },
    },
  } as Parameters<typeof regl>[0]) as REGL.DrawCommand<REGL.DefaultContext, Props>;

  function drawLines(
    positions: Float32Array,
    color: readonly [number, number, number, number],
  ): void {
    if (positions.length < 4) return;
    cmd({
      positions,
      viewport: [ctx.sizePx.width, ctx.sizePx.height],
      color: [...color] as [number, number, number, number],
      count: positions.length / 2,
    });
  }

  return {
    draw(spec) {
      drawLines(spec.minor, spec.minorColor);
      drawLines(spec.major, spec.majorColor);
    },
    destroy() {
      // released via regl.destroy()
    },
  };
}
