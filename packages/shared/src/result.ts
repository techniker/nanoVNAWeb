export type Result<T, E> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ kind: 'ok', value });
export const err = <E>(error: E): Result<never, E> => ({ kind: 'err', error });

export const isOk = <T, E>(r: Result<T, E>): r is { kind: 'ok'; value: T } => r.kind === 'ok';

export const isErr = <T, E>(r: Result<T, E>): r is { kind: 'err'; error: E } => r.kind === 'err';

export const unwrapOr = <T, E>(r: Result<T, E>, fallback: T): T => (isOk(r) ? r.value : fallback);

export const mapResult = <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> =>
  isOk(r) ? ok(f(r.value)) : r;
