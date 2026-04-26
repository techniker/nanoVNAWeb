import type { Transport } from '@nanovnaweb/device';
import {
  type DeviceCapabilities,
  type DeviceInfo,
  type Result,
  asHz,
  err,
  ok,
} from '@nanovnaweb/shared';
import { ProbeError } from '../errors.js';
import type { DriverProbe } from '../registry.js';
import { V2Driver } from './driver.js';
import { buildRead1 } from './frames.js';
import {
  REG_DEVICE_VARIANT,
  REG_FIRMWARE_MAJOR,
  REG_FIRMWARE_MINOR,
  REG_HARDWARE_REVISION,
  V2_MAX_POINTS,
  V2_MIN_HZ,
  VARIANT_MAX_HZ,
  isKnownVariant,
} from './protocol.js';

interface V2ProbeOptions {
  readonly timeoutMs: number;
}

async function drainBriefly(transport: Transport, ms: number): Promise<void> {
  const reader = transport.readable().getReader();
  const timeout = setTimeout(() => {
    reader.cancel().catch(() => {});
  }, ms);
  try {
    while (true) {
      const r = await reader.read().catch(() => ({ value: undefined, done: true }));
      if (r.done) return;
    }
  } finally {
    clearTimeout(timeout);
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}

const VARIANT_NAMES: Record<number, string> = {
  2: 'NanoVNA-V2',
  3: 'NanoVNA-V2Plus',
  4: 'NanoVNA-V2Plus4',
};

export async function probeV2(
  transport: Transport,
  opts: V2ProbeOptions,
): Promise<Result<DeviceInfo, ProbeError>> {
  await drainBriefly(transport, 50);
  const reader = transport.readable().getReader();
  // Leftover bytes from a chunk that contained more than one byte.
  const buf: number[] = [];

  async function nextByte(address: number): Promise<number | null> {
    const w = await transport.write(buildRead1(address));
    if (w.kind === 'err') return null;

    // If we already have a buffered byte from a previous chunk, consume it.
    if (buf.length > 0) return buf.shift() ?? null;

    const deadline = Date.now() + opts.timeoutMs;
    let cancelled = false;
    const cancelHandle = setTimeout(() => {
      cancelled = true;
      reader.cancel().catch(() => {});
    }, opts.timeoutMs);

    try {
      while (Date.now() < deadline && !cancelled) {
        const r = await reader.read().catch(() => ({ value: undefined, done: true as const }));
        if (r.done) return null;
        if (r.value && r.value.byteLength > 0) {
          // Buffer any extra bytes beyond the first.
          for (let i = 1; i < r.value.byteLength; i++) {
            buf.push((r.value[i] ?? 0) & 0xff);
          }
          return (r.value[0] ?? 0) & 0xff;
        }
      }
      return null;
    } finally {
      clearTimeout(cancelHandle);
    }
  }

  try {
    // Issue the four register reads in sequence; each expects 1 byte back.
    const variant = await nextByte(REG_DEVICE_VARIANT);
    if (variant === null || !isKnownVariant(variant)) {
      return err(new ProbeError('no-match', 'no V2 variant byte received'));
    }
    const hwRev = (await nextByte(REG_HARDWARE_REVISION)) ?? 0;
    const fwMajor = (await nextByte(REG_FIRMWARE_MAJOR)) ?? 0;
    const fwMinor = (await nextByte(REG_FIRMWARE_MINOR)) ?? 0;

    const capabilities: DeviceCapabilities = Object.freeze({
      minFrequencyHz: asHz(V2_MIN_HZ),
      maxFrequencyHz: asHz(VARIANT_MAX_HZ[variant] ?? 0),
      maxPoints: V2_MAX_POINTS,
      supportsS11: true,
      supportsS21: variant !== 0x02,
      supportsAveraging: true,
    });

    const info: DeviceInfo = {
      driverKind: 'v2',
      displayName: VARIANT_NAMES[variant] ?? 'NanoVNA-V2',
      capabilities,
      firmware: `${fwMajor}.${fwMinor}`,
      hardware: hwRev.toString(),
    };
    return ok(info);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}

export const v2DriverProbe: DriverProbe = {
  kind: 'v2',
  displayName: 'NanoVNA V2',
  probe: (transport, opts) => probeV2(transport, { timeoutMs: opts.timeoutMs ?? 150 }),
  create: (transport, info) => new V2Driver(transport, info),
};
