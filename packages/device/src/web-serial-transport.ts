import { type Result, err, ok } from '@nanovnaweb/shared';
import { TransportError } from './errors.js';
import type { Transport, TransportOpenOptions } from './transport.js';

interface MinimalSerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}

export class WebSerialTransport implements Transport {
  private opened = false;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private pumpReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private pumpRunning = false;
  private closeSubscribers = new Set<() => void>();
  // Each readable() call creates an independent stream; bytes pumped from the
  // underlying port are broadcast to every controller in this set. Canceling
  // one consumer's stream removes only that controller; the underlying port
  // reader is never cancelled by consumers.
  private fanoutControllers = new Set<ReadableStreamDefaultController<Uint8Array>>();

  constructor(private readonly port: MinimalSerialPort) {}

  get isOpen(): boolean {
    return this.opened;
  }

  async open(opts: TransportOpenOptions): Promise<Result<void, TransportError>> {
    try {
      await this.port.open({ baudRate: opts.baudRate });
      this.writer = this.port.writable.getWriter();
      this.pumpReader = this.port.readable.getReader();
      this.pumpRunning = true;
      this.opened = true;
      void this.pumpLoop();
      return ok(undefined);
    } catch (cause) {
      return err(new TransportError('open-failed', 'failed to open serial port', cause));
    }
  }

  async close(): Promise<void> {
    this.opened = false;
    this.pumpRunning = false;
    // Close all fan-out streams so consumers observe a terminal done.
    for (const ctrl of this.fanoutControllers) {
      try {
        ctrl.close();
      } catch {
        /* already closed */
      }
    }
    this.fanoutControllers.clear();
    // Release port reader (cancel to unblock any pending read on the port).
    if (this.pumpReader) {
      try {
        await this.pumpReader.cancel();
      } catch {
        /* ignore */
      }
      try {
        this.pumpReader.releaseLock();
      } catch {
        /* ignore */
      }
      this.pumpReader = null;
    }
    try {
      this.writer?.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      await this.port.close();
    } catch {
      /* ignore */
    }
    for (const cb of this.closeSubscribers) cb();
  }

  async write(bytes: Uint8Array): Promise<Result<void, TransportError>> {
    if (!this.writer) {
      return err(new TransportError('closed', 'transport not open'));
    }
    try {
      await this.writer.write(bytes);
      return ok(undefined);
    } catch (cause) {
      return err(new TransportError('write-failed', 'write failed', cause));
    }
  }

  readable(): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start: (ctrl) => {
        this.fanoutControllers.add(ctrl);
      },
      cancel: () => {
        // Consumer cancelled their stream. Remove from fan-out set but leave
        // the underlying port reader running so other consumers still work.
        // (The controller reference is tracked by identity; we find it by
        // iterating since the `cancel` callback doesn't receive it.)
        for (const ctrl of this.fanoutControllers) {
          // Dead controller will throw on enqueue; we just prune it lazily
          // in pumpLoop. Explicit cleanup is not required here, but clearing
          // errored controllers early reduces per-chunk overhead.
          try {
            // Probe liveness: enqueue a zero-length array is not allowed on
            // ReadableStream, so instead check .desiredSize which is null
            // when closed/cancelled.
            if (ctrl.desiredSize === null) {
              this.fanoutControllers.delete(ctrl);
            }
          } catch {
            this.fanoutControllers.delete(ctrl);
          }
        }
      },
    });
  }

  onClose(cb: () => void): () => void {
    this.closeSubscribers.add(cb);
    return () => {
      this.closeSubscribers.delete(cb);
    };
  }

  private async pumpLoop(): Promise<void> {
    const reader = this.pumpReader;
    if (!reader) return;
    while (this.pumpRunning) {
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await reader.read();
      } catch {
        this.pumpRunning = false;
        break;
      }
      if (result.done) {
        this.pumpRunning = false;
        break;
      }
      if (!result.value) continue;
      // Broadcast to fan-out, pruning any dead controllers.
      const dead = new Set<ReadableStreamDefaultController<Uint8Array>>();
      for (const ctrl of this.fanoutControllers) {
        try {
          ctrl.enqueue(result.value);
        } catch {
          dead.add(ctrl);
        }
      }
      for (const ctrl of dead) this.fanoutControllers.delete(ctrl);
    }
    // Pump exit: close all fan-out streams so consumers see terminal done.
    for (const ctrl of this.fanoutControllers) {
      try {
        ctrl.close();
      } catch {
        /* already closed */
      }
    }
    this.fanoutControllers.clear();
  }
}

export function isWebSerialSupported(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { navigator?: { serial?: unknown } }).navigator?.serial !== 'undefined'
  );
}

export async function requestWebSerialPort(): Promise<Result<WebSerialTransport, TransportError>> {
  if (!isWebSerialSupported()) {
    return err(new TransportError('not-supported', 'Web Serial API is not available'));
  }
  try {
    const port = await (
      globalThis as unknown as {
        navigator: { serial: { requestPort: () => Promise<MinimalSerialPort> } };
      }
    ).navigator.serial.requestPort();
    return ok(new WebSerialTransport(port));
  } catch (cause) {
    return err(new TransportError('permission-denied', 'user declined or no port', cause));
  }
}
