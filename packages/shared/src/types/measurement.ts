import type { Hz } from '../units.js';

export interface Complex {
  readonly re: number;
  readonly im: number;
}

export interface Frame {
  readonly sequence: number;
  readonly timestamp: number;
  readonly frequencies: readonly Hz[];
  readonly s11: readonly Complex[];
  readonly s21?: readonly Complex[];
}

export interface TraceRecord {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  /**
   * Absent when the trace was imported from a file (e.g., Touchstone).
   * Present only when the trace was recorded from a live device.
   */
  readonly driverKind?: 'v1' | 'v2';
  readonly frame: Frame;
  readonly tags?: readonly string[];
}
