import type React from 'react';
import { useEffect, useState } from 'react';

export function PwaUpdatePrompt(): React.ReactElement | null {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updater, setUpdater] = useState<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (cancelled) return;
        const update = registerSW({
          onNeedRefresh(): void {
            setNeedRefresh(true);
          },
        });
        setUpdater(() => () => {
          void update(true);
        });
      })
      .catch(() => {
        // PWA registration not available (dev or unsupported) — silently skip.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!needRefresh || updater === null) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-3 shadow-xl">
      <span className="text-sm">Update available.</span>
      <button
        type="button"
        onClick={updater}
        className="rounded bg-[var(--color-accent)] px-3 py-1 text-sm text-[var(--color-bg)]"
      >
        Reload
      </button>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        className="rounded border border-[var(--color-border)] px-3 py-1 text-sm"
      >
        Dismiss
      </button>
    </div>
  );
}
