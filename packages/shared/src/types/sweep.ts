import type { Hz } from '../units.js';

export interface SweepParams {
  readonly start: Hz;
  readonly stop: Hz;
  readonly points: number;
  readonly ifBandwidthHz?: Hz;
  readonly averaging?: number;
}
