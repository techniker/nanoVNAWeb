export {
  createAppStore,
  useAppStore,
  type AppStoreActions,
  type AppStoreState,
} from './slices/app-store.js';

export {
  createConnectionStore,
  useConnectionStore,
  type ConnectionActions,
  type ConnectionState,
} from './slices/connection-store.js';

export {
  createSweepStore,
  useSweepStore,
  type SweepActions,
  type SweepState,
} from './slices/sweep-store.js';

export {
  createModeStore,
  useModeStore,
  type AppMode,
  type ModeActions,
  type ModeState,
} from './slices/mode-store.js';

export {
  createLiveStore,
  useLiveStore,
  type LiveActions,
  type LiveState,
} from './slices/live-store.js';

export {
  createTraceStore,
  useTraceStore,
  type TraceActions,
  type TraceLibrary,
} from './slices/trace-store.js';

export {
  createDebugStore,
  useDebugStore,
  type DebugActions,
  type DebugState,
} from './slices/debug-store.js';

export {
  createChartStore,
  useChartStore,
  type ChartActions,
  type ChartState,
  type LayoutPreset,
  type SlotConfig,
} from './slices/chart-store.js';

export { createAppState, type AppState } from './app-state.js';
export type { AppDeps } from './types.js';

export { AppStateProvider, useStores } from './react.js';
