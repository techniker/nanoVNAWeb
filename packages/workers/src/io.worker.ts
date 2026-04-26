import type { Frame, LogEntry } from '@nanovnaweb/shared';
import * as Comlink from 'comlink';
import { createBrowserIoService } from './create-browser-service.js';
import type { ConnectionStatus, IoApi } from './io-api.js';

const service = createBrowserIoService();

const facade: IoApi = {
  connect: (opts) => service.connect(opts),
  disconnect: () => service.disconnect(),
  setSweep: (p) => service.setSweep(p),
  startStream: () => service.startStream(),
  stopStream: () => service.stopStream(),
  onFrame: async (cb: (f: Frame) => void) => Comlink.proxy(await service.onFrame(cb)),
  onStatus: async (cb: (s: ConnectionStatus) => void) => Comlink.proxy(await service.onStatus(cb)),
  onLog: async (cb: (e: LogEntry) => void) => Comlink.proxy(await service.onLog(cb)),
};

Comlink.expose(facade);
