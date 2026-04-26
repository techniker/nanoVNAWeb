import type { TraceRecord } from '@nanovnaweb/shared';
import { Download, Trash2 } from 'lucide-react';
import type React from 'react';

export interface RecordingRowProps {
  readonly trace: TraceRecord;
  readonly overlayActive: boolean;
  onToggleOverlay(): void;
  onExport(): void;
  onDelete(): void;
}

export function RecordingRow(props: RecordingRowProps): React.ReactElement {
  const t = props.trace;
  return (
    <li className="flex items-center gap-2 border-[var(--color-border)] border-b px-2 py-1.5 text-xs">
      <input
        type="checkbox"
        checked={props.overlayActive}
        onChange={props.onToggleOverlay}
        aria-label={`Overlay ${t.name}`}
      />
      <div className="flex-1 overflow-hidden">
        <div className="truncate">{t.name}</div>
        <div className="text-[var(--color-label)]">
          {new Date(t.createdAt).toLocaleString()} · {t.frame.frequencies.length} pts
        </div>
      </div>
      <button
        type="button"
        onClick={props.onExport}
        aria-label={`Export ${t.name}`}
        className="rounded p-1 hover:bg-[var(--color-panel-2)]"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={props.onDelete}
        aria-label={`Delete ${t.name}`}
        className="rounded p-1 hover:bg-[var(--color-panel-2)]"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </li>
  );
}
