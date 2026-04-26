import { AppStateProvider } from '@nanovnaweb/state';
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
import { AboutDialog } from './shell/AboutDialog.js';
import { InfoButton } from './shell/InfoButton.js';
import { LayoutSwitcher } from './shell/LayoutSwitcher.js';
import { StatusStrip } from './shell/StatusStrip.js';
import { ThemeToggle } from './shell/ThemeToggle.js';
import { TopBar } from './shell/TopBar.js';
import { useShortcuts } from './shortcuts/useShortcuts.js';
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
  const [aboutOpen, setAboutOpen] = useState(false);

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
      setAboutOpen(false);
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
          <div className="flex-1" />
          <LayoutSwitcher
            preset={services.state.stores.chart.store.getState().preset}
            onChange={services.state.stores.chart.actions.setPreset}
          />
          <ThemeToggle />
          <InfoButton onClick={() => setAboutOpen(true)} />
        </TopBar>
        <div className="flex flex-1 overflow-hidden">
          <RecordingsPanel />
          <main className="relative flex-1 overflow-hidden">
            <ChartGrid />
          </main>
          <RightConfigPanel />
        </div>
        <StatusStrip />
        <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      </div>
    </AppStateProvider>
  );
}
