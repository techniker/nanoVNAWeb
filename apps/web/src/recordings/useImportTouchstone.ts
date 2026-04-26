import { useStores } from '@nanovnaweb/state';
import { useCallback } from 'react';

export interface UseImportResult {
  import(blob: Blob, name?: string): Promise<void>;
  importFromFilePicker(): Promise<void>;
}

export function useImportTouchstone(): UseImportResult {
  const stores = useStores();

  const runImport = useCallback(
    async (blob: Blob, name?: string): Promise<void> => {
      const opts = name !== undefined ? { suggestedName: name } : {};
      const r = await stores.trace.actions.importTouchstone(blob, opts);
      if (r.kind === 'err') {
        throw new Error(r.error.message);
      }
    },
    [stores],
  );

  const importFromFilePicker = useCallback(async (): Promise<void> => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.s1p,.s2p,.ts,text/plain';
    await new Promise<void>((resolve) => {
      input.onchange = async (): Promise<void> => {
        const file = input.files?.[0];
        if (file !== undefined) {
          await runImport(file, file.name);
        }
        resolve();
      };
      input.click();
    });
  }, [runImport]);

  return { import: runImport, importFromFilePicker };
}
