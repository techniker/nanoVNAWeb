import type { Hz } from '../units.js';

export type DriverKind = 'v1' | 'v2';

export interface DeviceCapabilities {
  readonly minFrequencyHz: Hz;
  readonly maxFrequencyHz: Hz;
  readonly maxPoints: number;
  readonly supportsS11: boolean;
  readonly supportsS21: boolean;
  readonly supportsAveraging: boolean;
}

export interface DeviceInfo {
  readonly driverKind: DriverKind;
  readonly displayName: string;
  readonly capabilities: DeviceCapabilities;
  readonly firmware?: string;
  readonly hardware?: string;
  readonly serial?: string;
  readonly rawInfo?: string;
}
