import { describe, expect, it } from 'vitest';
import { createAppStore } from '../src/slices/app-store.js';

describe('AppStore', () => {
  it('starts in bootPhase=starting with no errors and viewerMode=null', () => {
    const { store } = createAppStore();
    expect(store.getState()).toEqual({
      bootPhase: 'starting',
      workerError: null,
      hydrationError: null,
      viewerMode: null,
    });
  });

  it('setBootPhase updates state', () => {
    const { store, actions } = createAppStore();
    actions.setBootPhase('ready');
    expect(store.getState().bootPhase).toBe('ready');
  });

  it('setWorkerError updates state', () => {
    const { store, actions } = createAppStore();
    actions.setWorkerError('io-worker crashed');
    expect(store.getState().workerError).toBe('io-worker crashed');
    actions.setWorkerError(null);
    expect(store.getState().workerError).toBeNull();
  });

  it('setHydrationError updates state', () => {
    const { store, actions } = createAppStore();
    actions.setHydrationError('dexie open failed');
    expect(store.getState().hydrationError).toBe('dexie open failed');
  });

  it('setViewerMode updates state', () => {
    const { store, actions } = createAppStore();
    actions.setViewerMode('host');
    expect(store.getState().viewerMode).toBe('host');
    actions.setViewerMode(null);
    expect(store.getState().viewerMode).toBeNull();
  });

  it('getPublicSnapshot exposes only viewerMode', () => {
    const { actions } = createAppStore();
    actions.setBootPhase('ready');
    actions.setWorkerError('should not be in snapshot');
    actions.setViewerMode('viewer');
    const snap = actions.getPublicSnapshot();
    expect(snap).toEqual({ viewerMode: 'viewer' });
    expect(Object.keys(snap)).toEqual(['viewerMode']);
  });
});
