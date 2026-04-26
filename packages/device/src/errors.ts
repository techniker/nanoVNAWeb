export type TransportErrorKind =
  | 'not-supported'
  | 'port-unavailable'
  | 'permission-denied'
  | 'open-failed'
  | 'write-failed'
  | 'read-failed'
  | 'closed'
  | 'timeout'
  | 'unknown';

export class TransportError extends Error {
  constructor(
    public readonly kind: TransportErrorKind,
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'TransportError';
  }
}
