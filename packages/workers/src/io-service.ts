import type { Transport } from '@nanovnaweb/device';
import type { Driver, DriverRegistry } from '@nanovnaweb/protocol';
import {
  type DeviceInfo,
  type Frame,
  type LogEntry,
  type MemoryRingLogger,
  type Result,
  type SweepParams,
  TypedEmitter,
  err,
  ok,
} from '@nanovnaweb/shared';
import type { ConnectOptions, ConnectionStatus, IoApi, IoError } from './io-api.js';

export interface OpenTransportOptions {
  readonly baudRate?: number;
}

export interface IoServiceDeps {
  openTransport(opts: OpenTransportOptions): Promise<Result<Transport, IoError>>;
  registry: DriverRegistry;
  logger: MemoryRingLogger;
}

type InternalEvents = {
  frame: Frame;
  status: ConnectionStatus;
  log: LogEntry;
};

export class IoService implements IoApi {
  private driver: Driver | null = null;
  private transport: Transport | null = null;
  private readonly emitter = new TypedEmitter<InternalEvents>();
  private logUnsubscribe: (() => void) | null = null;

  constructor(private readonly deps: IoServiceDeps) {
    this.logUnsubscribe = this.deps.logger.onEntry((e) => this.emitter.emit('log', e));
  }

  async connect(opts?: ConnectOptions): Promise<Result<DeviceInfo, IoError>> {
    this.emitter.emit('status', { state: 'connecting' });
    const openResult = await this.deps.openTransport({
      ...(opts?.baudRate !== undefined ? { baudRate: opts.baudRate } : {}),
    });
    if (openResult.kind === 'err') {
      this.emitter.emit('status', { state: 'disconnected' });
      return openResult;
    }
    this.transport = openResult.value;
    const detected = await this.deps.registry.detect(this.transport, {
      ...(opts?.probeTimeoutMs !== undefined ? { timeoutMs: opts.probeTimeoutMs } : {}),
    });
    if (detected.kind === 'err') {
      this.emitter.emit('status', { state: 'disconnected' });
      return err({
        kind: 'driver-mismatch',
        message: detected.error.message,
        cause: detected.error,
      });
    }
    this.driver = detected.value;
    this.driver.events.on('frame', (f) => this.emitter.emit('frame', f));
    this.driver.events.on('disconnected', (d) => {
      this.emitter.emit('status', { state: 'lost', reason: d.reason });
    });
    this.emitter.emit('status', { state: 'connected', info: this.driver.info });
    this.deps.logger.info('io', 'connected', { device: this.driver.info });
    return ok(this.driver.info);
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.dispose();
      this.driver = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    if (this.logUnsubscribe) {
      this.logUnsubscribe();
      this.logUnsubscribe = null;
    }
    this.emitter.emit('status', { state: 'disconnected' });
  }

  async setSweep(params: SweepParams): Promise<Result<void, IoError>> {
    if (!this.driver) return err({ kind: 'not-connected', message: 'not connected' });
    const r = await this.driver.setSweep(params);
    if (r.kind === 'err') {
      return err({ kind: 'command-failed', message: r.error.message, cause: r.error });
    }
    return ok(undefined);
  }

  async startStream(): Promise<Result<void, IoError>> {
    if (!this.driver) return err({ kind: 'not-connected', message: 'not connected' });
    const r = await this.driver.startStream();
    if (r.kind === 'err') {
      return err({ kind: 'command-failed', message: r.error.message, cause: r.error });
    }
    return ok(undefined);
  }

  async stopStream(): Promise<Result<void, IoError>> {
    if (!this.driver) return err({ kind: 'not-connected', message: 'not connected' });
    const r = await this.driver.stopStream();
    if (r.kind === 'err') {
      return err({ kind: 'command-failed', message: r.error.message, cause: r.error });
    }
    return ok(undefined);
  }

  async onFrame(cb: (f: Frame) => void): Promise<() => Promise<void>> {
    const off = this.emitter.on('frame', cb);
    return async () => off();
  }

  async onStatus(cb: (s: ConnectionStatus) => void): Promise<() => Promise<void>> {
    const off = this.emitter.on('status', cb);
    return async () => off();
  }

  async onLog(cb: (e: LogEntry) => void): Promise<() => Promise<void>> {
    const off = this.emitter.on('log', cb);
    return async () => off();
  }
}
