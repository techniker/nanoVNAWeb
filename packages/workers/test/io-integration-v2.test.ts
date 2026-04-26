import { FakeTransport } from '@nanovnaweb/device';
import { DriverRegistry, v1DriverProbe, v2DriverProbe } from '@nanovnaweb/protocol';
import { MemoryRingLogger, asHz, isOk } from '@nanovnaweb/shared';
import type { Frame } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { IoService } from '../src/io-service.js';

function makeRecord(
  fwd0: [number, number],
  rev0: [number, number],
  rev1: [number, number],
  freqIndex: number,
): Uint8Array {
  const buf = new Uint8Array(32);
  const view = new DataView(buf.buffer);
  view.setInt32(0, fwd0[0], true);
  view.setInt32(4, fwd0[1], true);
  view.setInt32(8, rev0[0], true);
  view.setInt32(12, rev0[1], true);
  view.setInt32(16, rev1[0], true);
  view.setInt32(20, rev1[1], true);
  view.setUint16(24, freqIndex, true);
  return buf;
}

describe('io-worker integration (V2)', () => {
  it('connect → setSweep → stream → frames arrive', async () => {
    const transport = new FakeTransport();
    const registry = new DriverRegistry();
    registry.register(v2DriverProbe);
    registry.register(v1DriverProbe);
    const logger = new MemoryRingLogger(1000);

    const service = new IoService({
      openTransport: async () => {
        await transport.open({ baudRate: 115200 });
        return { kind: 'ok', value: transport };
      },
      registry,
      logger,
    });

    // Probe response: V2Plus (variant=0x03, hwRev=0x02, fwMajor=0x01, fwMinor=0x17).
    // Delay > 50 ms so bytes arrive after probeV2's initial drain step.
    setTimeout(() => {
      transport.pushBytes(Uint8Array.of(0x03, 0x02, 0x01, 0x17));
    }, 60);

    const info = await service.connect({ probeTimeoutMs: 200 });
    expect(isOk(info)).toBe(true);
    if (isOk(info)) {
      expect(info.value.driverKind).toBe('v2');
    }

    const sweepOk = await service.setSweep({
      start: asHz(1_000_000),
      stop: asHz(3_000_000),
      points: 3,
    });
    expect(isOk(sweepOk)).toBe(true);

    const frames: Frame[] = [];
    const unsub = await service.onFrame((f) => frames.push(f));

    const startOk = await service.startStream();
    expect(isOk(startOk)).toBe(true);

    // First sweep: fwd0=(200,0), rev0=(100,0), rev1=(50,0) → s11=0.5, s21=0.25
    const sweep1 = new Uint8Array(96);
    sweep1.set(makeRecord([200, 0], [100, 0], [50, 0], 0), 0);
    sweep1.set(makeRecord([200, 0], [100, 0], [50, 0], 1), 32);
    sweep1.set(makeRecord([200, 0], [100, 0], [50, 0], 2), 64);
    transport.pushBytes(sweep1);
    await new Promise((r) => setTimeout(r, 50));

    // Second sweep: fwd0=(400,0), rev0=(200,0), rev1=(100,0) → s11=0.5, s21=0.25
    const sweep2 = new Uint8Array(96);
    sweep2.set(makeRecord([400, 0], [200, 0], [100, 0], 0), 0);
    sweep2.set(makeRecord([400, 0], [200, 0], [100, 0], 1), 32);
    sweep2.set(makeRecord([400, 0], [200, 0], [100, 0], 2), 64);
    transport.pushBytes(sweep2);
    await new Promise((r) => setTimeout(r, 50));

    expect(frames.length).toBeGreaterThanOrEqual(2);

    const f0 = frames[0];
    if (!f0) throw new Error('expected at least one frame');
    expect(f0.s11).toHaveLength(3);
    expect(f0.s11[0]).toEqual({ re: 0.5, im: 0 });
    expect(f0.s21).toBeDefined();
    expect(f0.s21?.[0]).toEqual({ re: 0.25, im: 0 });

    const f1 = frames[1];
    if (!f1) throw new Error('expected at least two frames');
    expect(f1.s11).toHaveLength(3);

    await service.stopStream();
    await unsub();
    await service.disconnect();
  });
});
