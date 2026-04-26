import { describe, expect, it } from 'vitest';
import { createChartStore } from '../src/slices/chart-store.js';

describe('createChartStore', () => {
  it('defaults preset to quad with slot-0 selected (instrument-like first impression)', () => {
    const { store } = createChartStore();
    const s = store.getState();
    expect(s.preset).toBe('quad');
    expect(s.slotOrder).toEqual(['slot-0', 'slot-1', 'slot-2', 'slot-3']);
    expect(s.selectedSlotId).toBe('slot-0');
    expect(s.slots['slot-0']?.kind).toBe('rect');
    expect(s.slots['slot-0']?.primarySParam).toBe('s11');
    expect(s.slots['slot-0']?.overlayIds).toEqual([]);
    // Crosshair defaults on so new users see hover values without hunting
    // for a toggle in the Marker group.
    expect(s.slots['slot-0']?.crosshairEnabled).toBe(true);
  });

  it('setPreset updates preset without touching slots', () => {
    const { store, actions } = createChartStore();
    actions.setPreset('quad');
    expect(store.getState().preset).toBe('quad');
    expect(store.getState().slots['slot-0']?.kind).toBe('rect');
  });

  it('setSlot patches only the named slot', () => {
    const { store, actions } = createChartStore();
    actions.setSlot('slot-1', { kind: 'smith', primarySParam: 's11' });
    expect(store.getState().slots['slot-1']?.kind).toBe('smith');
    expect(store.getState().slots['slot-0']?.kind).toBe('rect');
  });

  it('selectSlot updates the selected id', () => {
    const { store, actions } = createChartStore();
    actions.selectSlot('slot-2');
    expect(store.getState().selectedSlotId).toBe('slot-2');
    actions.selectSlot(null);
    expect(store.getState().selectedSlotId).toBe(null);
  });

  it('toggleOverlay adds and removes overlay ids (idempotent)', () => {
    const { store, actions } = createChartStore();
    actions.toggleOverlay('slot-0', 'rec-1');
    expect(store.getState().slots['slot-0']?.overlayIds).toEqual(['rec-1']);
    actions.toggleOverlay('slot-0', 'rec-1');
    expect(store.getState().slots['slot-0']?.overlayIds).toEqual([]);
  });

  it('toggleCrosshair flips the flag on the named slot', () => {
    const { store, actions } = createChartStore();
    // Starts on by default — toggling takes it off first, then back on.
    expect(store.getState().slots['slot-0']?.crosshairEnabled).toBe(true);
    actions.toggleCrosshair('slot-0');
    expect(store.getState().slots['slot-0']?.crosshairEnabled).toBe(false);
    actions.toggleCrosshair('slot-0');
    expect(store.getState().slots['slot-0']?.crosshairEnabled).toBe(true);
  });

  it('exposes overlayIds as frozen arrays (defensive freeze)', () => {
    const { store, actions } = createChartStore();
    actions.toggleOverlay('slot-0', 'rec-1');
    const ids = store.getState().slots['slot-0']?.overlayIds ?? [];
    expect(Object.isFrozen(ids)).toBe(true);
  });
});
