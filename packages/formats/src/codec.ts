import type { ParseWarning } from './warnings.js';

export interface FormatCodec<T> {
  readonly kind: string;
  readonly extensions: readonly string[];
  readonly mimeType: string;
  read(blob: Blob): AsyncIterable<ParseResult<T>>;
  write(items: AsyncIterable<T>): ReadableStream<Uint8Array>;
}

export interface ParseResult<T> {
  readonly trace: T;
  readonly warnings: readonly ParseWarning[];
}
