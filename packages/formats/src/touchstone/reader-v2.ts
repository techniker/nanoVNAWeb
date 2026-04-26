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
import type { ParseWarning } from '../warnings.js';
import { ParseError } from '../warnings.js';
import { fromDB, fromMA, fromRI } from './format-convert.js';
import { type FrequencyUnit, type TouchstoneFormat, parseOptionLine } from './option-line.js';
import type { TokenizedLine } from './tokenize.js';

const FREQ_MULTIPLIER: Record<FrequencyUnit, number> = {
  Hz: 1,
  kHz: 1e3,
  MHz: 1e6,
  GHz: 1e9,
};

type DataOrder = '21_12' | '12_21';

interface V2HeaderState {
  version: string | null;
  numberOfPorts: number | null;
  dataOrder: DataOrder;
  referenceAll50: boolean;
  matrixFormatFull: boolean;
  optionLineSeen: boolean;
}

export function readerV2(
  lines: readonly TokenizedLine[],
): Result<ParseResult<TraceRecord>, ParseError> {
  const warnings: ParseWarning[] = [];
  const state: V2HeaderState = {
    version: null,
    numberOfPorts: null,
    dataOrder: '21_12',
    referenceAll50: true,
    matrixFormatFull: true,
    optionLineSeen: false,
  };

  let optionLine: ReturnType<typeof parseOptionLine> | null = null;

  // Walk until [Network Data]; collect header state.
  let i = 0;
  let networkDataFound = false;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line) break;
    if (line.kind === 'blank' || line.kind === 'comment') continue;
    if (line.kind === 'malformed') {
      return err(
        new ParseError(
          'malformed-header',
          `non-numeric garbage line in header section: ${line.raw}`,
          line.lineNumber,
        ),
      );
    }
    if (line.kind === 'option') {
      optionLine = parseOptionLine(line.raw, line.lineNumber);
      if (optionLine.kind === 'err') return optionLine;
      state.optionLineSeen = true;
      continue;
    }
    if (line.kind === 'keyword') {
      const raw = line.raw;
      const upper = raw.toUpperCase();
      if (upper.startsWith('[VERSION]')) {
        const rest = raw.slice('[Version]'.length).trim();
        state.version = rest;
      } else if (upper.startsWith('[NUMBER OF PORTS]')) {
        const rest = raw.slice('[Number of Ports]'.length).trim();
        const n = Number(rest);
        if (!Number.isFinite(n)) {
          return err(
            new ParseError(
              'malformed-header',
              '[Number of Ports] expects a number',
              line.lineNumber,
            ),
          );
        }
        state.numberOfPorts = n;
      } else if (upper.startsWith('[TWO-PORT DATA ORDER]')) {
        const rest = raw.slice('[Two-Port Data Order]'.length).trim();
        if (rest === '21_12' || rest === '12_21') {
          state.dataOrder = rest as DataOrder;
        } else {
          warnings.push({
            kind: 'unknown-keyword',
            lineNumber: line.lineNumber,
            message: `unrecognized [Two-Port Data Order] value ${rest}`,
          });
        }
      } else if (upper.startsWith('[REFERENCE]')) {
        const rest = raw.slice('[Reference]'.length).trim();
        const vals = rest.split(/\s+/).map(Number);
        for (const v of vals) {
          if (!Number.isFinite(v) || v !== 50) {
            return err(
              new ParseError(
                'unsupported-reference',
                `[Reference] must be all 50; got ${rest}`,
                line.lineNumber,
              ),
            );
          }
        }
        state.referenceAll50 = true;
      } else if (upper.startsWith('[MATRIX FORMAT]')) {
        const rest = raw.slice('[Matrix Format]'.length).trim();
        if (rest.toUpperCase() !== 'FULL') {
          return err(
            new ParseError(
              'unsupported-version',
              `only [Matrix Format] Full supported; got ${rest}`,
              line.lineNumber,
            ),
          );
        }
        state.matrixFormatFull = true;
      } else if (upper.startsWith('[NETWORK DATA]')) {
        networkDataFound = true;
        i++;
        break;
      } else if (upper.startsWith('[END]')) {
        break;
      } else {
        warnings.push({
          kind: 'unknown-keyword',
          lineNumber: line.lineNumber,
          message: `unknown keyword line: ${raw}`,
        });
      }
    }
  }

  // Validate required header fields.
  if (state.version !== '2.0') {
    return err(
      new ParseError(
        'unsupported-version',
        `expected [Version] 2.0; got ${state.version ?? '(none)'}`,
      ),
    );
  }
  if (state.numberOfPorts !== 1 && state.numberOfPorts !== 2) {
    return err(
      new ParseError(
        'unsupported-version',
        `only [Number of Ports] 1 or 2 supported; got ${state.numberOfPorts}`,
      ),
    );
  }
  if (!state.optionLineSeen || !optionLine) {
    return err(
      new ParseError('missing-option-line', 'expected # option line before [Network Data]'),
    );
  }
  if (!networkDataFound) {
    return err(new ParseError('malformed-header', '[Network Data] keyword missing'));
  }

  const option = optionLine.value;
  const portCount = state.numberOfPorts as 1 | 2;
  const expected = 1 + 2 * portCount * portCount; // freq + 2*(N^2) values

  // Parse data rows until [End] or end.
  const frequencies: Hz[] = [];
  const s11: Complex[] = [];
  const s21: Complex[] = [];
  const freqScale = FREQ_MULTIPLIER[option.frequencyUnit];
  let dataRowCount = 0;
  let malformedCount = 0;
  const convert = formatConverterFor(option.format);

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (!line) break;
    if (line.kind === 'blank' || line.kind === 'comment') continue;
    if (line.kind === 'keyword') {
      const upper = line.raw.toUpperCase();
      if (upper.startsWith('[END]')) {
        break;
      }
      warnings.push({
        kind: 'unknown-keyword',
        lineNumber: line.lineNumber,
        message: `unexpected keyword inside data section: ${line.raw}`,
      });
      continue;
    }
    if (line.kind === 'malformed') {
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
    if (nums.length !== expected) {
      malformedCount++;
      warnings.push({
        kind: 'malformed-data-line',
        lineNumber: line.lineNumber,
        message: `expected ${expected} tokens, got ${nums.length}`,
      });
      continue;
    }
    frequencies.push(asHz((nums[0] ?? 0) * freqScale));
    if (portCount === 1) {
      s11.push(convert(nums[1] ?? 0, nums[2] ?? 0));
    } else if (state.dataOrder === '21_12') {
      // Columns: S11 S21 S12 S22
      s11.push(convert(nums[1] ?? 0, nums[2] ?? 0));
      s21.push(convert(nums[3] ?? 0, nums[4] ?? 0));
    } else {
      // 12_21 — Columns: S11 S12 S21 S22
      s11.push(convert(nums[1] ?? 0, nums[2] ?? 0));
      s21.push(convert(nums[5] ?? 0, nums[6] ?? 0));
    }
  }

  if (dataRowCount === 0) {
    return err(new ParseError('no-data-section', 'no data rows after [Network Data]'));
  }
  if (malformedCount / dataRowCount > 0.5) {
    return err(
      new ParseError(
        'too-many-malformed-lines',
        `${malformedCount}/${dataRowCount} data rows could not be parsed`,
      ),
    );
  }
  if (option.format !== 'MA') {
    warnings.push({
      kind: 'format-variant-converted',
      lineNumber: 0,
      message: `source format was ${option.format}; converted to canonical MA internally`,
    });
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
    name: 'Imported Touchstone 2.0',
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
