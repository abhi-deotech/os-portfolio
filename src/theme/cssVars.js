/**
 * Pure colorway → CSS custom property mapping. No DOM access; applyTheme.js owns that.
 *
 * Two layers are produced:
 *
 *   roleVars()   the new --sdl-* role contract. Every colour emits BOTH a hex (for gradients,
 *                shadows, SVG, canvas and three.js, which cannot consume a bare triple) AND a
 *                SPACE-separated --*-rgb twin (for Tailwind's `rgb(var(--x) / <alpha-value>)`).
 *                That duplication is forced, not redundant: the two syntaxes are mutually
 *                exclusive on a single variable. See the header in src/index.css.
 *
 *   bridgeVars() aliases the legacy --os-* names onto SDL roles, so the ~1,020 existing os-*
 *                utility call sites reskin with zero component edits. Deletable in one commit once
 *                P4 finishes migrating them; `npm run census` tracks the burndown.
 */
import { rgbTriple, relLuminance } from './registry';

/** Mix two hexes in sRGB. Good enough for deriving one ramp step; not a colour-science claim. */
function mix(hexA, hexB, amountOfA) {
  const a = hexA.replace('#', '');
  const b = hexB.replace('#', '');
  const p = (s, i) => parseInt(s.slice(i, i + 2), 16);
  const out = [0, 2, 4].map((i) => Math.round(p(a, i) * amountOfA + p(b, i) * (1 - amountOfA)));
  return '#' + out.map((c) => c.toString(16).padStart(2, '0')).join('');
}

/**
 * The legacy ramp has FOUR ascending surface tones; SDL has three (plane/surface/sunken). There is
 * no SDL source role for the fourth — the glass-panel / window-body tone — so it is derived one step
 * from `surface` TOWARD `ink`. Because ink inverts with the mode, this is direction-correct in both
 * light and dark automatically.
 */
export const surface2 = (roles, mode) => mix(roles.surface, roles.ink, mode === 'dark' ? 0.92 : 0.94);

/** Semantic statuses, re-tinted per mode. Law 10: completed/steady is NEUTRAL, never green. */
export function semantics(mode) {
  return mode === 'dark'
    ? { alert: '#ef6f8e', warn: '#dfa964', done: '#8a8f9a' }
    : { alert: '#c2451d', warn: '#b0692e', done: '#7d8490' };
}

export function roleVars(cw) {
  const r = cw.roles;
  const vars = {};

  // Defensive: a colorway missing a role must not brick the shell. Fall back to `ink` (always
  // present) and warn, rather than throwing out of applyTheme and leaving the OS unstyled.
  const put = (name, hex) => {
    let value = hex;
    if (typeof value !== 'string' || !value.startsWith('#')) {
      if (import.meta.env?.DEV) console.warn(`[sdl] colorway "${cw.id}" is missing role "${name}"`);
      value = r.ink || '#ffffff';
    }
    vars[`--sdl-${name}`] = value;
    vars[`--sdl-${name}-rgb`] = rgbTriple(value);
  };

  put('plane', r.plane);
  put('surface', r.surface);
  put('surface-2', surface2(r, cw.mode));
  put('sunken', r.sunken);
  put('chart', r.chart);
  put('ink', r.ink);
  put('sec', r.sec);
  put('sunk-sec', r.sunkSec);
  put('accent', r.accent);
  put('soft', r.soft);
  put('aink', r.aInk);
  put('bar-a', r.barA);
  put('bar-b', r.barB);
  put('chart-ink', r.chartInk);
  put('title-ink', r.titleInk);
  put('btn-ink', r.btnInk);
  put('on-accent', r.onAccent);

  const sem = semantics(cw.mode);
  put('alert', sem.alert);
  put('warn', sem.warn);
  put('done', sem.done);

  // Geometry. Panel radius scales WITH the theme rather than tracking it — see overrides.js.
  vars['--sdl-radius'] = `${cw.radius}px`;
  vars['--sdl-radius-sm'] = `${Math.max(cw.radius - 6, 4)}px`;
  vars['--sdl-radius-lg'] = `${cw.radius + 8}px`;
  vars['--sdl-radius-panel'] = `${Math.round(cw.radius * 1.8)}px`;

  // Tempo. One binding per theme; press = hover/2, pane = hover x 1.4. Never mix inside a theme.
  vars['--sdl-t-hover'] = `${cw.tempo.hover}ms`;
  vars['--sdl-t-press'] = `${cw.tempo.press}ms`;
  vars['--sdl-t-pane'] = `${cw.tempo.pane}ms`;
  vars['--sdl-t-toast'] = `${cw.tempo.hover}ms`;
  vars['--sdl-ease'] = cw.tempo.ease;

  // Atmosphere. `--sdl-wash` is consumed by the plane pseudo-element; `none` is a valid no-op, so
  // no per-theme selector is needed.
  vars['--sdl-wash'] = cw.wash || 'none';
  vars['--sdl-motif'] = cw.motif || 'none';
  vars['--sdl-btn-grad'] = cw.btnGrad;

  // Data-viz series, if the colorway has a palette.
  if (cw.viz) {
    cw.viz.cat?.forEach((c, i) => { vars[`--sdl-cat-${i + 1}`] = c; });
    cw.viz.seq?.forEach((c, i) => { vars[`--sdl-seq-${i + 1}`] = c; });
    cw.viz.div?.forEach((c, i) => { vars[`--sdl-div-${i + 1}`] = c; });
  }

  return vars;
}

/**
 * Legacy alias layer.
 *
 * Two mappings here are genuinely lossy and were judgement calls, flagged so they can be revisited:
 *
 *   --os-secondary / --os-tertiary  The neon-era tri-accent has no SDL counterpart; SDL has ONE
 *       chrome voice plus a sharp data channel. `secondary` is mapped to barA because its ~120 call
 *       sites are overwhelmingly fills and glows (where a sharp channel reads correctly), and
 *       `tertiary` to aInk because its ~54 sites are mostly text and icon colour (law 3). The
 *       defensible alternative is the swap. This is the mapping most likely to need one revision.
 *
 *   --os-surface-container-highest  Derived (see surface2) rather than sourced, because SDL has no
 *       fourth plane tone.
 */
export function bridgeVars(cw) {
  const r = cw.roles;
  const s2 = surface2(r, cw.mode);
  const sunkenDeeper = mix(r.sunken, r.plane, 0.5);

  return {
    '--os-background': r.plane,
    '--os-background-rgb': rgbTriple(r.plane),
    '--os-surface': r.surface,
    '--os-surface-rgb': rgbTriple(r.surface),
    '--os-surface-container-lowest': sunkenDeeper,
    '--os-surface-container-lowest-rgb': rgbTriple(sunkenDeeper),
    '--os-surface-container-low': r.sunken,
    '--os-surface-container-low-rgb': rgbTriple(r.sunken),
    '--os-surface-container-high': r.surface,
    '--os-surface-container-high-rgb': rgbTriple(r.surface),
    '--os-surface-container-highest': s2,
    '--os-surface-container-highest-rgb': rgbTriple(s2),

    '--os-primary': r.accent,
    '--os-primary-rgb': rgbTriple(r.accent),
    '--os-primary-dim': r.soft,
    '--os-primary-dim-rgb': rgbTriple(r.soft),
    '--os-secondary': r.barA,
    '--os-secondary-rgb': rgbTriple(r.barA),
    '--os-secondary-dim': r.barB,
    '--os-secondary-dim-rgb': rgbTriple(r.barB),
    '--os-tertiary': r.aInk,
    '--os-tertiary-rgb': rgbTriple(r.aInk),

    '--os-on-surface': r.ink,
    '--os-on-surface-rgb': rgbTriple(r.ink),
    '--os-on-surface-variant': r.sec,
    '--os-on-surface-variant-rgb': rgbTriple(r.sec),
    '--os-outline-rgb': rgbTriple(r.sec),
    '--os-outline': r.sec,

    // The desktop plane. Jewel/Garden Dawn supply a real double-radial wash; the rest get a quiet
    // vertical settle so the plane is never flat paper-default (law 1).
    '--desktop-gradient': cw.wash
      ? `${cw.wash}, linear-gradient(${r.plane}, ${mix(r.plane, '#000000', 0.72)})`
      : `linear-gradient(${r.plane}, ${mix(r.plane, cw.mode === 'dark' ? '#000000' : '#ffffff', 0.85)})`,
  };
}

/** Convenience for the showcase: how loud is this accent, against SDL's locked band? */
export const accentMetrics = (cw) => ({
  relLuminance: +relLuminance(cw.roles.accent).toFixed(3),
  saturationPct: (function sat(hex) {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2;
    if (max === min) return 0;
    const d = max - min;
    return Math.round((l > 0.5 ? d / (2 - max - min) : d / (max + min)) * 100);
  })(cw.roles.accent),
});
