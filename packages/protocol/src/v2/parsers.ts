import { type Complex, type Result, type SweepParams, err, ok } from '@nanovnaweb/shared';
import { FIFO_RECORD_BYTES } from './protocol.js';

export type DecodeErrorKind = 'truncated' | 'out-of-range';

export class DecodeError extends Error {
  constructor(
    public readonly kind: DecodeErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'DecodeError';
  }
}

export function parseRead1Response(bytes: Uint8Array): Result<number, DecodeError> {
  if (bytes.byteLength < 1) {
    return err(new DecodeError('truncated', 'expected 1 byte'));
  }
  return ok((bytes[0] ?? 0) & 0xff);
}

export function parseRead2Response(bytes: Uint8Array): Result<number, DecodeError> {
  if (bytes.byteLength < 2) {
    return err(new DecodeError('truncated', 'expected 2 bytes'));
  }
  const lo = (bytes[0] ?? 0) & 0xff;
  const hi = (bytes[1] ?? 0) & 0xff;
  return ok(lo | (hi << 8));
}

export function parseRead4Response(bytes: Uint8Array): Result<number, DecodeError> {
  if (bytes.byteLength < 4) {
    return err(new DecodeError('truncated', 'expected 4 bytes'));
  }
  // Arithmetic assembly stays correct above 2^31.
  const b0 = (bytes[0] ?? 0) & 0xff;
  const b1 = (bytes[1] ?? 0) & 0xff;
  const b2 = (bytes[2] ?? 0) & 0xff;
  const b3 = (bytes[3] ?? 0) & 0xff;
  return ok(b0 + b1 * 0x100 + b2 * 0x10000 + b3 * 0x1000000);
}

export interface FifoRecord {
  readonly fwd0: Complex;
  readonly rev0: Complex;
  readonly rev1: Complex;
  readonly freqIndex: number;
}

export function parseFifoRecord(
  bytes: Uint8Array,
  offset: number,
): Result<FifoRecord, DecodeError> {
  if (bytes.byteLength - offset < FIFO_RECORD_BYTES) {
    return err(new DecodeError('truncated', `expected ${FIFO_RECORD_BYTES} bytes from offset`));
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, FIFO_RECORD_BYTES);
  const fwd0: Complex = { re: view.getInt32(0, true), im: view.getInt32(4, true) };
  const rev0: Complex = { re: view.getInt32(8, true), im: view.getInt32(12, true) };
  const rev1: Complex = { re: view.getInt32(16, true), im: view.getInt32(20, true) };
  const freqIndex = view.getUint16(24, true);
  return ok({ fwd0, rev0, rev1, freqIndex });
}

export function divComplex(num: Complex, den: Complex): Complex {
  const denom = den.re * den.re + den.im * den.im;
  if (denom === 0) return { re: 0, im: 0 };
  return {
    re: (num.re * den.re + num.im * den.im) / denom,
    im: (num.im * den.re - num.re * den.im) / denom,
  };
}

export function computeFrequencies(sweep: SweepParams): number[] {
  const start = sweep.start as number;
  const stop = sweep.stop as number;
  const points = sweep.points;
  if (points <= 0) return [];
  if (points === 1) return [start];
  const step = (stop - start) / (points - 1);
  const out = new Array<number>(points);
  for (let i = 0; i < points; i++) out[i] = start + i * step;
  return out;
}
