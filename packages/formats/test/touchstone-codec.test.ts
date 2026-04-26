import { isErr, isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { readTouchstone, touchstoneCodec } from '../src/touchstone/index.js';

const MIN_S1P = `# Hz S MA R 50
1000000  0.5  -45
`;

describe('touchstoneCodec.read (Blob)', () => {
  it('parses a Blob and yields one ParseResult', async () => {
    const blob = new Blob([MIN_S1P], { type: 'text/plain' });
    const results = [];
    for await (const r of touchstoneCodec.read(blob)) {
      results.push(r);
    }
    expect(results).toHaveLength(1);
    expect(results[0]?.trace.frame.frequencies[0]).toBe(1_000_000);
    expect(results[0]?.warnings).toEqual([]);
  });

  it('throws ParseError on malformed input', async () => {
    const blob = new Blob(['garbage'], { type: 'text/plain' });
    await expect(async () => {
      for await (const _ of touchstoneCodec.read(blob)) {
        // consume
      }
    }).rejects.toThrow();
  });
});

describe('readTouchstone convenience wrapper', () => {
  it('returns ok with ParseResult on valid input', async () => {
    const blob = new Blob([MIN_S1P], { type: 'text/plain' });
    const r = await readTouchstone(blob);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.name).toBe('Imported Touchstone 1.0');
    }
  });

  it('applies suggestedName override when provided', async () => {
    const blob = new Blob([MIN_S1P], { type: 'text/plain' });
    const r = await readTouchstone(blob, { suggestedName: 'MyAntenna' });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.trace.name).toBe('MyAntenna');
    }
  });

  it('returns err with ParseError on malformed input (caught, not thrown)', async () => {
    const blob = new Blob(['garbage'], { type: 'text/plain' });
    const r = await readTouchstone(blob);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.kind).toBe('missing-option-line');
    }
  });

  it('returns err empty-file on completely empty Blob', async () => {
    const blob = new Blob([''], { type: 'text/plain' });
    const r = await readTouchstone(blob);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.kind).toBe('empty-file');
    }
  });
});

describe('touchstoneCodec.write (ReadableStream)', () => {
  it('writes a 1-port trace and yields bytes that can be re-read', async () => {
    async function* once() {
      const blob = new Blob([MIN_S1P], { type: 'text/plain' });
      const first = await readTouchstone(blob);
      if (isOk(first)) yield first.value.trace;
    }
    const stream = touchstoneCodec.write(once());
    const reader = stream.getReader();
    let collected = new Uint8Array(0);
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const next = new Uint8Array(collected.byteLength + value.byteLength);
      next.set(collected, 0);
      next.set(value, collected.byteLength);
      collected = next;
    }
    const text = new TextDecoder().decode(collected);
    expect(text).toContain('# Hz S MA R 50');
    expect(text).toMatch(/^1000000\b/m);
  });
});
