import { type Frame, type TraceRecord, asHz, isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import {
  buildTouchstoneExport,
  parseTouchstoneImport,
} from '../src/import-export/touchstone-bridge.js';

const MIN_S1P = `# Hz S MA R 50
1000000  0.5  -45
`;

describe('parseTouchstoneImport', () => {
  it('delegates to readTouchstone and returns a ParseResult', async () => {
    const blob = new Blob([MIN_S1P], { type: 'text/plain' });
    const r = await parseTouchstoneImport(blob);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.frame.frequencies[0]).toBe(1_000_000);
      expect(r.value.warnings).toEqual([]);
    }
  });

  it('forwards suggestedName option', async () => {
    const blob = new Blob([MIN_S1P], { type: 'text/plain' });
    const r = await parseTouchstoneImport(blob, { suggestedName: 'Custom' });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.name).toBe('Custom');
    }
  });
});

describe('buildTouchstoneExport', () => {
  it('produces a ReadableStream that decodes to Touchstone text', async () => {
    const frame: Frame = Object.freeze({
      sequence: 0,
      timestamp: 0,
      frequencies: Object.freeze([asHz(1_000_000)]),
      s11: Object.freeze([{ re: 1, im: 0 }]),
    });
    const trace: TraceRecord = {
      id: 'x',
      name: 'test',
      createdAt: 0,
      frame,
    };
    const stream = buildTouchstoneExport(trace);
    const reader = stream.getReader();
    let text = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
    }
    expect(text).toContain('# Hz S MA R 50');
    expect(text).toMatch(/^1000000\b/m);
  });
});
