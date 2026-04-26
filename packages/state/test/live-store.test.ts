import { type Frame, asHz } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { createLiveStore } from '../src/slices/live-store.js';

function makeFrame(ts: number, seq: number): Frame {
  return Object.freeze({
    sequence: seq,
    timestamp: ts,
    frequencies: Object.freeze([asHz(1_000_000)]),
    s11: Object.freeze([{ re: 0.5, im: -0.3 }]),
  });
}

describe('LiveStore', () => {
  it('starts with null latestFrame, 0 frameCount, 0 sweepRateHz', () => {
    const { store } = createLiveStore();
    expect(store.getState()).toEqual({
      latestFrame: null,
      sweepRateHz: 0,
      frameCount: 0,
    });
  });

  it('_ingestFrame sets latestFrame and increments frameCount', () => {
    const { store, internal } = createLiveStore();
    const f = makeFrame(1000, 0);
    internal._ingestFrame(f);
    expect(store.getState().latestFrame).toBe(f);
    expect(store.getState().frameCount).toBe(1);
  });

  it('sweepRateHz is 0 before 16 frames are seen', () => {
    const { store, internal } = createLiveStore();
    for (let i = 0; i < 15; i++) internal._ingestFrame(makeFrame(i * 100, i));
    expect(store.getState().sweepRateHz).toBe(0);
  });

  it('sweepRateHz is computed after 16 frames across a known interval', () => {
    const { store, internal } = createLiveStore();
    // 16 frames spaced 100ms apart: newest - oldest = 1500ms -> rate = 15 / 1.5 = 10 Hz
    for (let i = 0; i < 16; i++) internal._ingestFrame(makeFrame(i * 100, i));
    expect(store.getState().sweepRateHz).toBeCloseTo(10, 5);
  });

  it('sweepRateHz updates on each subsequent frame using rolling window', () => {
    const { store, internal } = createLiveStore();
    // First 16 frames at 100ms intervals, then a 17th at 200ms gap
    for (let i = 0; i < 16; i++) internal._ingestFrame(makeFrame(i * 100, i));
    internal._ingestFrame(makeFrame(1700, 16));
    // newest=1700, oldest=100, window=15 frames apart in timestamps: diff=1600ms -> rate = 15 / 1.6
    expect(store.getState().sweepRateHz).toBeCloseTo(15 / 1.6, 5);
  });

  it('clear resets state', () => {
    const { store, actions, internal } = createLiveStore();
    internal._ingestFrame(makeFrame(1000, 0));
    actions.clear();
    expect(store.getState()).toEqual({
      latestFrame: null,
      sweepRateHz: 0,
      frameCount: 0,
    });
  });
});
