import type { ChartKind, SParam } from '@nanovnaweb/render';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown } from 'lucide-react';
import type React from 'react';

const KINDS: readonly { kind: ChartKind; label: string }[] = Object.freeze([
  { kind: 'rect', label: 'Rectangular' },
  { kind: 'smith', label: 'Smith' },
  { kind: 'vswr', label: 'VSWR' },
  { kind: 'phase', label: 'Phase' },
  { kind: 'groupDelay', label: 'Group delay' },
]);

export interface SlotHeaderProps {
  readonly slotId: string;
  readonly kind: ChartKind;
  readonly primarySParam: SParam;
  onChangeKind(next: ChartKind): void;
  onChangeSParam(next: SParam): void;
}

export function SlotHeader(props: SlotHeaderProps): React.ReactElement {
  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-panel)]/80 px-1 py-0.5 text-xs backdrop-blur">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-[var(--color-panel-2)]"
            aria-label={`Slot ${props.slotId} kind`}
          >
            {KINDS.find((k) => k.kind === props.kind)?.label ?? 'Chart'}
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-1 text-sm">
            {KINDS.map(({ kind, label }) => (
              <DropdownMenu.Item
                key={kind}
                onSelect={() => props.onChangeKind(kind)}
                className="rounded px-2 py-1 data-[highlighted]:bg-[var(--color-panel-2)]"
              >
                {label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="px-1.5 py-0.5 hover:bg-[var(--color-panel-2)]"
            aria-label={`Slot ${props.slotId} S-param`}
          >
            {props.primarySParam.toUpperCase()}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-1 text-sm">
            <DropdownMenu.Item
              onSelect={() => props.onChangeSParam('s11')}
              className="rounded px-2 py-1 data-[highlighted]:bg-[var(--color-panel-2)]"
            >
              S11
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => props.onChangeSParam('s21')}
              className="rounded px-2 py-1 data-[highlighted]:bg-[var(--color-panel-2)]"
            >
              S21
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
