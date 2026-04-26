import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Menu } from 'lucide-react';
import type React from 'react';

export interface MenuDropdownProps {
  onOpenSettings(): void;
  onOpenDevice(): void;
  onOpenLogs(): void;
}

export function MenuDropdown(props: MenuDropdownProps): React.ReactElement {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Menu"
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--color-panel-2)]"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[10rem] rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-1 text-sm shadow-lg"
          sideOffset={4}
          align="end"
        >
          <DropdownMenu.Item
            className="rounded px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--color-panel-2)]"
            onSelect={props.onOpenSettings}
          >
            Settings…
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="rounded px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--color-panel-2)]"
            onSelect={props.onOpenDevice}
          >
            Device info…
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="rounded px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--color-panel-2)]"
            onSelect={props.onOpenLogs}
          >
            View logs…
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
