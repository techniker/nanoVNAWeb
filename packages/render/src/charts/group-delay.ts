import type { Complex, Frame, Hz } from '@nanovnaweb/shared';
import { parseCssColor } from '../color.js';
import { computeGroupDelay } from '../math/group-delay.js';
import { phaseDeg } from '../math/phase.js';
import { freqToX, resolveYRange, valueToY } from '../math/transforms.js';
import { createGridPass } from '../regl/grid-pass.js';
import { createLinePass } from '../regl/line-pass.js';
import { createReglContext } from '../regl/setup.js';
import type { ChartInstance, ChartRenderer, SParam, TraceBinding } from '../types.js';

const parseColor = parseCssColor;

function pick(frame: Frame, sp: SParam): readonly Complex[] | undefined {
  return sp === 's11' ? frame.s11 : frame.s21;
}

export const groupDelayRenderer: ChartRenderer = {
  kind: 'groupDelay',
  displayName: 'Group Delay',
  mount(canvas) {
    const ctx = createReglContext(canvas);
    const linePass = createLinePass(ctx);
    const gridPass = createGridPass(ctx);

    const instance: ChartInstance = {
      resize(width, height, dpr) {
        ctx.resizeToCss(width, height, dpr);
      },
      draw(frame, traces, format, theme) {
        const opts = format.groupDelay ?? ({ units: 'ns', xScale: 'linear' } as const);
        const unitScale = opts.units === 'ns' ? 1e9 : opts.units === 'ps' ? 1e12 : 1;

        const { width, height } = ctx.sizePx;
        const { regl } = ctx;
        regl.clear({ color: parseColor(theme.bg), depth: 1 });

        const freqs = frame.frequencies as readonly Hz[];
        if (freqs.length < 2) return;
        const fMin = (freqs[0] ?? 0) as number;
        const fMax = (freqs[freqs.length - 1] ?? 0) as number;

        interface Computed {
          readonly t: TraceBinding;
          readonly midFreqs: number[];
          readonly delays: number[];
        }
        const computed: Computed[] = [];
        const allY: number[] = [];
        for (const t of traces) {
          if (!t.visible) continue;
          const src = t.source === 'live' ? frame : format.overlayFrames?.[t.id];
          if (!src) continue;
          const samples = pick(src, t.sParam);
          if (!samples) continue;
          const phasesRad = samples.map((g) => (phaseDeg(g) * Math.PI) / 180);
          const delaysSec = computeGroupDelay(phasesRad, src.frequencies as readonly number[]);
          const delays = [...delaysSec].map((s) => s * unitScale);
          const midFreqs: number[] = [];
          const srcFreqs = src.frequencies as readonly Hz[];
          for (let i = 0; i < delays.length; i++) {
            const f1 = (srcFreqs[i] ?? 0) as number;
            const f2 = (srcFreqs[i + 1] ?? 0) as number;
            midFreqs.push((f1 + f2) / 2);
          }
          computed.push({ t, midFreqs, delays });
          allY.push(...delays);
        }
        const yRange = resolveYRange('groupDelay', allY, format);

        // Grid: 10x10
        const majorSegs: number[] = [];
        for (let i = 0; i <= 10; i++) {
          const x = (i / 10) * width;
          majorSegs.push(x, 0, x, height);
        }
        for (let i = 0; i <= 10; i++) {
          const y = (i / 10) * height;
          majorSegs.push(0, y, width, y);
        }
        gridPass.draw({
          major: new Float32Array(majorSegs),
          minor: new Float32Array(0),
          majorColor: parseColor(theme.gridMajor),
          minorColor: parseColor(theme.gridLine),
        });

        for (const c of computed) {
          const positions = new Float32Array(c.delays.length * 2);
          for (let i = 0; i < c.delays.length; i++) {
            positions[i * 2] = freqToX(c.midFreqs[i] ?? 0, fMin, fMax, width, opts.xScale);
            positions[i * 2 + 1] = valueToY(c.delays[i] ?? 0, yRange.min, yRange.max, height);
          }
          linePass.draw({
            positions,
            color: parseColor(c.t.color),
            lineWidth: (c.t.lineWidth ?? 1.5) * (globalThis.devicePixelRatio ?? 1),
          });
        }
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
