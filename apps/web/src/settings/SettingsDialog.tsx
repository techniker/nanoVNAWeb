import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X } from 'lucide-react';
import type { ChangeEvent, ReactElement } from 'react';
import { useTheme } from '../theme/useTheme.js';
import { DeviceTab } from './DeviceTab.js';
import { LogsTab } from './LogsTab.js';

export interface SettingsDialogProps {
  readonly open: boolean;
  readonly initialTab?: 'general' | 'device' | 'logs';
  onOpenChange(open: boolean): void;
}

export function SettingsDialog(props: SettingsDialogProps): ReactElement {
  const { mode, setMode } = useTheme();
  const initialTab = props.initialTab ?? 'general';

  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 flex h-[520px] w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col rounded border border-[var(--color-border)] bg-[var(--color-panel)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] p-3">
            <Dialog.Title className="text-sm font-semibold">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded p-1 hover:bg-[var(--color-panel-2)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <Tabs.Root defaultValue={initialTab} className="flex flex-1 flex-col">
            <Tabs.List className="flex gap-1 border-b border-[var(--color-border)] px-3">
              <Tabs.Trigger
                value="general"
                className="px-3 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)]"
              >
                General
              </Tabs.Trigger>
              <Tabs.Trigger
                value="device"
                className="px-3 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)]"
              >
                Device
              </Tabs.Trigger>
              <Tabs.Trigger
                value="logs"
                className="px-3 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-[var(--color-accent)]"
              >
                Logs
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="general" className="flex-1 p-4 text-sm">
              <label className="block">
                <span className="text-[var(--color-label)]">Theme</span>
                <select
                  value={mode}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setMode(e.target.value as 'system' | 'light' | 'dark')
                  }
                  className="mt-1 block rounded border border-[var(--color-border)] bg-[var(--color-panel-2)] px-2 py-1"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
            </Tabs.Content>
            <Tabs.Content value="device" className="flex-1 overflow-hidden">
              <DeviceTab />
            </Tabs.Content>
            <Tabs.Content value="logs" className="flex-1 overflow-hidden">
              <LogsTab />
            </Tabs.Content>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
