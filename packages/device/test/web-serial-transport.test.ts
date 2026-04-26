import { isErr, isOk } from '@nanovnaweb/shared';
import { describe, expect, it, vi } from 'vitest';
import { WebSerialTransport } from '../src/web-serial-transport.js';

function makeFakeSerialPort() {
  const writes: Uint8Array[] = [];
  let pushBytes: ((b: Uint8Array) => void) | null = null;
  const readable = new ReadableStream<Uint8Array>({
    start(ctrl) {
      pushBytes = (b) => ctrl.enqueue(b);
    },
  });
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      writes.push(chunk);
    },
  });
  const port = {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    readable,
    writable,
  };
  return { port, writes, pushBytes: (b: Uint8Array) => pushBytes?.(b) };
}

describe('WebSerialTransport', () => {
  it('open() calls port.open with baud rate and returns ok', async () => {
    const { port } = makeFakeSerialPort();
    const t = new WebSerialTransport(port as never);
    const r = await t.open({ baudRate: 115200 });
    expect(isOk(r)).toBe(true);
    expect(port.open).toHaveBeenCalledWith({ baudRate: 115200 });
    expect(t.isOpen).toBe(true);
  });

  it('write() forwards bytes to the writable stream', async () => {
    const { port, writes } = makeFakeSerialPort();
    const t = new WebSerialTransport(port as never);
    await t.open({ baudRate: 115200 });
    const data = new TextEncoder().encode('info\r\n');
    await t.write(data);
    expect(writes[0]).toEqual(data);
  });

  it('readable() exposes the port readable stream', async () => {
    const { port, pushBytes } = makeFakeSerialPort();
    const t = new WebSerialTransport(port as never);
    await t.open({ baudRate: 115200 });
    const reader = t.readable().getReader();
    pushBytes(new TextEncoder().encode('hello'));
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toBe('hello');
  });

  it('wraps a failing open() as TransportError with kind=open-failed', async () => {
    const { port } = makeFakeSerialPort();
    port.open = vi.fn().mockRejectedValue(new Error('busy'));
    const t = new WebSerialTransport(port as never);
    const r = await t.open({ baudRate: 115200 });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.kind).toBe('open-failed');
    }
  });
});
