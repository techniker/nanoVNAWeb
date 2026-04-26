import { type Transport, requestWebSerialPort } from '@nanovnaweb/device';
import { DriverRegistry, v1DriverProbe, v2DriverProbe } from '@nanovnaweb/protocol';
import { MemoryRingLogger, type Result, err, ok } from '@nanovnaweb/shared';
import type { IoError } from './io-api.js';
import { IoService, type OpenTransportOptions } from './io-service.js';

export function createBrowserIoService(): IoService {
  const registry = new DriverRegistry();
  registry.register(v2DriverProbe);
  registry.register(v1DriverProbe);
  const logger = new MemoryRingLogger(10_000);
  return new IoService({
    registry,
    logger,
    openTransport: async (opts: OpenTransportOptions): Promise<Result<Transport, IoError>> => {
      const r = await requestWebSerialPort();
      if (r.kind === 'err') {
        return err({ kind: 'permission-denied', message: r.error.message, cause: r.error });
      }
      const opened = await r.value.open({ baudRate: opts.baudRate ?? 115200 });
      if (opened.kind === 'err') {
        return err({
          kind: 'permission-denied',
          message: opened.error.message,
          cause: opened.error,
        });
      }
      return ok(r.value);
    },
  });
}
