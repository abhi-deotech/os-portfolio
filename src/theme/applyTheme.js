/**
 * applyTheme — the ONLY place that writes theme state to the DOM.
 *
 * Writes to `document.documentElement` (=== `:root`), never to a mid-tree element. Four independent
 * reasons this matters, all of which were live bugs before P1:
 *
 *  1. `App.jsx` returns early for BSOD / BootSequence / LoginScreen, so a mid-tree <div> style meant
 *     boot and login rendered with the :root defaults regardless of the user's saved accent.
 *  2. react-contexify portals its menus to document.body — outside that div entirely.
 *  3. `--os-primary: rgb(var(--os-primary-rgb))` is declared on :root. Custom properties substitute
 *     at computed-value time ON THE DECLARING ELEMENT, so overriding the triple lower in the tree
 *     left the derived hex frozen at purple forever. Writing to :root is what un-freezes it.
 *  4. The old `filter: brightness()` on that div made it a containing block for every
 *     `position: fixed` descendant — Taskbar, ControlCenter, Spotlight and the toast stack. It only
 *     appeared to work because the div happened to be full-viewport at the origin. Brightness is now
 *     a `body::after` scrim (see index.css) which has no such side effect.
 *
 * P2 replaces the accent map below with the SDL colorway registry; the write mechanism stays.
 */

/** Space-separated triples. Comma triples break `rgb(var(--x) / a)` — see the header in index.css. */
export const ACCENTS = {
  purple: { primary: '204 151 255', secondary: '0 210 253', tertiary: '0 245 160' },
  cyan: { primary: '0 210 253', secondary: '204 151 255', tertiary: '255 104 240' },
  magenta: { primary: '255 104 240', secondary: '204 151 255', tertiary: '0 210 253' },
  green: { primary: '0 245 160', secondary: '0 210 253', tertiary: '204 151 255' },
};

export const DEFAULT_ACCENT = 'purple';

export function resolveAccent(id) {
  return ACCENTS[id] || ACCENTS[DEFAULT_ACCENT];
}

/**
 * @param {{accent?: string, brightness?: number, accentIntensity?: number}} state
 */
export function applyTheme({ accent, brightness = 100, accentIntensity = 80 } = {}) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const a = resolveAccent(accent);

  root.style.setProperty('--os-primary-rgb', a.primary);
  root.style.setProperty('--os-secondary-rgb', a.secondary);
  root.style.setProperty('--os-tertiary-rgb', a.tertiary);

  // Brightness as a dimming scrim rather than a filter. Not mathematically identical to
  // `brightness()` (composite vs multiplicative) but lossless over the 0-100 range the slider
  // exposes, where 100 means "no change".
  root.style.setProperty('--os-dim', String(Math.max(0, Math.min(100, 100 - brightness)) / 100));

  // Consumed from P3 as the atmosphere dial (wash alpha / motif opacity / glow alpha).
  root.style.setProperty('--os-accent-intensity', String(accentIntensity / 100));
}
