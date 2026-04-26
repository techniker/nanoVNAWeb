export type ParseWarningKind =
  | 'malformed-data-line'
  | 'unknown-keyword'
  | 'format-variant-converted'
  | 'trailing-garbage';

export interface ParseWarning {
  readonly kind: ParseWarningKind;
  readonly lineNumber: number;
  readonly message: string;
}

export type ParseErrorKind =
  | 'empty-file'
  | 'missing-option-line'
  | 'unsupported-parameter-type'
  | 'unsupported-reference'
  | 'unsupported-version'
  | 'too-many-malformed-lines'
  | 'malformed-header'
  | 'no-data-section';

export class ParseError extends Error {
  constructor(
    public readonly kind: ParseErrorKind,
    message: string,
    public readonly lineNumber?: number,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ParseError';
  }
}
