import type React from 'react';
import { Logo } from './Logo.js';

export interface TopBarProps {
  readonly children?: React.ReactNode;
}

export function TopBar(props: TopBarProps): React.ReactElement {
  return (
    <header
      className="sticky top-0 z-10 flex h-12 items-center border-b border-[var(--color-border)] bg-[var(--color-panel)]"
      data-testid="top-bar"
    >
      <Logo />
      <div className="flex flex-1 items-center gap-2 px-2">{props.children}</div>
    </header>
  );
}
