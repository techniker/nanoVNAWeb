import * as Dialog from '@radix-ui/react-dialog';
import { ExternalLink, X } from 'lucide-react';
import type React from 'react';

// Keep in sync with the root package.json `version` field. The web
// app's own package.json is intentionally pinned at 0.0.0; the project
// uses the monorepo root as the canonical version.
const APP_VERSION = '0.1.0';

export interface AboutDialogProps {
  readonly open: boolean;
  onOpenChange(open: boolean): void;
}

// `z-50` on both the overlay and the content puts the portaled dialog
// one tier above the chart overlays (which use `z-40` for the trace
// label / Ref readout). Without this the dialog renders with
// `z-index: auto` and the chart labels paint through it.
export function AboutDialog(props: AboutDialogProps): React.ReactElement {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-5 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="text-base font-semibold">NanoVNAWeb</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-[var(--color-label)]">
                Version {APP_VERSION}
              </Dialog.Description>
            </div>
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

          <p className="mt-4 text-sm leading-relaxed">
            Browser-based control and measurement application for NanoVNA vector network analyzers.
            Talks to the device directly over the Web Serial API and renders S-parameter sweeps in
            real time on a GPU-accelerated canvas.
          </p>

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-[var(--color-label)]">License</dt>
            <dd>GPL-3.0-or-later</dd>
            <dt className="text-[var(--color-label)]">Copyright</dt>
            <dd>© 2026 Bjoern Heller, Sixtopia.net</dd>
          </dl>

          <div className="mt-4 flex flex-col gap-1 text-sm">
            <a
              href="https://github.com/techniker/nanoVNAWeb"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline"
            >
              github.com/techniker/nanoVNAWeb
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
