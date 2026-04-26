import { FakeTransport } from '@nanovnaweb/device';
import { asHz, isOk } from '@nanovnaweb/shared';
import type { Frame } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { V1Driver } from '../src/v1/driver.js';

function cannedSweepReply(points: number): string {
  // The V1 driver fetches both channels per sweep cycle, so the canned
  // transport stream contains the echo + N samples for `data 0`,
  // followed by the same for `data 1`, with `ch> ` prompts between
  // responses (matching real firmware framing).
  const out: string[] = ['data 0'];
  for (let i = 0; i < points; i++) {
    out.push(`${(0.1 * i).toFixed(4)} ${(-0.2 * i).toFixed(4)}`);
  }
  out.push('ch> ');
  out.push('data 1');
  for (let i = 0; i < points; i++) {
    out.push(`${(0.3 * i).toFixed(4)} ${(-0.4 * i).toFixed(4)}`);
  }
  out.push('ch> ');
  return out.join('\r\n');
}

describe('V1Driver', () => {
  it('setSweep writes sweep <start> <stop> <points>', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V1Driver(t, {
      driverKind: 'v1',
      displayName: 'NanoVNA-H',
      capabilities: {
        minFrequencyHz: asHz(50_000),
        maxFrequencyHz: asHz(1_500_000_000),
        maxPoints: 101,
        supportsS11: true,
        supportsS21: true,
        supportsAveraging: false,
      },
    });
    await drv.setSweep({ start: asHz(1_000_000), stop: asHz(900_000_000), points: 101 });
    expect(t.getWrittenAsText()).toBe('sweep 1000000 900000000 101\r\n');
  });

  it('startStream emits a frame after reading points data lines, then stopStream halts', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V1Driver(t, {
      driverKind: 'v1',
      displayName: 'NanoVNA-H',
      capabilities: {
        minFrequencyHz: asHz(50_000),
        maxFrequencyHz: asHz(1_500_000_000),
        maxPoints: 101,
        supportsS11: true,
        supportsS21: true,
        supportsAveraging: false,
      },
    });
    await drv.setSweep({ start: asHz(100), stop: asHz(200), points: 3 });
    t.clearWritten();

    const frames: Frame[] = [];
    drv.events.on('frame', (f) => frames.push(f));

    const started = await drv.startStream();
    expect(isOk(started)).toBe(true);

    // feed one sweep worth of data
    t.pushText(cannedSweepReply(3));
    await new Promise((r) => setTimeout(r, 30));

    expect(frames.length).toBeGreaterThanOrEqual(1);
    const first = frames[0] as Frame;
    expect(first.s11).toHaveLength(3);
    // S21 must populate too — the driver fetches both channels every
    // sweep so the user can switch between S11 and S21 in any chart
    // without reconfiguring the device.
    expect(first.s21).toHaveLength(3);
    // s11 line 0 came from `0.0000 -0.0000`, s21 line 0 from `0.0000 -0.0000`
    // (both i=0). At i=1 they diverge: s11 = (0.1, -0.2), s21 = (0.3, -0.4).
    expect(first.s11?.[1]).toEqual({ re: 0.1, im: -0.2 });
    expect(first.s21?.[1]).toEqual({ re: 0.3, im: -0.4 });
    expect(first.frequencies).toEqual([100, 150, 200]);

    await drv.stopStream();
    await drv.dispose();
  });
});
