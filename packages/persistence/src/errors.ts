export type PersistenceErrorKind =
  | 'database-unavailable'
  | 'database-closed'
  | 'quota-exceeded'
  | 'migration-failed'
  | 'not-found'
  | 'unknown';

export class PersistenceError extends Error {
  constructor(
    public readonly kind: PersistenceErrorKind,
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PersistenceError';
  }
}
