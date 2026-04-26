import { AppStateProvider } from '@nanovnaweb/state';
import { Sliders } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { RightConfigPanel } from './config/RightConfigPanel.js';
import { ConnectButton } from './connect/ConnectButton.js';
import { StatusBadge } from './connect/StatusBadge.js';
import { StreamButton } from './connect/StreamButton.js';
import { useAutoSweep } from './connect/useAutoSweep.js';
import { ChartGrid } from './layout/ChartGrid.js';
import { PwaUpdatePrompt } from './pwa/PwaUpdatePrompt.js';
import { RecordingsPanel } from './recordings/RecordingsPanel.js';
import { type AppServices, createAppServices } from './services.js';
import { SettingsDialog } from './settings/SettingsDialog.js';
import { LayoutSwitcher } from './shell/LayoutSwitcher.js';
import { MenuDropdown } from './shell/MenuDropdown.js';
import { StatusStrip } from './shell/StatusStrip.js';
import { ThemeToggle } from './shell/ThemeToggle.js';
import { TopBar } from './shell/TopBar.js';
import { useShortcuts } from './shortcuts/useShortcuts.js';
import { SweepDialog } from './sweep/SweepDialog.js';
import { useTheme } from './theme/useTheme.js';
import { ToastRoot } from './toasts/ToastRoot.js';

export function App(): React.ReactElement {
  const [services, setServices] = useState<AppServices | null>(null);
  useTheme();

  useEffect(() => {
    let cancelled = false;
    void createAppServices().then((s) => {
      if (cancelled) {
        void s.dispose();
        return;
      }
      setServices(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (services === null) {
    return <div className="p-4">Loading…</div>;
  }

  return <AppBody services={services} />;
}

interface AppBodyProps {
  readonly services: AppServices;
}

function AppBody({ services }: AppBodyProps): React.ReactElement {
  const [sweepOpen, setSweepOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'device' | 'logs'>('general');

  useAutoSweep(services.state, (msg) => console.error('[auto-sweep]', msg));

  useShortcuts({
    onTogglePause: () => {
      const streaming = services.state.stores.sweep.store.getState().isStreaming;
      if (streaming) void services.state.stores.sweep.actions.stopStream();
      else void services.state.stores.sweep.actions.startStream();
    },
    onSaveSnapshot: () => {
      const frame = services.state.stores.live.store.getState().latestFrame;
      if (frame !== null) {
        void services.state.stores.trace.actions.saveRecording({
          id: `rec-${Date.now().toString(36)}`,
          name: `Snapshot ${new Date().toLocaleTimeString()}`,
          createdAt: Date.now(),
          frame,
        });
      }
    },
    onEscape: () => {
      setSweepOpen(false);
      setSettingsOpen(false);
    },
    onLayout: (p) => services.state.stores.chart.actions.setPreset(p),
  });

  return (
    <AppStateProvider value={services.state}>
      <ToastRoot />
      <PwaUpdatePrompt />
      <div className="flex h-screen flex-col">
        <TopBar>
          <ConnectButton onError={(msg) => console.error(msg)} />
          <StreamButton onError={(msg) => console.error(msg)} />
          <StatusBadge />
          <button
            type="button"
            aria-label="Sweep parameters"
            onClick={() => setSweepOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-[var(--color-panel-2)]"
          >
            <Sliders className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex-1" />
          <LayoutSwitcher
            preset={services.state.stores.chart.store.getState().preset}
            onChange={services.state.stores.chart.actions.setPreset}
          />
          <ThemeToggle />
          <MenuDropdown
            onOpenSettings={() => {
              setSettingsTab('general');
              setSettingsOpen(true);
            }}
            onOpenDevice={() => {
              setSettingsTab('device');
              setSettingsOpen(true);
            }}
            onOpenLogs={() => {
              setSettingsTab('logs');
              setSettingsOpen(true);
            }}
          />
        </TopBar>
        <div className="flex flex-1 overflow-hidden">
          <RecordingsPanel />
          <main className="relative flex-1 overflow-hidden">
            <ChartGrid />
          </main>
          <RightConfigPanel />
        </div>
        <StatusStrip />
        <SweepDialog open={sweepOpen} onOpenChange={setSweepOpen} />
        <SettingsDialog
          open={settingsOpen}
          initialTab={settingsTab}
          onOpenChange={setSettingsOpen}
        />
      </div>
    </AppStateProvider>
  );
}
