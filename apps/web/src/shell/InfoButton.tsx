import { Info } from 'lucide-react';
import type React from 'react';

export interface InfoButtonProps {
  onClick(): void;
}

export function InfoButton(props: InfoButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      aria-label="About NanoVNAWeb"
      onClick={props.onClick}
      className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--color-panel-2)]"
    >
      <Info className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
