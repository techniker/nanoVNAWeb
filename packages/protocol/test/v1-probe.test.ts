import { FakeTransport } from '@nanovnaweb/device';
import { isErr, isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { parseInfo } from '../src/v1/parsers.js';
import { probeV1 } from '../src/v1/probe.js';

async function scriptReply(t: FakeTransport, reply: string, delayMs = 5): Promise<void> {
  // schedule the reply to arrive shortly after the probe writes its command
  setTimeout(() => {
    t.pushText(reply);
  }, delayMs);
}

describe('probeV1', () => {
  it('returns a DeviceInfo when the device responds with a NanoVNA info block', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    // Delay must be > 50 ms so the reply arrives after the pre-flush drain completes.
    await scriptReply(
      t,
      'info\r\nboard: NanoVNA-H\r\nfirmware: 1.0.46\r\nhardware: 3.2\r\nch> \r\n',
      70,
    );
    const result = await probeV1(t, { timeoutMs: 500 });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.displayName).toBe('NanoVNA-H');
      expect(result.value.driverKind).toBe('v1');
    }
  });

  it('returns a no-match ProbeError when nothing resembling NanoVNA arrives before timeout', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const result = await probeV1(t, { timeoutMs: 50 });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe('no-match');
    }
  });

  it('sends a leading CRLF to flush any residual bytes before the info command', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    scriptReply(t, 'info\r\nboard: NanoVNA-H\r\nfirmware: 1.0.46\r\nhardware: 3.2\r\nch> \r\n');
    await probeV1(t, { timeoutMs: 500 });
    const written = t.getWrittenAsText();
    // Leading CRLF is the pre-flush; info\r\n follows.
    expect(written.startsWith('\r\n')).toBe(true);
    expect(written).toContain('info\r\n');
  });
});

describe('parseInfo board-specific capabilities', () => {
  it('NanoVNA-H board gets 1.5 GHz maxFrequencyHz', () => {
    const info = parseInfo(['board: NanoVNA-H', 'firmware: 1.0.46']);
    expect(info.capabilities.maxFrequencyHz).toBe(1_500_000_000);
  });

  it('NanoVNA-H4 board gets 1.5 GHz maxFrequencyHz', () => {
    const info = parseInfo(['board: NanoVNA-H4', 'firmware: 1.0.46']);
    expect(info.capabilities.maxFrequencyHz).toBe(1_500_000_000);
  });

  it('plain NanoVNA board gets 900 MHz maxFrequencyHz', () => {
    const info = parseInfo(['board: NanoVNA', 'firmware: 1.0.46']);
    expect(info.capabilities.maxFrequencyHz).toBe(900_000_000);
  });

  it('unknown board falls back to 900 MHz maxFrequencyHz', () => {
    const info = parseInfo(['board: Acme-VNA', 'firmware: 0.0.1']);
    expect(info.capabilities.maxFrequencyHz).toBe(900_000_000);
  });

  it('V1 capabilities advertise supportsS11=true, supportsS21=true, supportsAveraging=false', () => {
    // Every supported V1 board (NanoVNA, -H, -H4, -F, F V2/V3) has a
    // CH1 / through port and answers `data 1`, so supportsS21 is true
    // by default. Averaging is not part of the V1 USB protocol.
    const info = parseInfo(['board: NanoVNA-H']);
    expect(info.capabilities.supportsS11).toBe(true);
    expect(info.capabilities.supportsS21).toBe(true);
    expect(info.capabilities.supportsAveraging).toBe(false);
  });
});
