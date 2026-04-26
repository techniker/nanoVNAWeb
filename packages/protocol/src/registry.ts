import type { Transport } from '@nanovnaweb/device';
import { type DeviceInfo, type DriverKind, type Result, err, ok } from '@nanovnaweb/shared';
import type { Driver } from './driver.js';
import { ProbeError } from './errors.js';

export interface ProbeOptions {
  readonly timeoutMs?: number;
}

export interface DriverProbe {
  readonly kind: DriverKind;
  readonly displayName: string;
  probe(transport: Transport, opts: ProbeOptions): Promise<Result<DeviceInfo, ProbeError>>;
  create(transport: Transport, info: DeviceInfo): Driver;
}

export class DriverRegistry {
  private probes: DriverProbe[] = [];

  register(probe: DriverProbe): void {
    this.probes.push(probe);
  }

  listKinds(): readonly DriverKind[] {
    return this.probes.map((p) => p.kind);
  }

  async detect(transport: Transport, opts: ProbeOptions = {}): Promise<Result<Driver, ProbeError>> {
    let lastError: ProbeError | null = null;
    for (const probe of this.probes) {
      const result = await probe.probe(transport, opts);
      if (result.kind === 'ok') {
        return ok(probe.create(transport, result.value));
      }
      lastError = result.error;
    }
    return err(lastError ?? new ProbeError('no-match', 'no probes registered'));
  }
}
