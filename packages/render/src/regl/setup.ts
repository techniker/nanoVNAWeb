import createRegl, { type Regl } from 'regl';

export interface ReglContext {
  readonly regl: Regl;
  sizePx: { width: number; height: number };
  /**
   * Resizes the underlying canvas's backing store to `widthCss * dpr` ×
   * `heightCss * dpr` pixels and refreshes regl's cached viewport so all
   * subsequent draws cover the full canvas. Callers must invoke this any
   * time the layout size changes; without the `regl.poll()` step regl
   * keeps drawing into the previous (often default 300x150) region.
   */
  resizeToCss(widthCss: number, heightCss: number, dpr: number): void;
  destroy(): void;
}

export function createReglContext(canvas: HTMLCanvasElement | OffscreenCanvas): ReglContext {
  const regl = createRegl({
    canvas: canvas as HTMLCanvasElement,
    attributes: {
      premultipliedAlpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    },
    extensions: ['OES_standard_derivatives'],
  });
  const ctx: ReglContext = {
    regl,
    sizePx: {
      width: (canvas as HTMLCanvasElement).width,
      height: (canvas as HTMLCanvasElement).height,
    },
    resizeToCss(widthCss, heightCss, dpr) {
      const c = canvas as HTMLCanvasElement;
      const w = Math.max(1, Math.round(widthCss * dpr));
      const h = Math.max(1, Math.round(heightCss * dpr));
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
      ctx.sizePx = { width: w, height: h };
      // regl caches the GL viewport at initialization and from its own poll
      // loop; explicitly poll so the next draw covers the new framebuffer.
      regl.poll();
    },
    destroy() {
      regl.destroy();
    },
  };
  return ctx;
}
