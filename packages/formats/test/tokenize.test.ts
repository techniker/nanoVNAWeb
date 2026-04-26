import { describe, expect, it } from 'vitest';
import { type TokenizedLine, tokenize } from '../src/touchstone/tokenize.js';

describe('tokenize', () => {
  it('classifies empty and comment-only lines', () => {
    const lines = tokenize('\n! comment\n   \n');
    expect(lines.map((l) => l.kind)).toEqual(['blank', 'comment', 'blank', 'blank']);
  });

  it('strips mid-line ! comments', () => {
    const lines = tokenize('1.0 2.0 ! rest is comment\n');
    expect(lines).toHaveLength(2);
    const first = lines[0] as TokenizedLine;
    expect(first.kind).toBe('numeric');
    if (first.kind === 'numeric') {
      expect(first.numbers).toEqual([1.0, 2.0]);
    }
  });

  it('classifies option line starting with #', () => {
    const lines = tokenize('# MHz S MA R 50\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]?.kind).toBe('option');
    if (lines[0]?.kind === 'option') {
      expect(lines[0].raw).toBe('# MHz S MA R 50');
    }
  });

  it('classifies keyword line starting with [', () => {
    const lines = tokenize('[Version] 2.0\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]?.kind).toBe('keyword');
    if (lines[0]?.kind === 'keyword') {
      expect(lines[0].raw).toBe('[Version] 2.0');
    }
  });

  it('classifies numeric lines with multiple tokens', () => {
    const lines = tokenize('1e9 0.5 -45\n');
    expect(lines[0]?.kind).toBe('numeric');
    if (lines[0]?.kind === 'numeric') {
      expect(lines[0].numbers).toEqual([1e9, 0.5, -45]);
    }
  });

  it('tracks 1-indexed line numbers', () => {
    const lines = tokenize('! comment\n1 2 3\n');
    expect(lines[0]?.lineNumber).toBe(1);
    expect(lines[1]?.lineNumber).toBe(2);
  });

  it('marks lines with non-numeric data after ! stripping as malformed', () => {
    const lines = tokenize('1.0 garbage 3.0\n');
    expect(lines[0]?.kind).toBe('malformed');
  });

  it('handles CRLF line endings', () => {
    const lines = tokenize('! one\r\n! two\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]?.kind).toBe('comment');
    expect(lines[1]?.kind).toBe('comment');
  });
});
