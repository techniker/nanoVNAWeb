import { isOk } from '@nanovnaweb/shared';
import { describe, expect, it } from 'vitest';
import { createModeStore } from '../src/slices/mode-store.js';
import { makeFakeIo } from './helpers/fake-io.js';

describe('ModeStore', () => {
  it('starts in idle', () => {
    const fake = makeFakeIo();
    const { store } = createModeStore({ io: fake.io });
    expect(store.getState().mode).toBe('idle');
  });

  it('setMode to sweep updates state', async () => {
    const fake = makeFakeIo();
    const { store, actions } = createModeStore({ io: fake.io });
    const r = await actions.setMode('sweep');
    expect(isOk(r)).toBe(true);
    expect(store.getState().mode).toBe('sweep');
  });

  it('setMode to siggen updates state', async () => {
    const fake = makeFakeIo();
    const { store, actions } = createModeStore({ io: fake.io });
    await actions.setMode('siggen');
    expect(store.getState().mode).toBe('siggen');
  });

  it('setMode to idle updates state', async () => {
    const fake = makeFakeIo();
    const { store, actions } = createModeStore({ io: fake.io });
    await actions.setMode('siggen');
    await actions.setMode('idle');
    expect(store.getState().mode).toBe('idle');
  });
});
