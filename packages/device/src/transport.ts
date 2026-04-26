import type { Result } from '@nanovnaweb/shared';
import type { TransportError } from './errors.js';

export interface TransportOpenOptions {
  readonly baudRate: number;
  readonly requestAccess?: boolean;
}

export interface Transport {
  readonly isOpen: boolean;
  open(opts: TransportOpenOptions): Promise<Result<void, TransportError>>;
  close(): Promise<void>;
  write(bytes: Uint8Array): Promise<Result<void, TransportError>>;
  readable(): ReadableStream<Uint8Array>;
  onClose(cb: () => void): () => void;
}

export interface TransportFactory {
  create(): Transport;
}
