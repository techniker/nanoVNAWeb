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
import { commandData0, commandData1, commandSweep, writeCommand } from './command-writer.js';
import { parseDataLine, parseFrequencies } from './parsers.js';

export class V1Driver implements Driver {
  readonly events = new TypedEmitter<DriverEvents>();
  private disposed = false;
  private streaming = false;
  private currentSweep: SweepParams | null = null;
  private activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private sequence = 0;

  constructor(
    private readonly transport: Transport,
    readonly info: DeviceInfo,
  ) {}

  async setSweep(params: SweepParams): Promise<Result<void, DriverError>> {
    this.currentSweep = params;
    const r = await writeCommand(this.transport, commandSweep(params));
    if (r.kind === 'err') {
      return err(new DriverError('command-failed', 'failed to send sweep command', r.error));
    }
    return ok(undefined);
  }

  async startStream(): Promise<Result<void, DriverError>> {
    if (!this.currentSweep) {
      return err(new DriverError('not-connected', 'setSweep must be called before startStream'));
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
    const decoder = new TextDecoder('utf-8');
    const reader = this.transport.readable().getReader();
    this.activeReader = reader;
    const bufRef = { value: '' };

    try {
      while (this.streaming && !this.disposed) {
        const sweep = this.currentSweep;
        if (!sweep) break;

        // Fetch both channels per sweep cycle. The V1 firmware buffers
        // results from the continuous sweep and `data 0` / `data 1`
        // are pure reads — no extra measurement is triggered, just an
        // additional N-line USB roundtrip. Without this, frame.s21
        // stays undefined and selecting the S21 channel in any chart
        // produces a blank plot (the renderer's `if (!samples)` guard
        // silently skips it).
        const s11 = await this.fetchChannel(reader, bufRef, decoder, 'data 0', sweep.points);
        if (s11 === null) return;
        if (s11 === 'aborted') break;

        const s21 = await this.fetchChannel(reader, bufRef, decoder, 'data 1', sweep.points);
        if (s21 === null) return;
        if (s21 === 'aborted') break;

        const freqsRaw = parseFrequencies({
          start: sweep.start as number,
          stop: sweep.stop as number,
          points: sweep.points,
        });
        const frame: Frame = Object.freeze({
          sequence: this.sequence++,
          timestamp: Date.now(),
          frequencies: Object.freeze(freqsRaw.map(asHz)),
          s11: Object.freeze(s11),
          s21: Object.freeze(s21),
        });
        this.events.emit('frame', frame);
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

  /**
   * Sends a `data 0` / `data 1` command, then drains exactly `points`
   * complex samples from the reader. Returns:
   *   - the parsed sample array on success
   *   - `'aborted'` when the firmware echoes nothing or the request fails
   *     (caller continues to the next pump iteration)
   *   - `null` when the stream was closed or the driver was stopped
   *     (caller terminates the pump loop)
   *
   * Hoisting the per-channel fetch out of pumpLoop lets us call it
   * twice (once per S-parameter) without duplicating the line-reader
   * state machine, and keeps the buffer between calls so trailing
   * bytes from the first response feed straight into the second.
   */
  private async fetchChannel(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    bufRef: { value: string },
    decoder: TextDecoder,
    command: 'data 0' | 'data 1',
    points: number,
  ): Promise<Complex[] | 'aborted' | null> {
    const send = await writeCommand(
      this.transport,
      command === 'data 0' ? commandData0() : commandData1(),
    );
    if (send.kind === 'err') {
      this.events.emit('log', { level: 'warn', message: `failed to request ${command}` });
      await wait(50);
      return 'aborted';
    }

    const samples: Complex[] = [];
    let skippedEcho = false;

    while (samples.length < points) {
      if (!this.streaming || this.disposed) return null;

      const newlineIdx = bufRef.value.indexOf('\n');
      if (newlineIdx === -1) {
        const readResult = await reader
          .read()
          .catch(() => ({ value: undefined as Uint8Array | undefined, done: true }));
        if (readResult.done) {
          if (this.streaming) {
            // Device closed unexpectedly (clean stopStream sets
            // this.streaming = false before cancelling the reader).
            this.streaming = false;
            this.events.emit('disconnected', { reason: 'readable stream closed' });
          }
          return null;
        }
        if (readResult.value !== undefined) {
          bufRef.value += decoder.decode(readResult.value, { stream: true });
        }
        continue;
      }

      let line = bufRef.value.slice(0, newlineIdx);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      bufRef.value = bufRef.value.slice(newlineIdx + 1);
      const trimmed = line.trim();

      if (trimmed.length === 0) continue;
      if (trimmed === command) {
        skippedEcho = true;
        continue;
      }
      // `ch>` is the firmware prompt that follows a response; ignore
      // it whether or not we saw the echo (some firmware variants
      // suppress the echo).
      if (trimmed.startsWith('ch>')) {
        if (skippedEcho) continue;
        continue;
      }

      const parsed = parseDataLine(trimmed);
      if (parsed) samples.push(parsed);
    }

    return samples;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
