import type { LogEntry } from '@nanovnaweb/shared';
import { useStores } from '@nanovnaweb/state';
import * as Toast from '@radix-ui/react-toast';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

interface ToastEntry {
  readonly id: string;
  readonly level: 'warn' | 'error';
  readonly message: string;
}

export function ToastRoot(): React.ReactElement {
  const stores = useStores();
  const [toasts, setToasts] = useState<readonly ToastEntry[]>([]);
  const seenRef = useRef<number>(-1);

  useEffect(() => {
    const unsub = stores.debug.store.subscribe((state) => {
      const entries = state.recent;
      if (entries.length === 0) return;
      const lastIndex = entries.length - 1;
      if (lastIndex === seenRef.current) return;
      const newOnes: ToastEntry[] = [];
      for (let i = seenRef.current + 1; i <= lastIndex; i++) {
        const e: LogEntry | undefined = entries[i];
        if (e === undefined) continue;
        if (e.level === 'warn' || e.level === 'error') {
          newOnes.push({
            id: `toast-${i}-${e.timestamp}`,
            level: e.level,
            message: e.message,
          });
        }
      }
      seenRef.current = lastIndex;
      if (newOnes.length > 0) {
        setToasts((prev) => [...prev, ...newOnes]);
      }
    });
    return () => {
      unsub();
    };
  }, [stores]);

  return (
    <Toast.Provider swipeDirection="right">
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          duration={t.level === 'error' ? Number.POSITIVE_INFINITY : 5000}
          onOpenChange={(open) => {
            if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
          }}
          className={`rounded border p-3 shadow-xl ${
            t.level === 'error'
              ? 'border-[var(--color-error)] bg-[var(--color-panel)]'
              : 'border-[var(--color-warn)] bg-[var(--color-panel)]'
          }`}
        >
          <Toast.Title className="text-sm font-semibold">
            {t.level === 'error' ? 'Error' : 'Warning'}
          </Toast.Title>
          <Toast.Description className="text-xs">{t.message}</Toast.Description>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-6 right-6 flex w-80 flex-col gap-2 outline-none" />
    </Toast.Provider>
  );
}
