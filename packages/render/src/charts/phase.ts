import type { Complex } from '@nanovnaweb/shared';
import { phaseDeg, unwrapPhaseDeg } from '../math/phase.js';
import { createGridPass } from '../regl/grid-pass.js';
import { createLinePass } from '../regl/line-pass.js';
import { createReglContext } from '../regl/setup.js';
import type { ChartInstance, ChartRenderer } from '../types.js';
import { drawRectangularAtop } from './rectangular.js';

export const phaseRenderer: ChartRenderer = {
  kind: 'phase',
  displayName: 'Phase',
  mount(canvas) {
    const ctx = createReglContext(canvas);
    const linePass = createLinePass(ctx);
    const gridPass = createGridPass(ctx);

    const instance: ChartInstance = {
      resize(width, height, dpr) {
        ctx.resizeToCss(width, height, dpr);
      },
      draw(frame, traces, format, theme) {
        const opts = format.phase ?? ({ unwrap: false, units: 'deg', xScale: 'linear' } as const);
        const toY = (samples: readonly Complex[]): readonly number[] => {
          const raw = samples.map(phaseDeg);
          const result = opts.unwrap ? unwrapPhaseDeg(raw) : raw;
          if (opts.units === 'rad') {
            return [...result].map((d) => (d * Math.PI) / 180);
          }
          return result;
        };
        drawRectangularAtop(
          ctx,
          linePass,
          gridPass,
          frame,
          traces,
          toY,
          'phase',
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
