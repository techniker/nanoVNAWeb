import { FakeTransport } from '@nanovnaweb/device';
import { isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { DriverRegistry } from '../src/registry.js';
import { v1DriverProbe } from '../src/v1/probe.js';

describe('DriverRegistry + v1 probe', () => {
  it('detects a V1 NanoVNA via canned response and produces a V1Driver', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    // Delay must be > 50 ms so the reply arrives after the pre-flush drain completes.
    setTimeout(() => {
      t.pushText('info\r\nboard: NanoVNA-H\r\nfirmware: 1.0.46\r\nhardware: 3.2\r\nch> \r\n');
    }, 70);

    const reg = new DriverRegistry();
    reg.register(v1DriverProbe);
    const r = await reg.detect(t);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.info.displayName).toBe('NanoVNA-H');
      expect(r.value.info.driverKind).toBe('v1');
    }
  });
});
