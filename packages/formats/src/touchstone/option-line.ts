import { type Result, err, ok } from '@nanovnaweb/shared';
import { ParseError } from '../warnings.js';

export type FrequencyUnit = 'Hz' | 'kHz' | 'MHz' | 'GHz';
export type TouchstoneFormat = 'RI' | 'MA' | 'DB';

export interface OptionLine {
  readonly frequencyUnit: FrequencyUnit;
  readonly parameterType: 'S';
  readonly format: TouchstoneFormat;
  readonly referenceOhm: number;
}

const FREQ_UNITS: Record<string, FrequencyUnit> = {
  HZ: 'Hz',
  KHZ: 'kHz',
  MHZ: 'MHz',
  GHZ: 'GHz',
};
const PARAM_TYPES = new Set(['S', 'Y', 'Z', 'H', 'G']);
const FORMATS = new Set(['RI', 'MA', 'DB']);

export function parseOptionLine(line: string, lineNumber: number): Result<OptionLine, ParseError> {
  const trimmed = line.trim();
  if (!trimmed.startsWith('#')) {
    return err(new ParseError('missing-option-line', 'option line must start with #', lineNumber));
  }

  const tokens = trimmed
    .slice(1)
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => t.toUpperCase());

  let frequencyUnit: FrequencyUnit | null = null;
  let parameterType: string | null = null;
  let format: TouchstoneFormat | null = null;
  let referenceOhm: number | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i] ?? '';
    if (t in FREQ_UNITS) {
      frequencyUnit = FREQ_UNITS[t] ?? null;
      continue;
    }
    if (PARAM_TYPES.has(t)) {
      parameterType = t;
      continue;
    }
    if (FORMATS.has(t)) {
      format = t as TouchstoneFormat;
      continue;
    }
    if (t === 'R') {
      const next = tokens[i + 1];
      if (next === undefined || next === '') {
        return err(
          new ParseError('malformed-header', 'R token requires a numeric value', lineNumber),
        );
      }
      const parsed = Number(next);
      if (!Number.isFinite(parsed)) {
        return err(
          new ParseError('malformed-header', `R expects a numeric value, got ${next}`, lineNumber),
        );
      }
      referenceOhm = parsed;
      i++;
      continue;
    }
    return err(new ParseError('malformed-header', `unrecognized token: ${t}`, lineNumber));
  }

  if (parameterType !== null && parameterType !== 'S') {
    return err(
      new ParseError(
        'unsupported-parameter-type',
        `only S parameters supported; got ${parameterType}`,
        lineNumber,
      ),
    );
  }
  if (referenceOhm !== null && referenceOhm !== 50) {
    return err(
      new ParseError(
        'unsupported-reference',
        `only 50 ohm reference supported; got ${referenceOhm}`,
        lineNumber,
      ),
    );
  }

  return ok({
    frequencyUnit: frequencyUnit ?? 'GHz',
    parameterType: 'S',
    format: format ?? 'MA',
    referenceOhm: referenceOhm ?? 50,
  });
}

export function emitOptionLine(): string {
  return '# Hz S MA R 50';
}
