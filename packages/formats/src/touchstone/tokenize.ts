export type LineKind = 'blank' | 'comment' | 'option' | 'keyword' | 'numeric' | 'malformed';

export interface TokenizedLineBase {
  readonly lineNumber: number;
  readonly raw: string;
}
export interface BlankLine extends TokenizedLineBase {
  readonly kind: 'blank';
}
export interface CommentLine extends TokenizedLineBase {
  readonly kind: 'comment';
  readonly comment: string;
}
export interface OptionLineTok extends TokenizedLineBase {
  readonly kind: 'option';
}
export interface KeywordLineTok extends TokenizedLineBase {
  readonly kind: 'keyword';
}
export interface NumericLineTok extends TokenizedLineBase {
  readonly kind: 'numeric';
  readonly numbers: readonly number[];
}
export interface MalformedLineTok extends TokenizedLineBase {
  readonly kind: 'malformed';
  readonly reason: string;
}

export type TokenizedLine =
  | BlankLine
  | CommentLine
  | OptionLineTok
  | KeywordLineTok
  | NumericLineTok
  | MalformedLineTok;

export function tokenize(content: string): readonly TokenizedLine[] {
  const rawLines = content.split(/\r?\n/);
  // When the input uses CRLF line endings and ends with \r\n, the split
  // produces a spurious trailing empty string. Trim it so that N CRLF-
  // terminated lines yield exactly N TokenizedLine entries.
  const lines =
    content.endsWith('\r\n') && rawLines[rawLines.length - 1] === ''
      ? rawLines.slice(0, -1)
      : rawLines;

  const out: TokenizedLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const lineNumber = i + 1;
    // Strip mid-line ! comments (everything from ! to EOL).
    const bangIdx = raw.indexOf('!');
    const stripped = bangIdx >= 0 ? raw.slice(0, bangIdx) : raw;
    const trimmed = stripped.trim();

    if (bangIdx === 0) {
      out.push({
        kind: 'comment',
        lineNumber,
        raw,
        comment: raw.slice(1).trim(),
      });
      continue;
    }
    if (trimmed.length === 0) {
      out.push({ kind: 'blank', lineNumber, raw });
      continue;
    }
    if (trimmed.startsWith('#')) {
      out.push({ kind: 'option', lineNumber, raw: trimmed });
      continue;
    }
    if (trimmed.startsWith('[')) {
      out.push({ kind: 'keyword', lineNumber, raw: trimmed });
      continue;
    }
    // Numeric: try to parse all whitespace-separated tokens as numbers.
    const tokens = trimmed.split(/\s+/);
    const numbers: number[] = [];
    let malformed = false;
    for (const t of tokens) {
      const n = Number(t);
      if (!Number.isFinite(n)) {
        malformed = true;
        break;
      }
      numbers.push(n);
    }
    if (malformed) {
      out.push({
        kind: 'malformed',
        lineNumber,
        raw,
        reason: 'non-numeric token in data row',
      });
    } else {
      out.push({ kind: 'numeric', lineNumber, raw, numbers });
    }
  }
  return out;
}
