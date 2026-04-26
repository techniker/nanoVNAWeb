import type { Frame } from '@nanovnaweb/shared';

export type ChartKind = 'rect' | 'smith' | 'vswr' | 'phase' | 'groupDelay';
export type SParam = 's11' | 's21';

export interface TraceBinding {
  readonly id: string;
  readonly sParam: SParam;
  readonly color: string;
  readonly lineWidth?: number;
  readonly visible: boolean;
  readonly source: 'live' | 'recorded' | 'imported';
}

export interface ChartFormatOpts {
  readonly rect?: {
    readonly mode: 'db-mag' | 'linear-mag';
    readonly yMin?: number;
    readonly yMax?: number;
    readonly xScale: 'linear' | 'log';
  };
  readonly smith?: {
    readonly showImpedanceGrid: boolean;
    readonly referenceOhm?: number;
  };
  readonly vswr?: {
    readonly yMin?: number;
    readonly yMax?: number;
    readonly xScale: 'linear' | 'log';
  };
  readonly phase?: {
    readonly unwrap: boolean;
    readonly units: 'deg' | 'rad';
    readonly xScale: 'linear' | 'log';
  };
  readonly groupDelay?: {
    readonly units: 'ns' | 'ps' | 's';
    readonly xScale: 'linear' | 'log';
  };
  readonly overlayFrames?: Readonly<Record<string, Frame>>;
}

export interface ThemeTokens {
  readonly bg: string;
  readonly fg: string;
  readonly gridLine: string;
  readonly gridMajor: string;
  readonly axis: string;
  readonly label: string;
  readonly tracePalette: readonly string[];
}

export interface ChartRenderer {
  readonly kind: ChartKind;
  readonly displayName: string;
  mount(canvas: HTMLCanvasElement | OffscreenCanvas): ChartInstance;
}

export interface ChartInstance {
  resize(width: number, height: number, dpr: number): void;
  draw(
    frame: Frame,
    traces: readonly TraceBinding[],
    format: ChartFormatOpts,
    theme: ThemeTokens,
  ): void;
  destroy(): void;
}
