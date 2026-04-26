import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom's default localStorage implementation has a null prototype that omits
// Storage methods in some versions; install a simple in-memory Storage shim
// so tests relying on localStorage.clear/setItem/getItem behave predictably.
interface StorageLike {
  readonly length: number;
  clear(): void;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  key(i: number): string | null;
}

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    get length(): number {
      return map.size;
    },
    clear(): void {
      map.clear();
    },
    getItem(k: string): string | null {
      return map.has(k) ? (map.get(k) ?? null) : null;
    },
    setItem(k: string, v: string): void {
      map.set(k, String(v));
    },
    removeItem(k: string): void {
      map.delete(k);
    },
    key(i: number): string | null {
      return Array.from(map.keys())[i] ?? null;
    },
  };
}

const ls = globalThis.localStorage as unknown as Partial<StorageLike> | undefined;
if (ls === undefined || typeof ls.clear !== 'function' || typeof ls.setItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: createMemoryStorage(),
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: globalThis.localStorage,
    });
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  class NoopResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { ResizeObserver: typeof NoopResizeObserver }).ResizeObserver =
    NoopResizeObserver;
}

if (typeof globalThis.matchMedia === 'undefined') {
  (globalThis as unknown as { matchMedia: (q: string) => MediaQueryList }).matchMedia = (
    query: string,
  ): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
