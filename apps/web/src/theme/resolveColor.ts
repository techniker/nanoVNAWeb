let probe: HTMLSpanElement | null = null;

function getProbe(): HTMLSpanElement | null {
  if (typeof document === 'undefined') return null;
  if (probe === null) {
    probe = document.createElement('span');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);
  }
  return probe;
}

/**
 * Resolves a CSS color expression — including `var(…)` references and
 * custom-property syntax — into a concrete `rgb(…)` string that the
 * render layer's `parseCssColor` can consume.
 *
 * Uses a hidden probe element so the browser does the resolution for us,
 * which handles every form the CSS engine supports (nested vars, custom
 * properties on ancestors, etc.).
 *
 * Returns the input unchanged when there's no document (tests, SSR).
 */
export function resolveCssColor(value: string): string {
  const p = getProbe();
  if (p === null) return value;
  p.style.color = '';
  p.style.color = value;
  const view = p.ownerDocument.defaultView;
  if (view === null) return value;
  const resolved = view.getComputedStyle(p).color;
  return resolved.length > 0 ? resolved : value;
}
