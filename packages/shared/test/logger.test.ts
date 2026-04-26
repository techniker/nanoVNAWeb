import { describe, expect, it } from 'vitest';
import { type LogEntry, MemoryRingLogger, createLogger } from '../src/logger.js';

describe('MemoryRingLogger', () => {
  it('stores log entries up to capacity and drops oldest', () => {
    const log = new MemoryRingLogger(3);
    log.info('io', 'one');
    log.info('io', 'two');
    log.info('io', 'three');
    log.info('io', 'four');
    const entries = log.snapshot();
    expect(entries.map((e) => e.message)).toEqual(['two', 'three', 'four']);
  });

  it('includes level, category, message, timestamp, and optional data', () => {
    const log = new MemoryRingLogger(10);
    log.warn('parse', 'bad frame', { offset: 42 });
    const [entry] = log.snapshot();
    expect(entry).toBeDefined();
    const e = entry as LogEntry;
    expect(e.level).toBe('warn');
    expect(e.category).toBe('parse');
    expect(e.message).toBe('bad frame');
    expect(e.data).toEqual({ offset: 42 });
    expect(typeof e.timestamp).toBe('number');
  });

  it('notifies subscribers on new entries', () => {
    const log = new MemoryRingLogger(5);
    const received: LogEntry[] = [];
    const unsubscribe = log.onEntry((e) => received.push(e));
    log.debug('x', 'hi');
    unsubscribe();
    log.debug('x', 'after');
    expect(received).toHaveLength(1);
    expect(received[0]?.message).toBe('hi');
  });
});

describe('createLogger', () => {
  it('creates a namespaced logger delegating to sinks', () => {
    const sink = new MemoryRingLogger(10);
    const log = createLogger(sink, 'io');
    log.info('hello');
    const [entry] = sink.snapshot();
    expect(entry?.category).toBe('io');
    expect(entry?.message).toBe('hello');
  });
});
