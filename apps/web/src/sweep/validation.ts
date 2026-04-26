import {
  type DeviceCapabilities,
  type Result,
  type SweepParams,
  err,
  ok,
} from '@nanovnaweb/shared';

export interface SweepValidationError {
  readonly field: 'start' | 'stop' | 'points' | 'range';
  readonly message: string;
}

export function validateSweep(
  params: SweepParams,
  caps: DeviceCapabilities,
): Result<SweepParams, SweepValidationError> {
  if (params.start < caps.minFrequencyHz) {
    return err({
      field: 'start',
      message: `Start must be ≥ ${caps.minFrequencyHz} Hz`,
    });
  }
  if (params.stop > caps.maxFrequencyHz) {
    return err({
      field: 'stop',
      message: `Stop must be ≤ ${caps.maxFrequencyHz} Hz`,
    });
  }
  if (params.stop <= params.start) {
    return err({
      field: 'range',
      message: 'Stop must be greater than start',
    });
  }
  if (params.points <= 0 || params.points > caps.maxPoints) {
    return err({
      field: 'points',
      message: `Points must be between 1 and ${caps.maxPoints}`,
    });
  }
  return ok(params);
}
