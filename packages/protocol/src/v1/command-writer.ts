import type { Transport, TransportError } from '@nanovnaweb/device';
import type { Result, SweepParams } from '@nanovnaweb/shared';

const CRLF = '\r\n';
const encoder = new TextEncoder();

export async function writeCommand(
  transport: Transport,
  command: string,
): Promise<Result<void, TransportError>> {
  return transport.write(encoder.encode(`${command}${CRLF}`));
}

export const commandInfo = (): string => 'info';
export const commandVersion = (): string => 'version';
export const commandSweep = (p: SweepParams): string =>
  `sweep ${p.start as number} ${p.stop as number} ${p.points}`;
export const commandData0 = (): string => 'data 0';
export const commandData1 = (): string => 'data 1';
export const commandResume = (): string => 'resume';
export const commandPause = (): string => 'pause';
