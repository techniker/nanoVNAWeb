import { FakeTransport } from '@nanovnaweb/device';
import { isErr, isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { probeV2 } from '../src/v2/probe.js';

async function scriptBytes(t: FakeTransport, bytes: number[], delayMs = 2): Promise<void> {
  setTimeout(() => {
    t.pushBytes(Uint8Array.from(bytes));
  }, delayMs);
}

describe('probeV2', () => {
  it('identifies a V2Plus device and populates capabilities', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    // Script responses in order: variant, hwRev, fwMajor, fwMinor (1 byte each).
    // Delay is > 50 ms so bytes arrive after the initial drain step.
    scriptBytes(t, [0x03, 0x02, 0x01, 0x17], 60);
    const r = await probeV2(t, { timeoutMs: 200 });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.driverKind).toBe('v2');
      expect(r.value.displayName).toBe('NanoVNA-V2Plus');
      expect(r.value.firmware).toBe('1.23');
      expect(r.value.hardware).toBe('2');
      expect(r.value.capabilities.maxFrequencyHz).toBe(4_000_000_000);
      expect(r.value.capabilities.supportsS21).toBe(true);
      expect(r.value.capabilities.supportsAveraging).toBe(true);
    }
  });

  it('identifies a base V2 device with supportsS21=false', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    // Delay > 50 ms so bytes arrive after the initial drain step.
    scriptBytes(t, [0x02, 0x01, 0x01, 0x00], 60);
    const r = await probeV2(t, { timeoutMs: 200 });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.displayName).toBe('NanoVNA-V2');
      expect(r.value.capabilities.maxFrequencyHz).toBe(3_000_000_000);
      expect(r.value.capabilities.supportsS21).toBe(false);
    }
  });

  it('identifies a V2Plus4 device', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    // Delay > 50 ms so bytes arrive after the initial drain step.
    scriptBytes(t, [0x04, 0x01, 0x01, 0x00], 60);
    const r = await probeV2(t, { timeoutMs: 200 });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.displayName).toBe('NanoVNA-V2Plus4');
      expect(r.value.capabilities.maxFrequencyHz).toBe(4_400_000_000);
      expect(r.value.capabilities.supportsS21).toBe(true);
    }
  });

  it('returns no-match when the variant byte is unknown', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    scriptBytes(t, [0x7f]); // not a valid variant
    const r = await probeV2(t, { timeoutMs: 100 });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('no-match');
  });

  it('returns no-match when nothing arrives before timeout', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const r = await probeV2(t, { timeoutMs: 50 });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('no-match');
  });

  it('writes only opcode/address bytes (no CR or LF) during probing', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    // Delay > 50 ms so bytes arrive after the initial drain step.
    scriptBytes(t, [0x02, 0x01, 0x01, 0x00], 60);
    await probeV2(t, { timeoutMs: 200 });
    const written = t.getWritten();
    for (const b of written) {
      expect(b).not.toBe(0x0a);
      expect(b).not.toBe(0x0d);
    }
  });

  it('drains pending bytes before issuing READ commands', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    // Residual byte from a previous session
    t.pushBytes(Uint8Array.of(0xff));
    // Real V2 response arrives after 70ms (post-drain)
    setTimeout(() => {
      t.pushBytes(Uint8Array.of(0x03, 0x02, 0x01, 0x17));
    }, 70);
    const r = await probeV2(t, { timeoutMs: 300 });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.displayName).toBe('NanoVNA-V2Plus');
    }
  });
});
