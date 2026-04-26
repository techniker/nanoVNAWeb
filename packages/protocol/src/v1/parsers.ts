import {
  type Complex,
  type DeviceCapabilities,
  type DeviceInfo,
  type Hz,
  asHz,
} from '@nanovnaweb/shared';

function makeV1Caps(
  maxHz: Hz,
  options: { minHz?: Hz; maxPoints?: number } = {},
): DeviceCapabilities {
  return Object.freeze({
    minFrequencyHz: options.minHz ?? asHz(50_000),
    maxFrequencyHz: maxHz,
    maxPoints: options.maxPoints ?? 101,
    supportsS11: true,
    // Every V1-class board exposes a CH1 / through port and answers the
    // `data 1` USB command — including NanoVNA-H, H4, F, F V2/V3. The
    // V1 driver fetches both s11 and s21 each sweep so chart slots can
    // freely swap between channels without driver reconfiguration.
    supportsS21: true,
    supportsAveraging: false,
  });
}

const V1_CAPS_BY_BOARD: Readonly<Record<string, DeviceCapabilities>> = Object.freeze({
  NanoVNA: makeV1Caps(asHz(900_000_000)),
  'NanoVNA-H': makeV1Caps(asHz(1_500_000_000)),
  'NanoVNA-H4': makeV1Caps(asHz(1_500_000_000)),
  'NanoVNA-F': makeV1Caps(asHz(1_500_000_000)),
  'NanoVNA-F_V2': makeV1Caps(asHz(3_000_000_000), { maxPoints: 301 }),
  'NanoVNA-F-V2': makeV1Caps(asHz(3_000_000_000), { maxPoints: 301 }),
  'NanoVNA-F_V3': makeV1Caps(asHz(3_000_000_000), { maxPoints: 301 }),
});

const V1_CAPS_UNKNOWN: DeviceCapabilities = makeV1Caps(asHz(900_000_000));

// Resolve caps by exact match first, then a case-insensitive prefix match on
// known hardware families. The F-series reports several variant strings across
// firmware revisions; matching on the family root keeps recognition robust.
function capsForBoard(board: string): DeviceCapabilities {
  const exact = V1_CAPS_BY_BOARD[board];
  if (exact !== undefined) return exact;
  const upper = board.toUpperCase();
  if (upper.includes('NANOVNA-F_V2') || upper.includes('NANOVNA-F-V2')) {
    return makeV1Caps(asHz(3_000_000_000), { maxPoints: 301 });
  }
  if (upper.includes('NANOVNA-F')) {
    return makeV1Caps(asHz(1_500_000_000));
  }
  if (upper.includes('NANOVNA-H4') || upper.includes('NANOVNA-H')) {
    return makeV1Caps(asHz(1_500_000_000));
  }
  return V1_CAPS_UNKNOWN;
}

const FREQ_UNIT_SCALES: Readonly<Record<string, number>> = Object.freeze({
  hz: 1,
  khz: 1_000,
  k: 1_000,
  mhz: 1_000_000,
  m: 1_000_000,
  ghz: 1_000_000_000,
  g: 1_000_000_000,
});

function parseFreqToken(raw: string): number | null {
  const t = raw.trim().toLowerCase().replace(/\s+/g, '');
  const m = t.match(/^([0-9]+(?:\.[0-9]+)?)([a-z]*)$/);
  if (m === null) return null;
  const n = Number.parseFloat(m[1] ?? '');
  if (!Number.isFinite(n)) return null;
  const unit = m[2] ?? '';
  const scale = unit.length === 0 ? 1 : (FREQ_UNIT_SCALES[unit] ?? null);
  if (scale === null) return null;
  return n * scale;
}

/**
 * Parses strings like `50k ~ 3GHz` or `100 kHz - 1.5 GHz` into a
 * {min, max} pair in Hz. Returns null if either bound can't be read.
 */
function parseFrequencyRange(raw: string): { min: number; max: number } | null {
  const sep = /[~\-–—]/;
  const parts = raw.split(sep);
  if (parts.length !== 2) return null;
  const min = parseFreqToken(parts[0] ?? '');
  const max = parseFreqToken(parts[1] ?? '');
  if (min === null || max === null) return null;
  if (!(max > min)) return null;
  return { min, max };
}

export function parseInfo(lines: readonly string[]): DeviceInfo {
  const record: Record<string, string> = {};
  for (const raw of lines) {
    const line = raw.trim();
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key.length > 0) record[key] = value;
  }
  // Prefer the canonical `board` key; F-series firmware emits `Model:` instead.
  const board = record.board ?? record.model ?? 'NanoVNA';
  let capabilities = capsForBoard(board);

  // Some firmware advertises its own supported range (e.g. F V2 emits
  // "Frequency: 50k ~ 3GHz"). Trust that over our board-name lookup when
  // present and well-formed — it's the authoritative source from the
  // device itself. Preserve maxPoints from the board-family lookup
  // because firmware rarely reports it.
  const freqRange = record.frequency !== undefined ? parseFrequencyRange(record.frequency) : null;
  if (freqRange !== null) {
    capabilities = Object.freeze({
      ...capabilities,
      minFrequencyHz: asHz(freqRange.min),
      maxFrequencyHz: asHz(freqRange.max),
    });
  }

  // Treat "Build time" / "Version" as firmware info when the canonical
  // `firmware` key is absent.
  const firmware = record.firmware ?? record.version ?? record['build time'];

  const info: DeviceInfo = {
    driverKind: 'v1',
    displayName: board,
    capabilities,
    ...(firmware ? { firmware } : {}),
    ...(record.hardware ? { hardware: record.hardware } : {}),
    rawInfo: lines.join('\n'),
  };
  return info;
}

export function parseDataLine(line: string): Complex | null {
  const parts = line.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const rePart = parts[0];
  const imPart = parts[1];
  if (rePart === undefined || imPart === undefined) return null;
  const re = Number(rePart);
  const im = Number(imPart);
  if (!Number.isFinite(re) || !Number.isFinite(im)) return null;
  return { re, im };
}

export function parseFrequencies(opts: {
  start: number;
  stop: number;
  points: number;
}): number[] {
  const { start, stop, points } = opts;
  if (points <= 0) return [];
  if (points === 1) return [start];
  const step = (stop - start) / (points - 1);
  const out = new Array<number>(points);
  for (let i = 0; i < points; i++) out[i] = start + i * step;
  return out;
}
