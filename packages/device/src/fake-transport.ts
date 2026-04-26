import { type Result, ok } from '@nanovnaweb/shared';
import type { TransportError } from './errors.js';
import type { Transport, TransportOpenOptions } from './transport.js';

export class FakeTransport implements Transport {
  private opened = false;
  private writes: Uint8Array[] = [];
  private closeSubscribers = new Set<() => void>();
  // Each call to readable() returns an independent ReadableStream. pushBytes
  // fans out to all live controllers so that concurrent readers (e.g. a
  // short-lived drain reader followed by the main probe reader) each receive
  // data without sharing a stream that could be cancelled by one party.
  private streamControllers = new Set<ReadableStreamDefaultController<Uint8Array>>();

  get isOpen(): boolean {
    return this.opened;
  }

  open(_opts: TransportOpenOptions): Promise<Result<void, TransportError>> {
    this.opened = true;
    this.streamControllers.clear();
    return Promise.resolve(ok(undefined));
  }

  close(): Promise<void> {
    this.opened = false;
    for (const ctrl of this.streamControllers) {
      try {
        ctrl.close();
      } catch {
        // already closed or cancelled
      }
    }
    this.streamControllers.clear();
    for (const cb of this.closeSubscribers) cb();
    return Promise.resolve();
  }

  write(bytes: Uint8Array): Promise<Result<void, TransportError>> {
    this.writes.push(bytes);
    return Promise.resolve(ok(undefined));
  }

  readable(): ReadableStream<Uint8Array> {
    if (!this.opened) throw new Error('readable() called before open()');
    return new ReadableStream<Uint8Array>({
      start: (ctrl) => {
        this.streamControllers.add(ctrl);
      },
    });
  }

  onClose(cb: () => void): () => void {
    this.closeSubscribers.add(cb);
    return () => {
      this.closeSubscribers.delete(cb);
    };
  }

  // ── test helpers ──────────────────────────────────────────────────
  pushBytes(bytes: Uint8Array): void {
    const dead = new Set<ReadableStreamDefaultController<Uint8Array>>();
    for (const ctrl of this.streamControllers) {
      try {
        ctrl.enqueue(bytes);
      } catch {
        // Controller is closed or cancelled — prune it from the live set.
        dead.add(ctrl);
      }
    }
    for (const ctrl of dead) this.streamControllers.delete(ctrl);
  }
  pushText(text: string): void {
    this.pushBytes(new TextEncoder().encode(text));
  }
  closeInputs(): void {
    for (const ctrl of this.streamControllers) {
      try {
        ctrl.close();
      } catch {
        /* already closed */
      }
    }
    this.streamControllers.clear();
  }
  getWritten(): Uint8Array {
    const total = this.writes.reduce((s, b) => s + b.byteLength, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const b of this.writes) {
      out.set(b, off);
      off += b.byteLength;
    }
    return out;
  }
  getWrittenAsText(): string {
    return new TextDecoder().decode(this.getWritten());
  }
  clearWritten(): void {
    this.writes = [];
  }
}
