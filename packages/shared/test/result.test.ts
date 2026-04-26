import { describe, expect, it } from 'vitest';
import { type Result, err, isErr, isOk, mapResult, ok, unwrapOr } from '../src/result.js';

describe('Result', () => {
  it('ok() creates a successful result', () => {
    const r = ok(42);
    expect(r).toEqual({ kind: 'ok', value: 42 });
  });

  it('err() creates an error result', () => {
    const r = err(new Error('boom'));
    expect(r.kind).toBe('err');
    expect((r as { kind: 'err'; error: Error }).error.message).toBe('boom');
  });

  it('isOk narrows the type', () => {
    const r: Result<number, Error> = ok(1);
    if (isOk(r)) {
      const v: number = r.value;
      expect(v).toBe(1);
    } else {
      throw new Error('expected ok');
    }
  });

  it('isErr narrows the type', () => {
    const r: Result<number, Error> = err(new Error('x'));
    if (isErr(r)) {
      expect(r.error.message).toBe('x');
    } else {
      throw new Error('expected err');
    }
  });

  it('unwrapOr returns the default on err', () => {
    const r: Result<number, Error> = err(new Error('nope'));
    expect(unwrapOr(r, 7)).toBe(7);
  });

  it('unwrapOr returns the value on ok', () => {
    const r: Result<number, Error> = ok(3);
    expect(unwrapOr(r, 7)).toBe(3);
  });

  it('mapResult transforms ok values', () => {
    const r: Result<number, Error> = ok(2);
    const mapped = mapResult(r, (n) => n * 10);
    expect(mapped).toEqual({ kind: 'ok', value: 20 });
  });

  it('mapResult preserves err', () => {
    const e = new Error('keep');
    const r: Result<number, Error> = err(e);
    const mapped = mapResult(r, (n) => n * 10);
    expect(mapped).toEqual({ kind: 'err', error: e });
  });
});
