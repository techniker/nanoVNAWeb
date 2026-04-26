import type { DeviceInfo, Frame, LogEntry, Result, SweepParams } from '@nanovnaweb/shared';

export type IoErrorKind =
  | 'not-supported'
  | 'permission-denied'
  | 'no-device'
  | 'driver-mismatch'
  | 'not-connected'
  | 'command-failed'
  | 'unknown';

export interface IoError {
  readonly kind: IoErrorKind;
  readonly message: string;
  readonly cause?: unknown;
}

export interface ConnectOptions {
  readonly baudRate?: number;
  readonly probeTimeoutMs?: number;
}

export type ConnectionStatus =
  | { state: 'disconnected' }
  | { state: 'connecting' }
  | { state: 'connected'; info: DeviceInfo }
  | { state: 'lost'; reason: string };

export interface IoApi {
  connect(opts?: ConnectOptions): Promise<Result<DeviceInfo, IoError>>;
  disconnect(): Promise<void>;
  setSweep(params: SweepParams): Promise<Result<void, IoError>>;
  startStream(): Promise<Result<void, IoError>>;
  stopStream(): Promise<Result<void, IoError>>;
  onFrame(cb: (f: Frame) => void): Promise<() => Promise<void>>;
  onStatus(cb: (s: ConnectionStatus) => void): Promise<() => Promise<void>>;
  onLog(cb: (e: LogEntry) => void): Promise<() => Promise<void>>;
}
