import { describe, expect, it } from 'vitest';
import { LAYOUT_PRESETS, slotCountFor } from '../../src/layout/layout-presets.js';

describe('layout presets', () => {
  it('single has one slot', () => {
    expect(slotCountFor('single')).toBe(1);
    expect(LAYOUT_PRESETS.single.gridTemplate).toContain('slot-0');
  });
  it('horizontal-pair has two slots', () => {
    expect(slotCountFor('horizontal-pair')).toBe(2);
  });
  it('vertical-pair has two slots', () => {
    expect(slotCountFor('vertical-pair')).toBe(2);
  });
  it('quad has four slots', () => {
    expect(slotCountFor('quad')).toBe(4);
  });
});
