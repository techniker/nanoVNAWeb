import { describe, expect, it } from 'vitest';
import { ChartRegistry, createDefaultRegistry } from '../src/registry.js';
import type { ChartInstance, ChartKind, ChartRenderer } from '../src/types.js';

function stubRenderer(kind: ChartKind, displayName: string): ChartRenderer {
  return {
    kind,
    displayName,
    mount(): ChartInstance {
      return {
        resize() {},
        draw() {},
        destroy() {},
      };
    },
  };
}

describe('ChartRegistry', () => {
  it('register + get returns the registered renderer', () => {
    const reg = new ChartRegistry();
    const r = stubRenderer('rect', 'Rectangular');
    reg.register(r);
    expect(reg.get('rect')).toBe(r);
  });

  it('get returns undefined for unregistered kind', () => {
    const reg = new ChartRegistry();
    expect(reg.get('smith')).toBeUndefined();
  });

  it('list returns all registered renderers', () => {
    const reg = new ChartRegistry();
    reg.register(stubRenderer('rect', 'A'));
    reg.register(stubRenderer('smith', 'B'));
    expect(
      reg
        .list()
        .map((r) => r.kind)
        .sort(),
    ).toEqual(['rect', 'smith']);
  });

  it('register with same kind overwrites', () => {
    const reg = new ChartRegistry();
    const first = stubRenderer('rect', 'First');
    const second = stubRenderer('rect', 'Second');
    reg.register(first);
    reg.register(second);
    expect(reg.get('rect')).toBe(second);
  });
});

describe('createDefaultRegistry', () => {
  it('registers all 5 built-in chart kinds', () => {
    const reg = createDefaultRegistry();
    const kinds = reg
      .list()
      .map((r) => r.kind)
      .sort();
    expect(kinds).toEqual(['groupDelay', 'phase', 'rect', 'smith', 'vswr']);
  });
});
