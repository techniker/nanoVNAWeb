import type { ChartKind, SParam } from '@nanovnaweb/render';
import { type StoreApi, useStore as useZustandStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export type LayoutPreset = 'single' | 'horizontal-pair' | 'vertical-pair' | 'quad';

export interface SlotConfig {
  readonly id: string;
  readonly kind: ChartKind;
  readonly primarySParam: SParam;
  readonly primaryColor: string;
  readonly overlayIds: readonly string[];
  readonly crosshairEnabled: boolean;
}

export interface ChartState {
  readonly preset: LayoutPreset;
  readonly slots: Readonly<Record<string, SlotConfig>>;
  readonly slotOrder: readonly string[];
  readonly selectedSlotId: string | null;
  /**
   * Shared hover frequency in Hz. Set by whichever chart the pointer is
   * currently over; read by every chart so a hover on one pane updates
   * the cursor on all panes (Keysight-style synchronized marker).
   * `null` when no chart is being hovered.
   */
  readonly hoverFrequencyHz: number | null;
  /**
   * ID of the trace the pointer snapped to (whichever visible trace is
   * closest to the cursor at hover time). The chart overlays use this to
   * pick which per-trace marker gets the full readout label while every
   * other visible trace just draws its diamond. `null` when no hover.
   */
  readonly hoverActiveTraceId: string | null;
}

export interface ChartActions {
  setPreset(p: LayoutPreset): void;
  setSlot(id: string, patch: Partial<Omit<SlotConfig, 'id'>>): void;
  selectSlot(id: string | null): void;
  toggleOverlay(slotId: string, recordingId: string): void;
  toggleCrosshair(slotId: string): void;
  setHoverFrequency(hz: number | null): void;
  setHover(hz: number | null, traceId: string | null): void;
}

const SLOT_IDS = Object.freeze(['slot-0', 'slot-1', 'slot-2', 'slot-3'] as const);

const DEFAULT_KINDS: readonly ChartKind[] = Object.freeze(['rect', 'smith', 'vswr', 'phase']);

const PRESET_STORAGE_KEY = 'nanovnaweb.chart.preset';

const VALID_PRESETS: readonly LayoutPreset[] = [
  'single',
  'horizontal-pair',
  'vertical-pair',
  'quad',
];

function readStoredPreset(): LayoutPreset {
  try {
    const raw = globalThis.localStorage?.getItem(PRESET_STORAGE_KEY);
    if (raw !== null && raw !== undefined && VALID_PRESETS.includes(raw as LayoutPreset)) {
      return raw as LayoutPreset;
    }
  } catch {
    // localStorage unavailable (SSR, private browsing, Node tests).
  }
  return 'quad';
}

function writeStoredPreset(p: LayoutPreset): void {
  try {
    globalThis.localStorage?.setItem(PRESET_STORAGE_KEY, p);
  } catch {
    // ignore
  }
}

function defaultSlot(id: string, index: number): SlotConfig {
  const kind = DEFAULT_KINDS[index] ?? 'rect';
  return {
    id,
    kind,
    primarySParam: 's11',
    primaryColor: `var(--color-trace-${(index % 8) + 1})`,
    overlayIds: Object.freeze([]),
    crosshairEnabled: true,
  };
}

export function createChartStore(): {
  readonly store: StoreApi<ChartState>;
  readonly actions: ChartActions;
} {
  const initialSlots: Record<string, SlotConfig> = {};
  for (const [i, id] of SLOT_IDS.entries()) {
    initialSlots[id] = defaultSlot(id, i);
  }

  const store = createStore<ChartState>()(() => ({
    preset: readStoredPreset(),
    slots: Object.freeze({ ...initialSlots }),
    slotOrder: Object.freeze([...SLOT_IDS]),
    selectedSlotId: 'slot-0',
    hoverFrequencyHz: null,
    hoverActiveTraceId: null,
  }));

  const actions: ChartActions = {
    setPreset(p) {
      store.setState({ preset: p });
      writeStoredPreset(p);
    },
    setSlot(id, patch) {
      const cur = store.getState().slots[id];
      if (cur === undefined) return;
      const nextSlot: SlotConfig = {
        ...cur,
        ...patch,
        overlayIds:
          patch.overlayIds !== undefined ? Object.freeze([...patch.overlayIds]) : cur.overlayIds,
      };
      store.setState({
        slots: Object.freeze({ ...store.getState().slots, [id]: nextSlot }),
      });
    },
    selectSlot(id) {
      store.setState({ selectedSlotId: id });
    },
    toggleOverlay(slotId, recordingId) {
      const cur = store.getState().slots[slotId];
      if (cur === undefined) return;
      const has = cur.overlayIds.includes(recordingId);
      const nextIds = has
        ? cur.overlayIds.filter((x) => x !== recordingId)
        : [...cur.overlayIds, recordingId];
      actions.setSlot(slotId, { overlayIds: Object.freeze([...nextIds]) });
    },
    toggleCrosshair(slotId) {
      const cur = store.getState().slots[slotId];
      if (cur === undefined) return;
      actions.setSlot(slotId, { crosshairEnabled: !cur.crosshairEnabled });
    },
    setHoverFrequency(hz) {
      store.setState({ hoverFrequencyHz: hz, hoverActiveTraceId: null });
    },
    setHover(hz, traceId) {
      store.setState({ hoverFrequencyHz: hz, hoverActiveTraceId: traceId });
    },
  };

  return { store, actions };
}

export function useChartStore<T>(
  store: StoreApi<ChartState>,
  selector: (state: ChartState) => T,
): T {
  return useZustandStore(store, selector);
}
