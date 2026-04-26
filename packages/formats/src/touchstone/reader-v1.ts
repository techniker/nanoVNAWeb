import {
  type Complex,
  type Frame,
  type Hz,
  type Result,
  type TraceRecord,
  asHz,
  err,
  ok,
} from '@nanovnaweb/shared';
import type { ParseResult } from '../codec.js';
import { ParseError, type ParseWarning } from '../warnings.js';
import { fromDB, fromMA, fromRI } from './format-convert.js';
import { type FrequencyUnit, type TouchstoneFormat, parseOptionLine } from './option-line.js';
import type { TokenizedLine } from './tokenize.js';

const FREQ_MULTIPLIER: Record<FrequencyUnit, number> = {
  Hz: 1,
  kHz: 1e3,
  MHz: 1e6,
  GHz: 1e9,
};

export function readerV1(
  lines: readonly TokenizedLine[],
): Result<ParseResult<TraceRecord>, ParseError> {
  // Find the option line (first non-comment, non-blank line that is kind='option').
  const contentLines = lines.filter((l) => l.kind !== 'comment' && l.kind !== 'blank');
  if (contentLines.length === 0) {
    return err(new ParseError('empty-file', 'no data or header lines found'));
  }
  const first = contentLines[0];
  if (!first || first.kind !== 'option') {
    return err(
      new ParseError(
        'missing-option-line',
        'expected option line `# ...` first',
        first?.lineNumber,
      ),
    );
  }
  const optionResult = parseOptionLine(first.raw, first.lineNumber);
  if (optionResult.kind === 'err') return optionResult;
  const option = optionResult.value;

  // Collect data rows; emit warnings for malformed ones.
  const warnings: ParseWarning[] = [];
  const numericRows: { freq: number; pairs: number[] }[] = [];
  let portCount: 1 | 2 | null = null;
  let malformedCount = 0;
  let dataRowCount = 0;

  for (const line of contentLines.slice(1)) {
    if (line.kind === 'keyword' || line.kind === 'option') {
      warnings.push({
        kind: 'trailing-garbage',
        lineNumber: line.lineNumber,
        message: `unexpected ${line.kind} line in data section`,
      });
      continue;
    }
    if (line.kind === 'malformed') {
      // If port count hasn't been established yet, this is a header-level error.
      if (portCount === null) {
        return err(
          new ParseError(
            'malformed-header',
            `first data row is malformed: ${line.reason}`,
            line.lineNumber,
          ),
        );
      }
      dataRowCount++;
      malformedCount++;
      warnings.push({
        kind: 'malformed-data-line',
        lineNumber: line.lineNumber,
        message: line.reason,
      });
      continue;
    }
    if (line.kind !== 'numeric') continue;

    dataRowCount++;
    const nums = line.numbers;
    if (portCount === null) {
      if (nums.length === 3) portCount = 1;
      else if (nums.length === 9) portCount = 2;
      else {
        return err(
          new ParseError(
            'malformed-header',
            `first data row must have 3 or 9 tokens, got ${nums.length}`,
            line.lineNumber,
          ),
        );
      }
    }
    const expected = portCount === 1 ? 3 : 9;
    if (nums.length !== expected) {
      malformedCount++;
      warnings.push({
        kind: 'malformed-data-line',
        lineNumber: line.lineNumber,
        message: `expected ${expected} tokens, got ${nums.length}`,
      });
      continue;
    }
    const freq = nums[0] ?? 0;
    const pairs: number[] = [];
    for (let i = 1; i < expected; i++) {
      pairs.push(nums[i] ?? 0);
    }
    numericRows.push({ freq, pairs });
  }

  if (dataRowCount === 0) {
    return err(new ParseError('no-data-section', 'header parsed but no data rows'));
  }
  if (malformedCount / dataRowCount > 0.5) {
    return err(
      new ParseError(
        'too-many-malformed-lines',
        `${malformedCount}/${dataRowCount} data rows could not be parsed`,
      ),
    );
  }
  // Unreachable at runtime — prior returns at `dataRowCount === 0` and the
  // first-row malformed-header paths cover every path to reaching here.
  // TypeScript's control-flow analysis can't prove portCount is non-null,
  // so this guard remains as a type-narrowing tool.
  if (portCount === null) {
    return err(new ParseError('no-data-section', 'no parseable data rows'));
  }

  // Convert to Complex arrays, emit format-variant-converted warning if needed.
  const freqScale = FREQ_MULTIPLIER[option.frequencyUnit];
  if (option.format !== 'MA') {
    warnings.push({
      kind: 'format-variant-converted',
      lineNumber: first.lineNumber,
      message: `source format was ${option.format}; converted to canonical MA internally`,
    });
  }
  const convert = formatConverterFor(option.format);

  const frequencies: Hz[] = [];
  const s11: Complex[] = [];
  const s21: Complex[] = [];
  for (const row of numericRows) {
    frequencies.push(asHz(row.freq * freqScale));
    const p = row.pairs;
    s11.push(convert(p[0] ?? 0, p[1] ?? 0));
    if (portCount === 2) {
      s21.push(convert(p[2] ?? 0, p[3] ?? 0));
      // S12 and S22 (pairs p[4..5] and p[6..7]) are parsed but discarded.
    }
  }

  const frame: Frame = Object.freeze({
    sequence: 0,
    timestamp: Date.now(),
    frequencies: Object.freeze([...frequencies]),
    s11: Object.freeze([...s11]),
    ...(portCount === 2 ? { s21: Object.freeze([...s21]) } : {}),
  });
  const trace: TraceRecord = {
    id: globalThis.crypto.randomUUID(),
    name: 'Imported Touchstone 1.0',
    createdAt: Date.now(),
    frame,
    tags: Object.freeze(['imported']),
  };

  return ok({ trace, warnings: Object.freeze(warnings) });
}

function formatConverterFor(format: TouchstoneFormat): (a: number, b: number) => Complex {
  if (format === 'RI') return fromRI;
  if (format === 'DB') return fromDB;
  return fromMA;
}
