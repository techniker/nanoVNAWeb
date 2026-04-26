import { useStores } from '@nanovnaweb/state';
import { useCallback } from 'react';

export interface UseExportResult {
  exportTrace(id: string, suggestedName: string): Promise<void>;
}

async function streamToBlob(stream: ReadableStream<Uint8Array>): Promise<Blob> {
  const reader = stream.getReader();
  const parts: BlobPart[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value !== undefined) {
      const copy = new Uint8Array(value.byteLength);
      copy.set(value);
      parts.push(copy.buffer);
    }
  }
  return new Blob(parts, { type: 'text/plain' });
}

export function useExportTouchstone(): UseExportResult {
  const stores = useStores();

  const exportTrace = useCallback(
    async (id: string, suggestedName: string): Promise<void> => {
      const r = await stores.trace.actions.exportTouchstone(id);
      if (r.kind === 'err') {
        throw new Error(r.error.message);
      }
      const blob = await streamToBlob(r.value);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName.endsWith('.s1p') ? suggestedName : `${suggestedName}.s1p`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [stores],
  );

  return { exportTrace };
}
