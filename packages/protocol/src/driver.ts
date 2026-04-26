import type { DeviceInfo, Frame, Result, SweepParams, TypedEmitter } from '@nanovnaweb/shared';
import type { DriverError } from './errors.js';

export type DriverEvents = {
  frame: Frame;
  log: { level: 'debug' | 'info' | 'warn' | 'error'; message: string; data?: unknown };
  disconnected: { reason: string };
};

export interface Driver {
  readonly info: DeviceInfo;
  readonly events: TypedEmitter<DriverEvents>;
  setSweep(params: SweepParams): Promise<Result<void, DriverError>>;
  startStream(): Promise<Result<void, DriverError>>;
  stopStream(): Promise<Result<void, DriverError>>;
  dispose(): Promise<void>;
}
