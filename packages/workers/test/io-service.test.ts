import { FakeTransport } from '@nanovnaweb/device';
import { DriverRegistry, v1DriverProbe } from '@nanovnaweb/protocol';
import { MemoryRingLogger, asHz, isOk } from '@nanovnaweb/shared';
import type { Frame } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import type { ConnectionStatus } from '../src/io-api.js';
import { IoService } from '../src/io-service.js';

function makeServiceWithFakeTransport(): {
  service: IoService;
  transport: FakeTransport;
} {
  const transport = new FakeTransport();
  const registry = new DriverRegistry();
  registry.register(v1DriverProbe);
  const logger = new MemoryRingLogger(100);
  const service = new IoService({
    openTransport: async (_opts) => {
      await transport.open({ baudRate: 115200 });
      return { kind: 'ok', value: transport };
    },
    registry,
    logger,
  });
  return { service, transport };
}

function cannedSweepReply(points: number): string {
  // The V1 driver fetches both s11 (`data 0`) and s21 (`data 1`) per
  // sweep cycle, so the canned reply must contain echo + N samples for
  // each. Without the data-1 block the driver waits forever and no
  // frame is ever emitted.
  const out: string[] = ['data 0'];
  for (let i = 0; i < points; i++) out.push(`${0.1 * i} ${-0.2 * i}`);
  out.push('ch> ');
  out.push('data 1');
  for (let i = 0; i < points; i++) out.push(`${0.3 * i} ${-0.4 * i}`);
  out.push('ch> ');
  return out.join('\r\n');
}

describe('IoService', () => {
  it('connect, setSweep, startStream produces frames', async () => {
    const { service, transport } = makeServiceWithFakeTransport();

    // Delay must be > 50 ms so the reply arrives after the pre-flush drain completes.
    setTimeout(() => {
      transport.pushText('info\r\nboard: NanoVNA-H\r\nfirmware: 1.0.46\r\nch> \r\n');
    }, 70);

    const connected = await service.connect({ probeTimeoutMs: 500 });
    expect(isOk(connected)).toBe(true);

    const sweepOk = await service.setSweep({
      start: asHz(100),
      stop: asHz(200),
      points: 3,
    });
    expect(isOk(sweepOk)).toBe(true);

    const frames: Frame[] = [];
    const unsubscribe = await service.onFrame((f) => frames.push(f));

    const startOk = await service.startStream();
    expect(isOk(startOk)).toBe(true);

    transport.pushText(cannedSweepReply(3));
    await new Promise((r) => setTimeout(r, 40));

    expect(frames.length).toBeGreaterThanOrEqual(1);
    expect(frames[0]?.s11).toHaveLength(3);

    await unsubscribe();
    await service.disconnect();
  });

  it('does not emit "lost" status when disconnect() is called cleanly', async () => {
    const { service, transport } = makeServiceWithFakeTransport();

    // Delay must be > 50 ms so the reply arrives after the pre-flush drain completes.
    setTimeout(() => {
      transport.pushText('info\r\nboard: NanoVNA-H\r\nfirmware: 1.0.46\r\nch> \r\n');
    }, 70);

    const statuses: ConnectionStatus[] = [];
    const unsubStatus = await service.onStatus((s) => statuses.push(s));

    await service.connect({ probeTimeoutMs: 500 });
    await service.setSweep({ start: asHz(100), stop: asHz(200), points: 3 });

    const unsubFrame = await service.onFrame(() => {});
    await service.startStream();
    transport.pushText(cannedSweepReply(3));
    await new Promise((r) => setTimeout(r, 30));

    await service.stopStream();
    await service.disconnect();

    await unsubFrame();
    await unsubStatus();

    const kinds = statuses.map((s) => s.state);
    expect(kinds).toContain('connecting');
    expect(kinds).toContain('connected');
    expect(kinds).toContain('disconnected');
    expect(kinds).not.toContain('lost');
  });
});
