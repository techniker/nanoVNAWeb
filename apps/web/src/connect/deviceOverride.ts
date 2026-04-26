import type { DeviceCapabilities, Hz } from '@nanovnaweb/shared';
import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'nanovnaweb.deviceOverride';

export interface DeviceOverride {
  readonly minFrequencyHz: number | null;
  readonly maxFrequencyHz: number | null;
  readonly maxPoints: number | null;
}

const EMPTY: DeviceOverride = { minFrequencyHz: null, maxFrequencyHz: null, maxPoints: null };

function read(): DeviceOverride {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<DeviceOverride>;
    return {
      minFrequencyHz: typeof parsed.minFrequencyHz === 'number' ? parsed.minFrequencyHz : null,
      maxFrequencyHz: typeof parsed.maxFrequencyHz === 'number' ? parsed.maxFrequencyHz : null,
      maxPoints: typeof parsed.maxPoints === 'number' ? parsed.maxPoints : null,
    };
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<() => void>();
let cached: DeviceOverride = read();

function write(next: DeviceOverride): void {
  cached = next;
  try {
    const empty =
      next.minFrequencyHz === null && next.maxFrequencyHz === null && next.maxPoints === null;
    if (empty) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — keep in-memory only
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface UseDeviceOverrideResult {
  readonly override: DeviceOverride;
  set(patch: Partial<DeviceOverride>): void;
  clear(): void;
}

export function useDeviceOverride(): UseDeviceOverrideResult {
  const override = useSyncExternalStore(
    subscribe,
    () => cached,
    () => cached,
  );
  const set = useCallback((patch: Partial<DeviceOverride>) => {
    write({ ...cached, ...patch });
  }, []);
  const clear = useCallback(() => write(EMPTY), []);
  return { override, set, clear };
}

/**
 * Merges detected device capabilities with any user overrides. Override
 * values take precedence; any `null` override falls back to detected.
 */
export function applyOverride(
  detected: DeviceCapabilities,
  override: DeviceOverride,
): DeviceCapabilities {
  return {
    ...detected,
    minFrequencyHz:
      override.minFrequencyHz !== null ? (override.minFrequencyHz as Hz) : detected.minFrequencyHz,
    maxFrequencyHz:
      override.maxFrequencyHz !== null ? (override.maxFrequencyHz as Hz) : detected.maxFrequencyHz,
    maxPoints: override.maxPoints !== null ? override.maxPoints : detected.maxPoints,
  };
}

export function currentOverride(): DeviceOverride {
  return cached;
}
