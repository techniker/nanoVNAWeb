import type { LayoutPreset } from '@nanovnaweb/state';
import { Columns2, LayoutGrid, Rows2, Square } from 'lucide-react';
import type React from 'react';

interface Item {
  readonly preset: LayoutPreset;
  readonly label: string;
  readonly Icon: typeof Square;
}

const ITEMS: readonly Item[] = Object.freeze([
  { preset: 'single', label: 'Single', Icon: Square },
  { preset: 'horizontal-pair', label: 'Horizontal pair', Icon: Columns2 },
  { preset: 'vertical-pair', label: 'Vertical pair', Icon: Rows2 },
  { preset: 'quad', label: 'Quad', Icon: LayoutGrid },
]);

export interface LayoutSwitcherProps {
  readonly preset: LayoutPreset;
  onChange(next: LayoutPreset): void;
}

export function LayoutSwitcher(props: LayoutSwitcherProps): React.ReactElement {
  return (
    <div className="flex items-center gap-1" role="toolbar" aria-label="Chart layout">
      {ITEMS.map(({ preset, label, Icon }) => (
        <button
          key={preset}
          type="button"
          aria-label={label}
          aria-pressed={props.preset === preset}
          data-preset={preset}
          onClick={() => props.onChange(preset)}
          className={`flex h-8 w-8 items-center justify-center rounded border border-transparent ${
            props.preset === preset
              ? 'border-[var(--color-border)] bg-[var(--color-panel-2)]'
              : 'hover:bg-[var(--color-panel-2)]'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
