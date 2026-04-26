export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly level: LogLevel;
  readonly category: string;
  readonly message: string;
  readonly timestamp: number;
  readonly data?: unknown;
}

export interface LogSink {
  debug(category: string, message: string, data?: unknown): void;
  info(category: string, message: string, data?: unknown): void;
  warn(category: string, message: string, data?: unknown): void;
  error(category: string, message: string, data?: unknown): void;
}

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export class MemoryRingLogger implements LogSink {
  private buffer: LogEntry[] = [];
  private subscribers = new Set<(entry: LogEntry) => void>();

  constructor(private readonly capacity: number) {
    if (capacity <= 0) throw new Error('capacity must be > 0');
  }

  debug(category: string, message: string, data?: unknown): void {
    this.push('debug', category, message, data);
  }
  info(category: string, message: string, data?: unknown): void {
    this.push('info', category, message, data);
  }
  warn(category: string, message: string, data?: unknown): void {
    this.push('warn', category, message, data);
  }
  error(category: string, message: string, data?: unknown): void {
    this.push('error', category, message, data);
  }

  snapshot(): readonly LogEntry[] {
    return [...this.buffer];
  }

  onEntry(cb: (e: LogEntry) => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private push(level: LogLevel, category: string, message: string, data?: unknown): void {
    const entry: LogEntry = Object.freeze({
      level,
      category,
      message,
      timestamp: Date.now(),
      ...(data !== undefined ? { data } : {}),
    });
    this.buffer.push(entry);
    while (this.buffer.length > this.capacity) this.buffer.shift();
    for (const s of this.subscribers) s(entry);
  }
}

export const createLogger = (sink: LogSink, category: string): Logger => ({
  debug: (m, d) => sink.debug(category, m, d),
  info: (m, d) => sink.info(category, m, d),
  warn: (m, d) => sink.warn(category, m, d),
  error: (m, d) => sink.error(category, m, d),
});
