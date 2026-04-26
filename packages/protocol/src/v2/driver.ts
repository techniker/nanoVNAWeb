import type { Transport } from '@nanovnaweb/device';
import {
  type Complex,
  type DeviceInfo,
  type Frame,
  type Result,
  type SweepParams,
  TypedEmitter,
  asHz,
  err,
  ok,
} from '@nanovnaweb/shared';
import type { Driver, DriverEvents } from '../driver.js';
import { DriverError } from '../errors.js';
import { buildReadFifo, buildWrite2, buildWrite4, buildWriteFifo, splitU64 } from './frames.js';
import { computeFrequencies, divComplex, parseFifoRecord } from './parsers.js';
import {
  FIFO_RECORD_BYTES,
  REG_SWEEP_POINTS,
  REG_SWEEP_START_HZ,
  REG_SWEEP_STEP_HZ,
  REG_VALUES_FIFO,
  REG_VALUES_PER_FREQ,
} from './protocol.js';

export interface V2DriverOptions {
  readonly mode?: 'polled' | 'stream';
}

export class V2Driver implements Driver {
  readonly events = new TypedEmitter<DriverEvents>();
  private disposed = false;
  private streaming = false;
  private currentSweep: SweepParams | null = null;
  private activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private sequence = 0;
  private readonly mode: 'polled' | 'stream';

  constructor(
    private readonly transport: Transport,
    readonly info: DeviceInfo,
    opts: V2DriverOptions = {},
  ) {
    this.mode = opts.mode ?? 'polled';
  }

  async setSweep(params: SweepParams): Promise<Result<void, DriverError>> {
    const caps = this.info.capabilities;
    if ((params.start as number) < (caps.minFrequencyHz as number)) {
      return err(new DriverError('command-failed', 'sweep start below hardware minimum'));
    }
    if ((params.stop as number) > (caps.maxFrequencyHz as number)) {
      return err(new DriverError('command-failed', 'sweep stop above hardware maximum'));
    }
    if (params.points > caps.maxPoints) {
      return err(new DriverError('command-failed', 'sweep points exceeds hardware maximum'));
    }
    if (params.points < 1) {
      return err(new DriverError('command-failed', 'sweep points must be >= 1'));
    }

    const stepHz =
      params.points === 1
        ? 0
        : Math.round(((params.stop as number) - (params.start as number)) / (params.points - 1));

    const startSplit = splitU64(params.start as number);
    const stepSplit = splitU64(stepHz);

    const writes: Uint8Array[] = [
      buildWrite4(REG_SWEEP_START_HZ, startSplit.lo),
      buildWrite4(REG_SWEEP_START_HZ + 4, startSplit.hi),
      buildWrite4(REG_SWEEP_STEP_HZ, stepSplit.lo),
      buildWrite4(REG_SWEEP_STEP_HZ + 4, stepSplit.hi),
      buildWrite2(REG_SWEEP_POINTS, params.points),
      buildWrite2(REG_VALUES_PER_FREQ, params.averaging ?? 1),
      buildWriteFifo(REG_VALUES_FIFO, 0),
    ];

    for (const bytes of writes) {
      const r = await this.transport.write(bytes);
      if (r.kind === 'err') {
        return err(new DriverError('command-failed', 'setSweep write failed', r.error));
      }
    }

    this.currentSweep = params;
    return ok(undefined);
  }

  async startStream(): Promise<Result<void, DriverError>> {
    if (!this.currentSweep) {
      return err(new DriverError('not-connected', 'setSweep must be called before startStream'));
    }
    if (this.mode === 'stream') {
      return err(new DriverError('command-failed', 'stream mode not implemented in v0.1'));
    }
    if (this.streaming) return ok(undefined);
    this.streaming = true;
    void this.pumpLoop();
    return ok(undefined);
  }

  async stopStream(): Promise<Result<void, DriverError>> {
    this.streaming = false;
    if (this.activeReader) {
      try {
        await this.activeReader.cancel();
      } catch {
        /* ignore */
      }
      try {
        this.activeReader.releaseLock();
      } catch {
        /* ignore */
      }
      this.activeReader = null;
    }
    return ok(undefined);
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    await this.stopStream();
    this.events.removeAllListeners();
  }

  private async pumpLoop(): Promise<void> {
    const sweep = this.currentSweep;
    if (!sweep) return;
    const nPoints = sweep.points;
    const reader = this.transport.readable().getReader();
    this.activeReader = reader;

    const pending = new Uint8Array(FIFO_RECORD_BYTES * nPoints * 2);
    let pendingLen = 0;
    let s11Buf: (Complex | undefined)[] = new Array(nPoints);
    let s21Buf: (Complex | undefined)[] | null = this.info.capabilities.supportsS21
      ? new Array(nPoints)
      : null;
    let seenCount = 0;

    const requestSweep = async (): Promise<void> => {
      let remaining = nPoints;
      while (remaining > 0) {
        const chunk = Math.min(255, remaining);
        const w = await this.transport.write(buildReadFifo(REG_VALUES_FIFO, chunk));
        if (w.kind === 'err') {
          this.events.emit('log', { level: 'warn', message: 'FIFO request failed' });
          return;
        }
        remaining -= chunk;
      }
    };
    await requestSweep();

    try {
      while (this.streaming && !this.disposed) {
        const readResult = await reader
          .read()
          .catch(() => ({ value: undefined, done: true }) as const);
        if (readResult.done) {
          if (this.streaming) {
            this.streaming = false;
            this.events.emit('disconnected', { reason: 'readable stream closed' });
          }
          return;
        }
        if (!readResult.value) continue;

        if (pendingLen + readResult.value.byteLength > pending.byteLength) {
          this.events.emit('log', { level: 'warn', message: 'pump buffer overflow' });
          pendingLen = 0;
          continue;
        }
        pending.set(readResult.value, pendingLen);
        pendingLen += readResult.value.byteLength;

        let offset = 0;
        while (pendingLen - offset >= FIFO_RECORD_BYTES) {
          const rec = parseFifoRecord(pending, offset);
          offset += FIFO_RECORD_BYTES;
          if (rec.kind === 'err') {
            this.events.emit('log', { level: 'warn', message: 'FIFO record parse error' });
            continue;
          }
          const r = rec.value;
          if (r.freqIndex < 0 || r.freqIndex >= nPoints) {
            this.events.emit('log', {
              level: 'warn',
              message: `fifo-desync: freqIndex=${r.freqIndex}`,
            });
            continue;
          }
          if (s11Buf[r.freqIndex] === undefined) seenCount++;
          s11Buf[r.freqIndex] = divComplex(r.rev0, r.fwd0);
          if (s21Buf !== null) {
            s21Buf[r.freqIndex] = divComplex(r.rev1, r.fwd0);
          }

          if (seenCount === nPoints) {
            const s11Final = s11Buf.map((c) => c ?? { re: 0, im: 0 }) as Complex[];
            const s21Final = s21Buf
              ? (s21Buf.map((c) => c ?? { re: 0, im: 0 }) as Complex[])
              : null;
            const frame: Frame = Object.freeze({
              sequence: this.sequence++,
              timestamp: Date.now(),
              frequencies: Object.freeze(computeFrequencies(sweep).map(asHz)),
              s11: Object.freeze(s11Final),
              ...(s21Final ? { s21: Object.freeze(s21Final) } : {}),
            });
            this.events.emit('frame', frame);
            s11Buf = new Array(nPoints);
            if (s21Buf !== null) s21Buf = new Array(nPoints);
            seenCount = 0;
            await requestSweep();
          }
        }

        if (offset > 0) {
          pending.copyWithin(0, offset, pendingLen);
          pendingLen -= offset;
        }
        await wait(0);
      }
    } finally {
      this.activeReader = null;
      try {
        reader.releaseLock();
      } catch {
        /* ignore */
      }
    }
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
