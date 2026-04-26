import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Monitor, Moon, Sun } from 'lucide-react';
import type React from 'react';
import { type ThemeMode, useTheme } from '../theme/useTheme.js';

export function ThemeToggle(): React.ReactElement {
  const { mode, setMode, effective } = useTheme();
  const Icon = effective === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Theme"
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--color-panel-2)]"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[8rem] rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-1 text-sm shadow-lg"
          sideOffset={4}
          align="end"
        >
          <DropdownMenu.RadioGroup value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
            <DropdownMenu.RadioItem
              value="system"
              className="flex items-center gap-2 rounded px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--color-panel-2)]"
            >
              <Monitor className="h-4 w-4" aria-hidden="true" />
              System
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem
              value="light"
              className="flex items-center gap-2 rounded px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--color-panel-2)]"
            >
              <Sun className="h-4 w-4" aria-hidden="true" />
              Light
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem
              value="dark"
              className="flex items-center gap-2 rounded px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--color-panel-2)]"
            >
              <Moon className="h-4 w-4" aria-hidden="true" />
              Dark
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
