export type ProbeErrorKind = 'no-match' | 'io-failure' | 'timeout';
export class ProbeError extends Error {
  constructor(
    public readonly kind: ProbeErrorKind,
    message: string,
    // `override` required because ES2022 Error declares `cause` natively
    // and tsconfig has `noImplicitOverride: true`.
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProbeError';
  }
}

export type DriverErrorKind =
  | 'not-connected'
  | 'command-failed'
  | 'unexpected-response'
  | 'timeout'
  | 'parse-error'
  | 'crc-error'
  | 'fifo-desync';
export class DriverError extends Error {
  constructor(
    public readonly kind: DriverErrorKind,
    message: string,
    // `override` required because ES2022 Error declares `cause` natively
    // and tsconfig has `noImplicitOverride: true`.
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DriverError';
  }
}
