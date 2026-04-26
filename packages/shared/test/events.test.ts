import { describe, expect, it, vi } from 'vitest';
import { TypedEmitter } from '../src/events.js';

type Events = {
  ping: { n: number };
  hello: { name: string };
};

describe('TypedEmitter', () => {
  it('calls subscribers with the event payload', () => {
    const e = new TypedEmitter<Events>();
    const spy = vi.fn();
    e.on('ping', spy);
    e.emit('ping', { n: 7 });
    expect(spy).toHaveBeenCalledWith({ n: 7 });
  });

  it('ignores subscribers for other events', () => {
    const e = new TypedEmitter<Events>();
    const spy = vi.fn();
    e.on('hello', spy);
    e.emit('ping', { n: 1 });
    expect(spy).not.toHaveBeenCalled();
  });

  it('unsubscribe stops calls', () => {
    const e = new TypedEmitter<Events>();
    const spy = vi.fn();
    const off = e.on('ping', spy);
    off();
    e.emit('ping', { n: 1 });
    expect(spy).not.toHaveBeenCalled();
  });

  it('removeAllListeners clears subscribers', () => {
    const e = new TypedEmitter<Events>();
    const spy = vi.fn();
    e.on('ping', spy);
    e.removeAllListeners();
    e.emit('ping', { n: 1 });
    expect(spy).not.toHaveBeenCalled();
  });
});
