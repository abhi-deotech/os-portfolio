/**
 * applyTheme — the ONLY place that writes theme state to the DOM.
 *
 * Writes to `document.documentElement` (=== `:root`), never to a mid-tree element. Four independent
 * reasons, all of which were live bugs before P1:
 *
 *  1. `App.jsx` returns early for BSOD / BootSequence / LoginScreen, so a mid-tree <div> style meant
 *     boot and login rendered with the :root defaults regardless of the user's saved theme.
 *  2. react-contexify portals its menus to document.body — outside that div entirely.
 *  3. Derived vars like `--os-primary: rgb(var(--os-primary-rgb))` are declared on :root. Custom
 *     properties substitute at computed-value time ON THE DECLARING ELEMENT, so overriding the
 *     triple lower in the tree left the derived hex frozen at purple forever.
 *  4. The old `filter: brightness()` made the app root a containing block for every
 *     `position: fixed` descendant. Brightness is now a `body::after` scrim (see index.css).
 *
 * It also mirrors the resolved variable map into localStorage so the pre-paint script in index.html
 * can stamp it before first paint. That mirror exists because persistence is IndexedDB — which is
 * ASYNC, so the first React render ALWAYS uses defaults. Harmless while everything was navy; the day
 * a light colorway is selected it becomes a full-screen dark→white flash on every load.
 */
import { resolveColorway, DEFAULT_COLORWAY, FONT_STACK } from './registry';
import { roleVars, bridgeVars } from './cssVars';

/** Mirror holds only what the first painted frame needs; everything else stays in IndexedDB. */
export const MIRROR_KEY = 'lumina.theme.v1';

/**
 * @param {{colorway?: string, density?: string, transparencyEffects?: boolean,
 *          brightness?: number, accentIntensity?: number, reducedMotion?: string}} state
 */
export function applyTheme(state = {}) {
  if (typeof document === 'undefined') return null;

  const {
    colorway = DEFAULT_COLORWAY,
    density = 'comfortable',
    transparencyEffects = true,
    brightness = 100,
    accentIntensity = 80,
    reducedMotion = 'system',
  } = state;

  const cw = resolveColorway(colorway);
  const root = document.documentElement;

  const vars = { ...roleVars(cw), ...bridgeVars(cw) };
  vars['--sdl-font-title'] = FONT_STACK(cw.titleFace);
  // Brightness as a scrim opacity rather than a filter.
  vars['--os-dim'] = String(Math.max(0, Math.min(100, 100 - brightness)) / 100);
  // Atmosphere dial: multiplies wash alpha, motif opacity and glow alpha. This is what the
  // previously-inert "Accent Intensity" slider now drives (law 8: atmosphere whispers).
  vars['--sdl-atmo'] = String(accentIntensity / 100);

  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);

  // Attributes drive the grammar (see grammar.css). Single-valued by construction, so light and
  // dark can never both be active and `[data-mode][data-density]` composes without specificity wars.
  root.setAttribute('data-theme', cw.theme);
  root.setAttribute('data-colorway', cw.id);
  root.setAttribute('data-mode', cw.mode); // derived from the colorway — law 7, never free-floating
  root.setAttribute('data-grammar', cw.grammar);
  root.setAttribute('data-density', density);
  root.setAttribute('data-glass', transparencyEffects ? 'on' : 'off');
  root.setAttribute(
    'data-motion',
    reducedMotion === 'on' ? 'reduced'
      : reducedMotion === 'off' ? 'full'
        : (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full'),
  );

  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify({
      cw: cw.id, th: cw.theme, mode: cw.mode, grammar: cw.grammar,
      den: density, glass: transparencyEffects ? 1 : 0, bright: brightness, v: vars,
    }));
  } catch { /* private mode — the app still works, it just flashes on reload */ }

  return cw;
}

/** Read the synchronous mirror. Used to seed the store so React's first render matches the DOM. */
export function readMirror() {
  try {
    return JSON.parse(localStorage.getItem(MIRROR_KEY)) || null;
  } catch {
    return null;
  }
}
