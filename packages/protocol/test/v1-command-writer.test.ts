import { FakeTransport } from '@nanovnaweb/device';
import { asHz } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import {
  commandInfo,
  commandSweep,
  commandVersion,
  writeCommand,
} from '../src/v1/command-writer.js';

describe('V1 command writer', () => {
  it('writeCommand writes the command followed by CRLF', async () => {
    const t = new FakeTransport();
    await t.open({ baudRate: 115200 });
    await writeCommand(t, 'info');
    expect(t.getWrittenAsText()).toBe('info\r\n');
  });

  it('commandInfo emits "info"', () => {
    expect(commandInfo()).toBe('info');
  });

  it('commandVersion emits "version"', () => {
    expect(commandVersion()).toBe('version');
  });

  it('commandSweep emits "sweep <start> <stop> <points>"', () => {
    const cmd = commandSweep({ start: asHz(100_000), stop: asHz(900_000_000), points: 101 });
    expect(cmd).toBe('sweep 100000 900000000 101');
  });
});
