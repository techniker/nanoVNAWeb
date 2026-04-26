import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import type React from 'react';
import { DisplayGroup } from './DisplayGroup.js';
import { MarkerGroup } from './MarkerGroup.js';
import { OverlayGroup } from './OverlayGroup.js';
import { StimulusGroup } from './StimulusGroup.js';

interface GroupSpec {
  readonly id: string;
  readonly label: string;
  readonly body: React.ReactElement;
}

const GROUPS: readonly GroupSpec[] = [
  { id: 'stimulus', label: 'Stimulus', body: <StimulusGroup /> },
  { id: 'display', label: 'Display', body: <DisplayGroup /> },
  { id: 'marker', label: 'Marker', body: <MarkerGroup /> },
  { id: 'overlays', label: 'Overlays', body: <OverlayGroup /> },
];

export function RightConfigPanel(): React.ReactElement {
  return (
    <aside className="flex w-72 flex-col border-l border-[var(--color-border)] bg-[var(--color-panel)]">
      <Accordion.Root
        type="multiple"
        defaultValue={['stimulus', 'display', 'marker']}
        className="flex-1 overflow-y-auto"
      >
        {GROUPS.map((g) => (
          <Accordion.Item key={g.id} value={g.id} className="border-b border-[var(--color-border)]">
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-label)] hover:bg-[var(--color-panel-2)]">
                {g.label}
                <ChevronDown
                  className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-3 pb-3 pt-1">{g.body}</Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </aside>
  );
}
