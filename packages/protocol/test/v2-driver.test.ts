import { FakeTransport } from '@nanovnaweb/device';
import { type DeviceInfo, asHz, isErr, isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { V2Driver } from '../src/v2/driver.js';

function v2PlusInfo(): DeviceInfo {
  return {
    driverKind: 'v2',
    displayName: 'NanoVNA-V2Plus',
    capabilities: {
      minFrequencyHz: asHz(50_000),
      maxFrequencyHz: asHz(4_000_000_000),
      maxPoints: 1024,
      supportsS11: true,
      supportsS21: true,
      supportsAveraging: true,
    },
    firmware: '1.23',
    hardware: '2',
  };
}

describe('V2Driver setSweep validation', () => {
  it('rejects start below minFrequencyHz', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2PlusInfo());
    const r = await drv.setSweep({ start: asHz(1_000), stop: asHz(100_000_000), points: 101 });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('command-failed');
    await drv.dispose();
  });

  it('rejects stop above maxFrequencyHz', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2PlusInfo());
    const r = await drv.setSweep({
      start: asHz(1_000_000),
      stop: asHz(5_000_000_000),
      points: 101,
    });
    expect(isErr(r)).toBe(true);
    await drv.dispose();
  });

  it('rejects points above maxPoints', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2PlusInfo());
    const r = await drv.setSweep({
      start: asHz(1_000_000),
      stop: asHz(100_000_000),
      points: 2048,
    });
    expect(isErr(r)).toBe(true);
    await drv.dispose();
  });

  it('accepts valid params', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2PlusInfo());
    const r = await drv.setSweep({
      start: asHz(1_000_000),
      stop: asHz(100_000_000),
      points: 101,
    });
    expect(isOk(r)).toBe(true);
    await drv.dispose();
  });
});

describe('V2Driver setSweep byte output', () => {
  it('writes the correct register bytes for a 1–100 MHz 101-point sweep', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2PlusInfo());
    await drv.setSweep({
      start: asHz(1_000_000),
      stop: asHz(100_000_000),
      points: 101,
      averaging: 2,
    });

    const written = t.getWritten();
    // Expected register writes in order:
    //   WRITE4 REG_SWEEP_START_HZ     (addr 0x00) — lo 32 bits of 1_000_000 = 0x000F4240
    //   WRITE4 REG_SWEEP_START_HZ + 4 (addr 0x04) — hi 32 bits = 0
    //   WRITE4 REG_SWEEP_STEP_HZ      (addr 0x10) — lo 32 bits of step
    //   WRITE4 REG_SWEEP_STEP_HZ + 4  (addr 0x14) — hi 32 bits = 0
    //   WRITE2 REG_SWEEP_POINTS       (addr 0x20) — 101 = 0x65 0x00
    //   WRITE2 REG_VALUES_PER_FREQ    (addr 0x22) — 2
    //   WRITEFIFO REG_VALUES_FIFO     (addr 0x30) — clear with 0
    //
    // WRITE4 is 6 bytes, WRITE2 is 4 bytes, WRITEFIFO is 3 bytes.
    // Total = 4*6 + 2*4 + 3 = 35 bytes.
    expect(written.byteLength).toBe(35);
    expect(written[0]).toBe(0x22); // OP_WRITE4
    expect(written[1]).toBe(0x00); // REG_SWEEP_START_HZ low half
    // WRITE4 + 4 is the high half at address 0x04
    expect(written[6]).toBe(0x22);
    expect(written[7]).toBe(0x04);
    // Verify WRITE2 points: should land at offset 4*6 = 24
    expect(written[24]).toBe(0x21); // OP_WRITE2
    expect(written[25]).toBe(0x20); // REG_SWEEP_POINTS
    expect(written[26]).toBe(0x65); // 101 low byte
    expect(written[27]).toBe(0x00);
    // Verify WRITEFIFO clear at offset 32
    expect(written[32]).toBe(0x28); // OP_WRITEFIFO
    expect(written[33]).toBe(0x30); // REG_VALUES_FIFO
    expect(written[34]).toBe(0x00); // clear byte
    await drv.dispose();
  });

  it('writes 4.4 GHz correctly (hi=1, lo=0x0642AC00)', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const infoPlus4: DeviceInfo = {
      ...v2PlusInfo(),
      displayName: 'NanoVNA-V2Plus4',
      capabilities: { ...v2PlusInfo().capabilities, maxFrequencyHz: asHz(4_400_000_000) },
    };
    const drv = new V2Driver(t, infoPlus4);
    await drv.setSweep({
      start: asHz(4_400_000_000),
      stop: asHz(4_400_000_000),
      points: 1,
    });
    const written = t.getWritten();
    // First WRITE4 encodes low 32 bits of 4.4 GHz.
    // 4_400_000_000 = 0x1_0642_AC00 → lo = 0x0642_AC00 (little-endian: 00 AC 42 06)
    expect(written[0]).toBe(0x22);
    expect(written[1]).toBe(0x00); // REG_SWEEP_START_HZ low address
    expect(written[2]).toBe(0x00);
    expect(written[3]).toBe(0xac);
    expect(written[4]).toBe(0x42);
    expect(written[5]).toBe(0x06);
    // Second WRITE4 is the hi half: 0x00000001
    expect(written[6]).toBe(0x22);
    expect(written[7]).toBe(0x04);
    expect(written[8]).toBe(0x01);
    expect(written[9]).toBe(0x00);
    expect(written[10]).toBe(0x00);
    expect(written[11]).toBe(0x00);
    await drv.dispose();
  });
});

describe('V2Driver mode option', () => {
  it('startStream rejects if setSweep was never called', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2PlusInfo());
    const r = await drv.startStream();
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.kind).toBe('not-connected');
    }
    await drv.dispose();
  });

  it('startStream rejects when mode is "stream"', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2PlusInfo(), { mode: 'stream' });
    await drv.setSweep({
      start: asHz(1_000_000),
      stop: asHz(100_000_000),
      points: 11,
    });
    const r = await drv.startStream();
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.kind).toBe('command-failed');
      expect(r.error.message).toContain('stream mode');
    }
    await drv.dispose();
  });

  it('startStream accepts default (polled) mode but pump loop is empty pre-Task-6.4', async () => {
    // This test is intentionally a checkpoint: startStream should succeed even though the
    // pump loop is a no-op in this phase. A full streaming test lands in Task 6.4.
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2PlusInfo());
    await drv.setSweep({
      start: asHz(1_000_000),
      stop: asHz(100_000_000),
      points: 11,
    });
    const r = await drv.startStream();
    expect(isOk(r)).toBe(true);
    await drv.dispose();
  });
});

function v2BaseInfo(): DeviceInfo {
  return {
    driverKind: 'v2',
    displayName: 'NanoVNA-V2',
    capabilities: {
      minFrequencyHz: asHz(50_000),
      maxFrequencyHz: asHz(3_000_000_000),
      maxPoints: 1024,
      supportsS11: true,
      supportsS21: false,
      supportsAveraging: true,
    },
    firmware: '1.23',
    hardware: '2',
  };
}

function makeRecord(fwd0: [number, number], rev0: [number, number], freqIndex: number): Uint8Array {
  const buf = new Uint8Array(32);
  const view = new DataView(buf.buffer);
  view.setInt32(0, fwd0[0], true);
  view.setInt32(4, fwd0[1], true);
  view.setInt32(8, rev0[0], true);
  view.setInt32(12, rev0[1], true);
  view.setInt32(16, 0, true); // rev1 zero for base V2
  view.setInt32(20, 0, true);
  view.setUint16(24, freqIndex, true);
  return buf;
}

describe('V2Driver streaming — S11 only (V2 base)', () => {
  it('emits a Frame with N S11 samples after 3 FIFO records arrive', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2BaseInfo());
    await drv.setSweep({
      start: asHz(1_000_000),
      stop: asHz(3_000_000),
      points: 3,
    });
    t.clearWritten();

    const frames: import('@nanovnaweb/shared').Frame[] = [];
    drv.events.on('frame', (f) => frames.push(f));

    await drv.startStream();

    // Push 3 FIFO records: for each, s11 = rev0 / fwd0 = (100, 0) / (200, 0) = 0.5
    const combined = new Uint8Array(96);
    combined.set(makeRecord([200, 0], [100, 0], 0), 0);
    combined.set(makeRecord([200, 0], [100, 0], 1), 32);
    combined.set(makeRecord([200, 0], [100, 0], 2), 64);
    t.pushBytes(combined);

    await new Promise((r) => setTimeout(r, 30));
    expect(frames.length).toBeGreaterThanOrEqual(1);
    const f = frames[0] as import('@nanovnaweb/shared').Frame;
    expect(f.s11).toHaveLength(3);
    expect(f.s11[0]).toEqual({ re: 0.5, im: 0 });
    expect(f.s11[1]).toEqual({ re: 0.5, im: 0 });
    expect(f.s11[2]).toEqual({ re: 0.5, im: 0 });
    expect(f.s21).toBeUndefined();
    await drv.dispose();
  });
});

function makeV2PlusRecord(
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

describe('V2Driver streaming — S11 + S21 (V2Plus)', () => {
  it('emits a Frame with both S11 and S21 populated on V2Plus', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2PlusInfo());
    await drv.setSweep({
      start: asHz(1_000_000),
      stop: asHz(3_000_000),
      points: 3,
    });
    t.clearWritten();

    const frames: import('@nanovnaweb/shared').Frame[] = [];
    drv.events.on('frame', (f) => frames.push(f));

    await drv.startStream();

    const combined = new Uint8Array(96);
    // fwd0 = (200, 0), rev0 = (100, 0) → s11 = 0.5
    // rev1 = (50, 0) → s21 = 0.25
    combined.set(makeV2PlusRecord([200, 0], [100, 0], [50, 0], 0), 0);
    combined.set(makeV2PlusRecord([200, 0], [100, 0], [50, 0], 1), 32);
    combined.set(makeV2PlusRecord([200, 0], [100, 0], [50, 0], 2), 64);
    t.pushBytes(combined);

    await new Promise((r) => setTimeout(r, 30));
    expect(frames.length).toBeGreaterThanOrEqual(1);
    const f = frames[0] as import('@nanovnaweb/shared').Frame;
    expect(f.s11).toHaveLength(3);
    expect(f.s21).toBeDefined();
    expect(f.s21).toHaveLength(3);
    expect(f.s11[0]).toEqual({ re: 0.5, im: 0 });
    expect(f.s21?.[0]).toEqual({ re: 0.25, im: 0 });
    await drv.dispose();
  });
});

describe('V2Driver streaming — S11 only (V2 base) — frozen frames', () => {
  it('emitted Frame and its arrays are deep-frozen', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2BaseInfo());
    await drv.setSweep({ start: asHz(1_000_000), stop: asHz(3_000_000), points: 3 });
    t.clearWritten();

    const frames: import('@nanovnaweb/shared').Frame[] = [];
    drv.events.on('frame', (f) => frames.push(f));
    await drv.startStream();

    const combined = new Uint8Array(96);
    combined.set(makeRecord([200, 0], [100, 0], 0), 0);
    combined.set(makeRecord([200, 0], [100, 0], 1), 32);
    combined.set(makeRecord([200, 0], [100, 0], 2), 64);
    t.pushBytes(combined);
    await new Promise((r) => setTimeout(r, 30));

    expect(frames.length).toBeGreaterThanOrEqual(1);
    const f = frames[0];
    if (!f) throw new Error('expected at least one frame');
    expect(Object.isFrozen(f)).toBe(true);
    expect(Object.isFrozen(f.frequencies)).toBe(true);
    expect(Object.isFrozen(f.s11)).toBe(true);
    await drv.dispose();
  });
});

describe('V2Driver resiliency', () => {
  it('logs fifo-desync and continues when a record has an out-of-range freqIndex', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2BaseInfo());
    await drv.setSweep({ start: asHz(1_000_000), stop: asHz(3_000_000), points: 3 });
    t.clearWritten();

    const logs: string[] = [];
    drv.events.on('log', (l) => logs.push(l.message));

    await drv.startStream();

    const combined = new Uint8Array(128);
    // First record is garbage (freqIndex = 999)
    combined.set(makeRecord([200, 0], [100, 0], 999), 0);
    // Then three valid records complete the sweep
    combined.set(makeRecord([200, 0], [100, 0], 0), 32);
    combined.set(makeRecord([200, 0], [100, 0], 1), 64);
    combined.set(makeRecord([200, 0], [100, 0], 2), 96);
    t.pushBytes(combined);

    await new Promise((r) => setTimeout(r, 30));
    expect(logs.some((m) => m.includes('fifo-desync'))).toBe(true);
    await drv.dispose();
  });

  it('does not emit "disconnected" when stopStream cancels the reader', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const drv = new V2Driver(t, v2BaseInfo());
    await drv.setSweep({ start: asHz(1_000_000), stop: asHz(3_000_000), points: 3 });
    t.clearWritten();

    const events: string[] = [];
    drv.events.on('disconnected', () => events.push('disconnected'));

    await drv.startStream();
    await new Promise((r) => setTimeout(r, 10));
    await drv.stopStream();
    await new Promise((r) => setTimeout(r, 20));

    expect(events).not.toContain('disconnected');
    await drv.dispose();
  });
});
