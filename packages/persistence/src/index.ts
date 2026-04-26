export { PersistenceError, type PersistenceErrorKind } from './errors.js';
export { closeDatabase, openDatabase } from './db.js';
export type { NanoVnaWebDb } from './db.js';
export {
  createTraceRepository,
  type TraceRepository,
} from './repositories/trace-repository.js';
export {
  createLogRepository,
  type LogAutoFlushHandle,
  type LogRepository,
} from './repositories/log-repository.js';
