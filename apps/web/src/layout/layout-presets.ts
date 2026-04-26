import type { LayoutPreset } from '@nanovnaweb/state';

export interface LayoutPresetSpec {
  readonly slotCount: 1 | 2 | 4;
  readonly gridTemplate: string;
  readonly gridRows: string;
  readonly gridColumns: string;
}

export const LAYOUT_PRESETS: Readonly<Record<LayoutPreset, LayoutPresetSpec>> = Object.freeze({
  single: {
    slotCount: 1,
    gridTemplate: '"slot-0"',
    gridRows: '1fr',
    gridColumns: '1fr',
  },
  'horizontal-pair': {
    slotCount: 2,
    gridTemplate: '"slot-0 slot-1"',
    gridRows: '1fr',
    gridColumns: '1fr 1fr',
  },
  'vertical-pair': {
    slotCount: 2,
    gridTemplate: '"slot-0" "slot-1"',
    gridRows: '1fr 1fr',
    gridColumns: '1fr',
  },
  quad: {
    slotCount: 4,
    gridTemplate: '"slot-0 slot-1" "slot-2 slot-3"',
    gridRows: '1fr 1fr',
    gridColumns: '1fr 1fr',
  },
});

export function slotCountFor(preset: LayoutPreset): 1 | 2 | 4 {
  return LAYOUT_PRESETS[preset].slotCount;
}
