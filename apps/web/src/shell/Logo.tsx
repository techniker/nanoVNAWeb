import { Activity } from 'lucide-react';
import type React from 'react';

export function Logo(): React.ReactElement {
  return (
    <div className="flex items-center gap-2 px-3">
      <Activity className="w-5 h-5" aria-hidden="true" />
      <span className="font-semibold tracking-tight">NanoVNAWeb</span>
    </div>
  );
}
