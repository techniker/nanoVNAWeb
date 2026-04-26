import { useChartStore, useStores } from '@nanovnaweb/state';
import type React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChartSlot } from '../charts/ChartSlot.js';

const SLOT_IDS = ['slot-0', 'slot-1', 'slot-2', 'slot-3'] as const;

function VerticalHandle(): React.ReactElement {
  return (
    <PanelResizeHandle className="group relative w-1 cursor-col-resize bg-[var(--color-border)]/40 transition-colors hover:bg-[var(--color-accent)]/70 data-[resize-handle-state=drag]:bg-[var(--color-accent)]">
      <span className="pointer-events-none absolute inset-y-0 -left-px -right-px" />
    </PanelResizeHandle>
  );
}

function HorizontalHandle(): React.ReactElement {
  return (
    <PanelResizeHandle className="group relative h-1 cursor-row-resize bg-[var(--color-border)]/40 transition-colors hover:bg-[var(--color-accent)]/70 data-[resize-handle-state=drag]:bg-[var(--color-accent)]">
      <span className="pointer-events-none absolute inset-x-0 -top-px -bottom-px" />
    </PanelResizeHandle>
  );
}

function SlotPanel({ slotId }: { slotId: string }): React.ReactElement {
  return (
    <Panel defaultSize={50} minSize={15} className="relative">
      <ChartSlot slotId={slotId} />
    </Panel>
  );
}

export function ChartGrid(): React.ReactElement {
  const stores = useStores();
  const preset = useChartStore(stores.chart.store, (s) => s.preset);

  if (preset === 'single') {
    return (
      <div className="h-full w-full p-1">
        <ChartSlot slotId={SLOT_IDS[0]} />
      </div>
    );
  }

  if (preset === 'horizontal-pair') {
    return (
      <PanelGroup direction="horizontal" className="h-full w-full" autoSaveId="nvw.layout.hpair">
        <SlotPanel slotId={SLOT_IDS[0]} />
        <VerticalHandle />
        <SlotPanel slotId={SLOT_IDS[1]} />
      </PanelGroup>
    );
  }

  if (preset === 'vertical-pair') {
    return (
      <PanelGroup direction="vertical" className="h-full w-full" autoSaveId="nvw.layout.vpair">
        <SlotPanel slotId={SLOT_IDS[0]} />
        <HorizontalHandle />
        <SlotPanel slotId={SLOT_IDS[1]} />
      </PanelGroup>
    );
  }

  // quad: two rows of two, both dimensions resizable, sizes persisted per axis
  return (
    <PanelGroup direction="vertical" className="h-full w-full" autoSaveId="nvw.layout.quad-v">
      <Panel defaultSize={50} minSize={15}>
        <PanelGroup
          direction="horizontal"
          className="h-full w-full"
          autoSaveId="nvw.layout.quad-h-top"
        >
          <SlotPanel slotId={SLOT_IDS[0]} />
          <VerticalHandle />
          <SlotPanel slotId={SLOT_IDS[1]} />
        </PanelGroup>
      </Panel>
      <HorizontalHandle />
      <Panel defaultSize={50} minSize={15}>
        <PanelGroup
          direction="horizontal"
          className="h-full w-full"
          autoSaveId="nvw.layout.quad-h-bot"
        >
          <SlotPanel slotId={SLOT_IDS[2]} />
          <VerticalHandle />
          <SlotPanel slotId={SLOT_IDS[3]} />
        </PanelGroup>
      </Panel>
    </PanelGroup>
  );
}
