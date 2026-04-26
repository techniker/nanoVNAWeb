import { type Result, type TraceRecord, err, ok } from '@nanovnaweb/shared';
import type { FormatCodec, ParseResult } from '../codec.js';
import { ParseError } from '../warnings.js';
import { readTouchstoneString } from './reader.js';
import { writeTouchstoneString } from './writer.js';

export const touchstoneCodec: FormatCodec<TraceRecord> = {
  kind: 'touchstone',
  extensions: ['.s1p', '.s2p'] as const,
  mimeType: 'text/plain',
  async *read(blob: Blob) {
    const content = await blob.text();
    const result = readTouchstoneString(content);
    if (result.kind === 'err') throw result.error;
    yield result.value;
  },
  write(items: AsyncIterable<TraceRecord>): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        for await (const trace of items) {
          controller.enqueue(encoder.encode(writeTouchstoneString(trace)));
        }
        controller.close();
      },
    });
  },
};

export async function readTouchstone(
  blob: Blob,
  opts?: { suggestedName?: string },
): Promise<Result<ParseResult<TraceRecord>, ParseError>> {
  try {
    for await (const result of touchstoneCodec.read(blob)) {
      if (opts?.suggestedName) {
        return ok({
          trace: { ...result.trace, name: opts.suggestedName },
          warnings: result.warnings,
        });
      }
      return ok(result);
    }
    return err(new ParseError('empty-file', 'no traces produced'));
  } catch (e) {
    if (e instanceof ParseError) return err(e);
    throw e;
  }
}
