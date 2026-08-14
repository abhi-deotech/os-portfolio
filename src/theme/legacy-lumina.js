/**
 * Lumina Neon (Legacy) — the 16th colorway, and the only one that is NOT SDL.
 *
 * This preserves the product's pre-SDL identity exactly as it shipped, so that upgrading changes
 * nobody's look and so the Design Language showcase has a real before/after to argue against rather
 * than a hypothetical one.
 *
 * Values are taken verbatim from the shipped :root block, including its flaws — those flaws are the
 * point. `missingRoles` is the honest part: the legacy palette has no chart well, no accent-soft,
 * no accent-ink, no deepened sunken ink and no bar channel, because it never distinguished chrome
 * from data. The showcase renders those as struck-through em-dashes. (It DOES have a real, distinct
 * `sunken` — that one it got right.)
 *
 * Measured against SDL's locked band (see sdl-notes.md): all four legacy accents run 100% HSL
 * saturation at relative luminance 0.375-0.678, while SDL's locked dark accents run 46-82% at
 * 0.245-0.317. Cobalt #5387ee was PASSED as chrome at 0.253 and demoted to a data bar; every legacy
 * accent sits above it.
 */
export const LUMINA_NEON_LEGACY = {
  id: 'lumina-neon',
  name: 'Lumina Neon',
  suffix: '(Legacy)',
  theme: 'lumina-neon',
  themeName: 'Not SDL',
  mode: 'dark',
  grammar: 'depth',
  sdl: false,
  radius: 24,
  description: 'The original neon identity, preserved. Chrome and data speak at the same volume.',

  roles: {
    plane: '#060e20',
    // Identical to plane — no law names this directly (law 4 is about chart WELLS), but a surface
    // that does not demarcate from its plane is the role vocabulary collapsing, and you can see it
    // in the swatch ladder. True of the shipped product: index.css declared --os-background and
    // --os-surface as the same hex.
    surface: '#060e20',
    sunken: '#091328',
    chart: '#12161d',
    ink: '#dee5ff',
    sec: '#a3aac4',
    sunkSec: '#a3aac4',
    accent: '#cc97ff',
    // No accent-soft existed; the shell faked it with bg-os-primary/10 everywhere.
    soft: '#31285c',
    // Law 3 says bold colored text must lighten + desaturate first. Legacy used the raw accent.
    aInk: '#cc97ff',
    // The "data channel" was just the other two chrome accents.
    barA: '#00d2fd',
    barB: '#00f5a0',
    chartInk: '#a3aac4',
    titleInk: '#cc97ff',
    // Legacy put black text on its neon fills (text-black on bg-os-primary, 44 sites). At
    // relLuminance 0.46 the accent is light enough that this is actually correct here — it is the
    // one thing the neon pack got right, and only because every accent was so bright.
    btnInk: '#060e20',
    onAccent: '#060e20',
  },

  /** Roles the legacy palette genuinely does not have. Rendered struck-through in the showcase. */
  missingRoles: ['soft', 'aInk', 'barA', 'barB', 'chart', 'sunkSec'],

  /** No wash, no motif — the plane was a wallpaper, not a designed surface. */
  wash: null,
  motif: null,

  /** Legacy had no tempo binding at all: 13 distinct durations across the shell. */
  tempo: { hover: 300, press: 300, pane: 500, ease: 'cubic-bezier(0.4, 0, 0.2, 1)' },

  /** Categorical palette was literally the dock palette — see SystemMetricsWidget. */
  viz: {
    cat: ['#cc97ff', '#00d2fd', '#ff6b6b', '#ffd93d', '#00f5a0'],
    seq: ['#1a1035', '#3a2a6b', '#6b52a8', '#a07ae0', '#cc97ff'],
    div: ['#ff6b6b', '#d09a9a', '#6d7590', '#7ab3e0', '#00d2fd'],
  },
};
