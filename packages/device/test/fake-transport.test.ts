import { isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { FakeTransport } from '../src/fake-transport.js';

describe('FakeTransport', () => {
  it('is closed before open', () => {
    const t = new FakeTransport();
    expect(t.isOpen).toBe(false);
  });

  it('opens and then is marked open', async () => {
    const t = new FakeTransport();
    const r = await t.open({ baudRate: 9600 });
    expect(isOk(r)).toBe(true);
    expect(t.isOpen).toBe(true);
  });

  it('records writes from the consumer', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 9600 });
    await t.write(new TextEncoder().encode('info\r\n'));
    const received = t.getWrittenAsText();
    expect(received).toBe('info\r\n');
  });

  it('pushes scripted bytes to the readable stream', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 9600 });
    const reader = t.readable().getReader();
    t.pushBytes(new TextEncoder().encode('board NanoVNA-V1\r\n'));
    t.closeInputs();
    let received = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += new TextDecoder().decode(value);
    }
    expect(received).toBe('board NanoVNA-V1\r\n');
  });

  it('calls onClose when closed', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 9600 });
    let closed = false;
    t.onClose(() => {
      closed = true;
    });
    await t.close();
    expect(closed).toBe(true);
  });
});
