import { FakeTransport } from '@nanovnaweb/device';
import { DriverRegistry, v1DriverProbe } from '@nanovnaweb/protocol';
import { MemoryRingLogger, asHz, isOk } from '@nanovnaweb/shared';
import type { Frame } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { IoService } from '../src/io-service.js';

describe('io-worker integration (fake transport)', () => {
  it('vertical slice: connect → sweep → stream → frames arrive', async () => {
    const transport = new FakeTransport();
    const registry = new DriverRegistry();
    registry.register(v1DriverProbe);
    const logger = new MemoryRingLogger(1000);

    const service = new IoService({
      openTransport: async (_opts) => {
        await transport.open({ baudRate: 115200 });
        return { kind: 'ok', value: transport };
      },
      registry,
      logger,
    });

    // Delay must be > 50 ms so the reply arrives after the pre-flush drain completes.
    setTimeout(() => {
      transport.pushText(
        'info\r\nboard: NanoVNA-H\r\nfirmware: 1.0.46\r\nhardware: 3.2\r\nch> \r\n',
      );
    }, 70);

    const info = await service.connect({ probeTimeoutMs: 500 });
    expect(isOk(info)).toBe(true);

    const sweepOk = await service.setSweep({
      start: asHz(1_000_000),
      stop: asHz(900_000_000),
      points: 11,
    });
    expect(isOk(sweepOk)).toBe(true);

    const frames: Frame[] = [];
    const unsub = await service.onFrame((f) => frames.push(f));

    const startOk = await service.startStream();
    expect(isOk(startOk)).toBe(true);

    // Push two full sweeps worth of canned data. The V1 driver pump
    // fetches both `data 0` (s11) and `data 1` (s21) per cycle, so each
    // sweep needs both response blocks or the pump waits forever.
    for (let sweep = 0; sweep < 2; sweep++) {
      const lines = ['data 0'];
      for (let i = 0; i < 11; i++) {
        lines.push(`${0.01 * (sweep + 1) * i} ${-0.01 * (sweep + 1) * i}`);
      }
      lines.push('ch> ');
      lines.push('data 1');
      for (let i = 0; i < 11; i++) {
        lines.push(`${0.02 * (sweep + 1) * i} ${-0.02 * (sweep + 1) * i}`);
      }
      lines.push('ch> ');
      transport.pushText(`${lines.join('\r\n')}\r\n`);
      await new Promise((r) => setTimeout(r, 20));
    }

    expect(frames.length).toBeGreaterThanOrEqual(2);
    const [f0, f1] = frames;
    expect(f0?.s11).toHaveLength(11);
    expect(f0?.s21).toHaveLength(11);
    expect(f1?.s11).toHaveLength(11);
    expect(f1?.s21).toHaveLength(11);
    expect(f0?.frequencies[0]).toBe(1_000_000);
    expect(f0?.frequencies[10]).toBe(900_000_000);

    await service.stopStream();
    await unsub();
    await service.disconnect();
  });
});
