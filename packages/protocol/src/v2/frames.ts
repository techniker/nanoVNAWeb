import {
  OP_READ1,
  OP_READ2,
  OP_READ4,
  OP_READFIFO,
  OP_WRITE1,
  OP_WRITE2,
  OP_WRITE4,
  OP_WRITEFIFO,
} from './protocol.js';

export function buildRead1(address: number): Uint8Array {
  return Uint8Array.of(OP_READ1, address & 0xff);
}

export function buildRead2(address: number): Uint8Array {
  return Uint8Array.of(OP_READ2, address & 0xff);
}

export function buildRead4(address: number): Uint8Array {
  return Uint8Array.of(OP_READ4, address & 0xff);
}

export function buildWrite1(address: number, value: number): Uint8Array {
  return Uint8Array.of(OP_WRITE1, address & 0xff, value & 0xff);
}

export function buildWrite2(address: number, value: number): Uint8Array {
  return Uint8Array.of(OP_WRITE2, address & 0xff, value & 0xff, (value >>> 8) & 0xff);
}

export function buildWrite4(address: number, value: number): Uint8Array {
  // Use arithmetic rather than bitwise for the high byte to stay safe above 2^31.
  const b0 = value & 0xff;
  const b1 = Math.floor(value / 0x100) & 0xff;
  const b2 = Math.floor(value / 0x10000) & 0xff;
  const b3 = Math.floor(value / 0x1000000) & 0xff;
  return Uint8Array.of(OP_WRITE4, address & 0xff, b0, b1, b2, b3);
}

export function splitU64(hz: number): { lo: number; hi: number } {
  const hi = Math.floor(hz / 2 ** 32);
  const lo = hz - hi * 2 ** 32;
  return { lo, hi };
}

export function buildReadFifo(address: number, numRecords: number): Uint8Array {
  const count = Math.max(0, Math.min(255, Math.trunc(numRecords)));
  return Uint8Array.of(OP_READFIFO, address & 0xff, count);
}

export function buildWriteFifo(address: number, value: number): Uint8Array {
  return Uint8Array.of(OP_WRITEFIFO, address & 0xff, value & 0xff);
}
