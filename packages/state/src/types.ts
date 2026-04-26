import type { LogRepository, TraceRepository } from '@nanovnaweb/persistence';
import type { IoApi } from '@nanovnaweb/workers';

export interface AppDeps {
  readonly io: IoApi;
  readonly traceRepo: TraceRepository;
  readonly logRepo: LogRepository;
}

// AppState type is exported from app-state.ts to avoid circular imports.
