import { createLogRepository, createTraceRepository, openDatabase } from '@nanovnaweb/persistence';
import type { AppDeps, AppState } from '@nanovnaweb/state';
import { createAppState } from '@nanovnaweb/state';
import { createBrowserIoService } from '@nanovnaweb/workers';

export interface AppServices {
  readonly deps: AppDeps;
  readonly state: AppState;
  dispose(): Promise<void>;
}

export async function createAppServices(): Promise<AppServices> {
  const dbResult = await openDatabase();
  if (dbResult.kind === 'err') {
    throw new Error(`Failed to open database: ${dbResult.error.message}`, {
      cause: dbResult.error,
    });
  }
  const db = dbResult.value;
  const traceRepo = createTraceRepository(db);
  const logRepo = createLogRepository(db);
  const io = createBrowserIoService();
  const deps: AppDeps = { io, traceRepo, logRepo };
  const state = await createAppState(deps);
  state.stores.debug.actions.startFlush();

  return {
    deps,
    state,
    async dispose() {
      await state.dispose();
    },
  };
}
