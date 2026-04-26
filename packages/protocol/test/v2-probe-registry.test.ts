import { FakeTransport } from '@nanovnaweb/device';
import { isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { DriverRegistry } from '../src/registry.js';
import { v1DriverProbe } from '../src/v1/probe.js';
import { v2DriverProbe } from '../src/v2/probe.js';

describe('DriverRegistry + v2 probe', () => {
  it('V2 device detects as V2 via registry', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    // Delay > 50 ms so bytes arrive after probeV2's initial drain step.
    setTimeout(() => {
      // variant=0x03 (V2Plus), hwRev=0x02, fwMajor=0x01, fwMinor=0x17
      t.pushBytes(Uint8Array.of(0x03, 0x02, 0x01, 0x17));
    }, 60);

    const reg = new DriverRegistry();
    reg.register(v2DriverProbe);
    reg.register(v1DriverProbe);

    const r = await reg.detect(t);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.info.driverKind).toBe('v2');
      expect(r.value.info.displayName).toBe('NanoVNA-V2Plus');
    }
  });

  it('V1 pre-flush never fires when V2 detects first', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    // Delay > 50 ms so bytes arrive after probeV2's initial drain step.
    setTimeout(() => {
      t.pushBytes(Uint8Array.of(0x03, 0x02, 0x01, 0x17));
    }, 60);

    const reg = new DriverRegistry();
    reg.register(v2DriverProbe);
    reg.register(v1DriverProbe);

    const r = await reg.detect(t);
    expect(isOk(r)).toBe(true);
    // V2 probe succeeded before V1 ever got a chance to send its CRLF pre-flush.
    // Therefore there must be NO CR (0x0D) or LF (0x0A) in the entire transport
    // write stream — only V2 probe's opcode/address bytes.
    const written = t.getWritten();
    for (const b of written) {
      expect(b).not.toBe(0x0a);
      expect(b).not.toBe(0x0d);
    }
  });

  it('V1 device detects via fallback when both probes are registered (V2 first)', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    // V2 probe receives nothing and times out (100 ms). V1 probe then
    // sends a pre-flush CRLF and drains for 50 ms (ends at ~150 ms).
    // The pre-flush response below arrives during that drain window and
    // is discarded. V1 then sends 'info' and waits up to 100 ms more
    // (~150–250 ms). The info response arrives well within that window.
    setTimeout(() => {
      t.pushText('ch> \r\n'); // response to pre-flush (discarded by drain)
    }, 115);
    setTimeout(() => {
      t.pushText('info\r\nboard: NanoVNA-H\r\nfirmware: 1.0.46\r\nhardware: 3.2\r\nch> \r\n');
    }, 180);

    const reg = new DriverRegistry();
    reg.register(v2DriverProbe);
    reg.register(v1DriverProbe);

    const r = await reg.detect(t, { timeoutMs: 100 });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.info.driverKind).toBe('v1');
      expect(r.value.info.displayName).toBe('NanoVNA-H');
    }
  });
});
