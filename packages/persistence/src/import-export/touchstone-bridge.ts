import {
  type ParseError,
  type ParseResult,
  readTouchstone,
  touchstoneCodec,
} from '@nanovnaweb/formats';
import type { Result, TraceRecord } from '@nanovnaweb/shared';
import { asyncIterableFromArray } from '../util/async-iter.js';

export function parseTouchstoneImport(
  blob: Blob,
  opts?: { suggestedName?: string },
): Promise<Result<ParseResult<TraceRecord>, ParseError>> {
  return readTouchstone(blob, opts);
}

export function buildTouchstoneExport(trace: TraceRecord): ReadableStream<Uint8Array> {
  return touchstoneCodec.write(asyncIterableFromArray([trace]));
}
