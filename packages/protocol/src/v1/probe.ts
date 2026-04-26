import type { Transport } from '@nanovnaweb/device';
import { type DeviceInfo, type Result, err, ok } from '@nanovnaweb/shared';
import { ProbeError } from '../errors.js';
import type { DriverProbe } from '../registry.js';
import { writeCommand } from './command-writer.js';
import { V1Driver } from './driver.js';
import { parseInfo } from './parsers.js';

interface V1ProbeOptions {
  readonly timeoutMs: number;
}

async function drain(transport: Transport, ms: number): Promise<void> {
  const reader = transport.readable().getReader();
  const timeout = setTimeout(() => {
    reader.cancel().catch(() => {});
  }, ms);
  try {
    while (true) {
      const r = await reader.read().catch(() => ({ value: undefined, done: true }));
      if (r.done) return;
      // discard r.value
    }
  } finally {
    clearTimeout(timeout);
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}

export async function probeV1(
  transport: Transport,
  opts: V1ProbeOptions,
): Promise<Result<DeviceInfo, ProbeError>> {
  // Pre-flush: drain any bytes a prior probe (e.g., V2 probe that failed)
  // may have left, and force V1 to process any residual command-line
  // content. Sending a bare CRLF makes V1 execute whatever is in its
  // buffer (almost certainly an invalid command → '?' response), after
  // which it returns to the ch> prompt. Drain the response briefly.
  await writeCommand(transport, '');
  await drain(transport, 50);

  const writeResult = await writeCommand(transport, 'info');
  if (writeResult.kind === 'err') {
    return err(new ProbeError('io-failure', 'failed to send info command', writeResult.error));
  }

  const lines: string[] = [];
  const reader = transport.readable().getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let done = false;

  const timeoutHandle = setTimeout(() => {
    done = true;
    // Cancel the reader to unblock any pending read()
    reader.cancel().catch(() => {
      /* ignore */
    });
  }, opts.timeoutMs);

  try {
    outer: while (!done) {
      const { value, isDone } = await reader
        .read()
        .then((r) => ({ value: r.value, isDone: r.done }))
        .catch(() => ({ value: undefined, isDone: true }));

      if (isDone) break;
      if (value === undefined) break;

      buffer += decoder.decode(value, { stream: true });
      let idx = buffer.indexOf('\n');
      while (idx !== -1) {
        let line = buffer.slice(0, idx);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        buffer = buffer.slice(idx + 1);
        const trimmed = line.trim();
        if (trimmed.startsWith('ch>') || trimmed === '') {
          if (lines.length > 0) break outer;
        } else {
          lines.push(trimmed);
          if (lines.length > 20) break outer;
        }
        idx = buffer.indexOf('\n');
      }
    }
  } finally {
    clearTimeout(timeoutHandle);
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  if (lines.length === 0) {
    return err(new ProbeError('no-match', 'no response to info command'));
  }
  const joined = lines.join('\n');
  if (!joined.toLowerCase().includes('nanovna')) {
    return err(new ProbeError('no-match', 'response did not identify a NanoVNA'));
  }
  return ok(parseInfo(lines));
}

export const v1DriverProbe: DriverProbe = {
  kind: 'v1',
  displayName: 'NanoVNA V1',
  probe: (transport, opts) => probeV1(transport, { timeoutMs: opts.timeoutMs ?? 750 }),
  create: (transport, info) => new V1Driver(transport, info),
};
