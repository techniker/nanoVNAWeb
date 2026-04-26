import { groupDelayRenderer } from './charts/group-delay.js';
import { phaseRenderer } from './charts/phase.js';
import { rectangularRenderer } from './charts/rectangular.js';
import { smithRenderer } from './charts/smith.js';
import { vswrRenderer } from './charts/vswr.js';
import type { ChartKind, ChartRenderer } from './types.js';

export class ChartRegistry {
  private readonly byKind = new Map<ChartKind, ChartRenderer>();

  register(renderer: ChartRenderer): void {
    this.byKind.set(renderer.kind, renderer);
  }

  get(kind: ChartKind): ChartRenderer | undefined {
    return this.byKind.get(kind);
  }

  list(): readonly ChartRenderer[] {
    return Object.freeze([...this.byKind.values()]);
  }
}

/**
 * Creates a registry with all 5 built-in renderers registered.
 */
export function createDefaultRegistry(): ChartRegistry {
  const reg = new ChartRegistry();
  reg.register(rectangularRenderer);
  reg.register(smithRenderer);
  reg.register(vswrRenderer);
  reg.register(phaseRenderer);
  reg.register(groupDelayRenderer);
  return reg;
}
