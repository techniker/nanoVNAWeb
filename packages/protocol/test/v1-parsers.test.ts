import { describe, expect, it } from 'vitest';
import { parseDataLine, parseFrequencies, parseInfo } from '../src/v1/parsers.js';

describe('V1 parsers', () => {
  it('parseInfo extracts board + fw/hw from the info block', () => {
    const infoLines = ['board: NanoVNA-H', 'firmware: 1.0.46', 'hardware: 3.2', 'protocol: V1'];
    const parsed = parseInfo(infoLines);
    expect(parsed.hardware).toBe('3.2');
    expect(parsed.firmware).toBe('1.0.46');
    expect(parsed.displayName).toBe('NanoVNA-H');
    expect(parsed.driverKind).toBe('v1');
    expect(parsed.rawInfo).toContain('board: NanoVNA-H');
  });

  it('parseInfo tolerates missing optional fields', () => {
    const parsed = parseInfo(['board: NanoVNA']);
    expect(parsed.displayName).toBe('NanoVNA');
    expect(parsed.firmware).toBeUndefined();
  });

  it('parseInfo recognizes NanoVNA-F_V2 with 3 GHz max', () => {
    const parsed = parseInfo(['board: NanoVNA-F_V2', 'firmware: 1.0', 'hardware: 2.0']);
    expect(parsed.displayName).toBe('NanoVNA-F_V2');
    expect(Number(parsed.capabilities.maxFrequencyHz)).toBe(3_000_000_000);
  });

  it('parseInfo recognizes F-series via prefix even with unknown suffix', () => {
    const parsed = parseInfo(['board: NanoVNA-F_Custom']);
    expect(Number(parsed.capabilities.maxFrequencyHz)).toBe(1_500_000_000);
  });

  it('parseInfo accepts Model: as an alias for board: (F V2 firmware)', () => {
    const parsed = parseInfo([
      'info',
      'Model: NanoVNA-F_V2',
      'Frequency: 50k ~ 3GHz',
      'Build time: Jun 18 2025 - 13:48:38 CST',
    ]);
    expect(parsed.displayName).toBe('NanoVNA-F_V2');
    expect(Number(parsed.capabilities.maxFrequencyHz)).toBe(3_000_000_000);
    expect(Number(parsed.capabilities.minFrequencyHz)).toBe(50_000);
  });

  it('parseInfo prefers Frequency: range over board-name lookup', () => {
    const parsed = parseInfo(['board: NanoVNA', 'Frequency: 100kHz ~ 1.5 GHz']);
    expect(Number(parsed.capabilities.minFrequencyHz)).toBe(100_000);
    expect(Number(parsed.capabilities.maxFrequencyHz)).toBe(1_500_000_000);
  });

  it('parseInfo Build time falls through as firmware when Version absent', () => {
    const parsed = parseInfo(['Model: NanoVNA-F_V2', 'Build time: Jun 18 2025']);
    expect(parsed.firmware).toBe('Jun 18 2025');
  });

  it('parseDataLine returns {re, im} from two space-separated floats', () => {
    const v = parseDataLine('0.12345 -0.67890');
    expect(v).toEqual({ re: 0.12345, im: -0.6789 });
  });

  it('parseDataLine returns null for malformed input', () => {
    expect(parseDataLine('garbage')).toBeNull();
    expect(parseDataLine('1.0')).toBeNull();
    expect(parseDataLine('')).toBeNull();
  });

  it('parseFrequencies generates an array of N points spanning start..stop', () => {
    const fs = parseFrequencies({ start: 100, stop: 200, points: 3 });
    expect(fs).toEqual([100, 150, 200]);
  });

  it('parseFrequencies with 1 point returns [start]', () => {
    const fs = parseFrequencies({ start: 100, stop: 200, points: 1 });
    expect(fs).toEqual([100]);
  });
});
