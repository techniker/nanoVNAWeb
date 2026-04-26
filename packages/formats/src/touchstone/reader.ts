import { type Result, type TraceRecord, err } from '@nanovnaweb/shared';
import type { ParseResult } from '../codec.js';
import { ParseError } from '../warnings.js';
import { readerV1 } from './reader-v1.js';
import { readerV2 } from './reader-v2.js';
import { tokenize } from './tokenize.js';

export function readTouchstoneString(
  content: string,
): Result<ParseResult<TraceRecord>, ParseError> {
  const tokenized = tokenize(content);
  const firstContent = tokenized.find((l) => l.kind !== 'comment' && l.kind !== 'blank');
  if (!firstContent) {
    return err(new ParseError('empty-file', 'no content after comments/blanks'));
  }
  if (firstContent.kind === 'keyword') {
    return readerV2(tokenized);
  }
  if (firstContent.kind === 'option') {
    return readerV1(tokenized);
  }
  return err(
    new ParseError(
      'missing-option-line',
      'first content line must be an option line (#) or keyword ([Version])',
      firstContent.lineNumber,
    ),
  );
}
