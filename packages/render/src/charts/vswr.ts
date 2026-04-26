import type { Complex } from '@nanovnaweb/shared';
import { computeVswr } from '../math/vswr.js';
import { createGridPass } from '../regl/grid-pass.js';
import { createLinePass } from '../regl/line-pass.js';
import { createReglContext } from '../regl/setup.js';
import type { ChartInstance, ChartRenderer } from '../types.js';
import { drawRectangularAtop } from './rectangular.js';

function vswrValues(samples: readonly Complex[]): readonly number[] {
  return samples.map((g) => {
    const v = computeVswr(g);
    // Cap at 99 for display purposes; Infinity breaks plotting.
    return Number.isFinite(v) ? v : 99;
  });
}

export const vswrRenderer: ChartRenderer = {
  kind: 'vswr',
  displayName: 'VSWR',
  mount(canvas) {
    const ctx = createReglContext(canvas);
    const linePass = createLinePass(ctx);
    const gridPass = createGridPass(ctx);

    const instance: ChartInstance = {
      resize(width, height, dpr) {
        ctx.resizeToCss(width, height, dpr);
      },
      draw(frame, traces, format, theme) {
        const opts = format.vswr ?? ({ xScale: 'linear' } as const);
        drawRectangularAtop(
          ctx,
          linePass,
          gridPass,
          frame,
          traces,
          vswrValues,
          'vswr',
          format,
          opts.xScale,
          format.overlayFrames,
          theme,
        );
      },
      destroy() {
        linePass.destroy();
        gridPass.destroy();
        ctx.destroy();
      },
    };
    return instance;
  },
};
