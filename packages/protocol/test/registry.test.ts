import { FakeTransport } from '@nanovnaweb/device';
import { TypedEmitter, asHz, err, isErr, isOk, ok } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import type { Driver, DriverEvents } from '../src/driver.js';
import { ProbeError } from '../src/errors.js';
import { type DriverProbe, DriverRegistry } from '../src/registry.js';

function fakeDriver(displayName: string): Driver {
  return {
    info: {
      driverKind: 'v1',
      displayName,
      capabilities: {
        minFrequencyHz: asHz(50_000),
        maxFrequencyHz: asHz(900_000_000),
        maxPoints: 101,
        supportsS11: true,
        supportsS21: true,
        supportsAveraging: false,
      },
    },
    events: new TypedEmitter<DriverEvents>(),
    setSweep: async () => ok(undefined),
    startStream: async () => ok(undefined),
    stopStream: async () => ok(undefined),
    dispose: async () => undefined,
  };
}

const probeAlwaysMatches: DriverProbe = {
  kind: 'v1',
  displayName: 'Always V1',
  probe: async (_transport, _opts) =>
    ok({
      driverKind: 'v1' as const,
      displayName: 'Always V1',
      capabilities: {
        minFrequencyHz: asHz(50_000),
        maxFrequencyHz: asHz(900_000_000),
        maxPoints: 101,
        supportsS11: true,
        supportsS21: true,
        supportsAveraging: false,
      },
    }),
  create: (_t, info) => fakeDriver(info.displayName),
};

const probeNeverMatches: DriverProbe = {
  kind: 'v2',
  displayName: 'Never V2',
  probe: async (_transport, _opts) => err(new ProbeError('no-match', 'nope')),
  create: () => {
    throw new Error('should not be called');
  },
};

describe('DriverRegistry', () => {
  it('register adds a probe', () => {
    const r = new DriverRegistry();
    r.register(probeAlwaysMatches);
    expect(r.listKinds()).toEqual(['v1']);
  });

  it('detect returns the first probe that matches', async () => {
    const r = new DriverRegistry();
    r.register(probeNeverMatches);
    r.register(probeAlwaysMatches);
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const result = await r.detect(t);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.info.driverKind).toBe('v1');
    }
  });

  it('detect returns no-match ProbeError when nothing matches', async () => {
    const r = new DriverRegistry();
    r.register(probeNeverMatches);
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    const result = await r.detect(t);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.kind).toBe('no-match');
    }
  });

  it('tries probes in registration order (V2 before V1 is standard)', async () => {
    const calls: string[] = [];
    const p1: DriverProbe = {
      kind: 'v2',
      displayName: 'V2',
      probe: async (_transport, _opts) => {
        calls.push('v2');
        return err(new ProbeError('no-match', ''));
      },
      create: () => {
        throw new Error('should not call');
      },
    };
    const p2: DriverProbe = {
      kind: 'v1',
      displayName: 'V1',
      probe: async (_transport, _opts) => {
        calls.push('v1');
        return ok({
          driverKind: 'v1' as const,
          displayName: 'V1',
          capabilities: {
            minFrequencyHz: asHz(50_000),
            maxFrequencyHz: asHz(900_000_000),
            maxPoints: 101,
            supportsS11: true,
            supportsS21: false,
            supportsAveraging: false,
          },
        });
      },
      create: (_t, info) => fakeDriver(info.displayName),
    };
    const r = new DriverRegistry();
    r.register(p1);
    r.register(p2);
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    await r.detect(t);
    expect(calls).toEqual(['v2', 'v1']);
  });
});
