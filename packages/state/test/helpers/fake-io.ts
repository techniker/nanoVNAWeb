import { type Result, ok } from '@nanovnaweb/shared';
import type { DeviceInfo, Frame, LogEntry, SweepParams } from '@nanovnaweb/shared';
import type { ConnectOptions, ConnectionStatus, IoApi, IoError } from '@nanovnaweb/workers';

export interface FakeIoController {
  readonly io: IoApi;
  emitStatus(status: ConnectionStatus): void;
  emitFrame(frame: Frame): void;
  emitLog(entry: LogEntry): void;
  /** Set the next result of connect() */
  setConnectResult(result: Result<DeviceInfo, IoError>): void;
  setSweepResult(result: Result<void, IoError>): void;
  /** Recorded calls for assertions */
  readonly calls: {
    connect: ConnectOptions[];
    disconnect: number;
    setSweep: SweepParams[];
    startStream: number;
    stopStream: number;
  };
}

export function makeFakeIo(): FakeIoController {
  const statusSubs = new Set<(s: ConnectionStatus) => void>();
  const frameSubs = new Set<(f: Frame) => void>();
  const logSubs = new Set<(e: LogEntry) => void>();
  const calls = {
    connect: [] as ConnectOptions[],
    disconnect: 0,
    setSweep: [] as SweepParams[],
    startStream: 0,
    stopStream: 0,
  };
  let connectResult: Result<DeviceInfo, IoError> = ok({
    driverKind: 'v1',
    displayName: 'FakeDevice',
    capabilities: Object.freeze({
      minFrequencyHz: 50_000 as unknown as DeviceInfo['capabilities']['minFrequencyHz'],
      maxFrequencyHz: 900_000_000 as unknown as DeviceInfo['capabilities']['maxFrequencyHz'],
      maxPoints: 101,
      supportsS11: true,
      supportsS21: false,
      supportsAveraging: false,
    }),
  });
  let sweepResult: Result<void, IoError> = ok(undefined);

  const io: IoApi = {
    async connect(opts) {
      calls.connect.push(opts ?? {});
      return connectResult;
    },
    async disconnect() {
      calls.disconnect++;
    },
    async setSweep(params) {
      calls.setSweep.push(params);
      return sweepResult;
    },
    async startStream() {
      calls.startStream++;
      return ok(undefined);
    },
    async stopStream() {
      calls.stopStream++;
      return ok(undefined);
    },
    async onFrame(cb) {
      frameSubs.add(cb);
      return async () => {
        frameSubs.delete(cb);
      };
    },
    async onStatus(cb) {
      statusSubs.add(cb);
      return async () => {
        statusSubs.delete(cb);
      };
    },
    async onLog(cb) {
      logSubs.add(cb);
      return async () => {
        logSubs.delete(cb);
      };
    },
  };

  return {
    io,
    emitStatus(s) {
      for (const cb of statusSubs) cb(s);
    },
    emitFrame(f) {
      for (const cb of frameSubs) cb(f);
    },
    emitLog(e) {
      for (const cb of logSubs) cb(e);
    },
    setConnectResult(r) {
      connectResult = r;
    },
    setSweepResult(r) {
      sweepResult = r;
    },
    calls,
  };
}
