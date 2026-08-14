/**
 * The colorway registry — the single source of truth for theming.
 *
 * Compiles vendored SDL tokens + viz palettes + this project's overrides + the legacy pack into 16
 * fully-normalized records. Nothing outside src/theme/ should import the raw JSON.
 *
 * This module exists because design-tokens.json is NOT uniform, and a naive consumer crashes on it:
 *   - Jewel colorways use `base` where every other theme uses `plane`
 *   - `sunkSec` is absent on all of Steel and all of Jewel
 *   - `chartInk` / `titleInk` / `btnGrad` / `btnInk` are absent on most colorways
 *   - `radius` varies per COLORWAY (12/14/19/20/22), not per theme
 *   - `wash` is prose-ish ("rgba(...) at 82% 0%"), not CSS
 */
import TOKENS from './sdl/design-tokens.json';
import VIZ from './sdl/viz-palettes.json';
import { LUMINA_NEON_LEGACY } from './legacy-lumina';
import { THEME_TITLE_FACE, COLORWAY_TITLE_FACE, FONT_STACKS } from './overrides';
import { hexToOklch, oklchToHex, srgbToLinear } from './oklch';

export const SDL_VERSION = 'v2.0.0-rc';
export const SDL_AUTHOR = 'Aditya Sarva';

export const slug = (name) => name.toLowerCase().replace(/\s+/g, '-');

/* ── colour helpers ─────────────────────────────────────────────────────────── */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

/** Space-separated triple — required by `rgb(var(--x) / a)`. Commas silently break it. */
export const rgbTriple = (hex) => hexToRgb(hex).join(' ');

/** WCAG relative luminance, 0..1. Companding is imported, not reimplemented — this file and
 *  oklch.js each carried their own copy of the same sRGB curve, one on 0-255 ints and one on
 *  0-1 floats, which is exactly how two "identical" functions drift apart. */
export function relLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => srgbToLinear(c / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** HSL saturation as a percentage — used by the showcase to measure against SDL's locked band. */
export function saturation(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return Math.round((l > 0.5 ? d / (2 - max - min) : d / (max + min)) * 100);
}

/** WCAG contrast ratio between two hexes. */
export function contrast(a, b) {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Ink to place ON an accent fill.
 *
 * Chosen by measured contrast against the ACCENT, never by role name and never by page mode. Naming
 * one of them ("use plane on bright accents, ink on dark ones") is inverted for half the lineup:
 * Honey Vivid is a LIGHT colorway whose accent is a DARK teal (#358278), so its dark `ink` on that
 * accent measures 1.09:1 — a gradient button nobody can read. Measuring picks the light `plane`
 * instead, which is correct precisely because the accent is dark.
 */
export function onAccentInk(accentHex, planeHex, inkHex) {
  return contrast(accentHex, planeHex) >= contrast(accentHex, inkHex) ? planeHex : inkHex;
}

/* ── wash: "rgba(232,104,168,0.14) at 82% 0%" → CSS radial-gradient layers ───── */

function washToCss(wash) {
  if (!Array.isArray(wash) || !wash.length) return null;
  const layers = wash
    .map((entry) => {
      const m = String(entry).match(/^(.*?)\s+at\s+(.+)$/);
      if (!m) return null;
      return `radial-gradient(circle at ${m[2].trim()}, ${m[1].trim()}, transparent 60%)`;
    })
    .filter(Boolean);
  return layers.length ? layers.join(', ') : null;
}

/* ── normalization ──────────────────────────────────────────────────────────── */

const TEMPO_BINDING = TOKENS.global.motion.binding;

function normalize(cw, theme) {
  const id = slug(cw.name);
  const mode = theme.mode;
  // Jewel writes `base`; everything else writes `plane`.
  const plane = cw.plane || cw.base;
  const accent = cw.accent;
  const ink = cw.ink;

  const [hover, press, pane, ease] = TEMPO_BINDING[theme.id] || TEMPO_BINDING['steel-night'];

  const roles = {
    plane,
    surface: cw.surface,
    sunken: cw.sunken,
    chart: cw.chart,
    ink,
    sec: cw.sec,
    // Absent on all of Steel and all of Jewel — the deepened sunken ink is a light-theme concern.
    sunkSec: cw.sunkSec || cw.sec,
    accent,
    soft: cw.soft,
    aInk: cw.aInk,
    barA: cw.barA,
    barB: cw.barB,
    // Present only on Cocoa (amber) and Emerald (deep green).
    chartInk: cw.chartInk || cw.sec,
    // Jewel names a solid accent-tone title ink; law 9 forbids gradient-clipped titles.
    titleInk: cw.titleInk || cw.aInk,
    btnInk: cw.btnInk || onAccentInk(accent, plane, ink),
    onAccent: onAccentInk(accent, plane, ink),
  };

  return {
    id,
    name: cw.name,
    theme: theme.id,
    themeName: theme.name,
    mode,
    // dark themes lift with black shadows; light themes are paper-flat and move colour only
    grammar: mode === 'dark' ? 'depth' : 'flat',
    sdl: true,
    radius: cw.radius,
    roles,
    // Gradient specials (Jewel). Fall back to a flat accent so consumers never branch.
    btnGrad: cw.btnGrad || `linear-gradient(90deg, ${accent}, ${accent})`,
    wash: washToCss(cw.wash),
    // SDL ships motif DESCRIPTIONS, not SVGs. Authoring the four Botanical tiles + Garden Dawn's
    // mural is real design work needing the owner's eye, so it is deferred; these colorways ship
    // correct-but-quieter with plane + wash only. See sdl-notes.md.
    motif: null,
    motifNote: cw.motif || null,
    tempo: { hover, press, pane, ease },
    titleFace: COLORWAY_TITLE_FACE[id] || THEME_TITLE_FACE[theme.id] || 'system',
    viz: VIZ.themes[theme.id]?.cws?.[id] || null,
    note: cw.note || null,
  };
}

/* ── the lineup ─────────────────────────────────────────────────────────────── */

export const THEMES = TOKENS.themes.map((t) => ({
  id: t.id,
  name: t.name,
  mode: t.mode,
  grammar: t.grammar,
  reserve: t.reserve || [],
}));

const SDL_COLORWAYS = TOKENS.themes.flatMap((t) => t.colorways.map((cw) => normalize(cw, t)));

/**
 * Fields every consumer assumes exist, applied to records that skip `normalize()`.
 *
 * The legacy pack is hand-authored rather than compiled from the SDL tokens, so it used to reach
 * `COLORWAYS` missing the derived fields entirely. Two live consequences: `FONT_STACK(undefined)`
 * fell through to the system stack, silently discarding the Manrope face `overrides.js` reserves
 * for exactly this colorway, and the Design Language panel printed the literal string "undefined"
 * for its title face. `--sdl-btn-grad` got the same treatment — inert today only because nothing
 * outside Jewel reads it yet.
 *
 * Applying it here rather than inlining the values in legacy-lumina.js means a NEW hand-authored
 * pack cannot reintroduce the same gap.
 */
function withDerived(cw) {
  const accent = cw.roles.accent;
  return {
    titleFace: COLORWAY_TITLE_FACE[cw.id] || THEME_TITLE_FACE[cw.theme] || 'system',
    btnGrad: `linear-gradient(90deg, ${accent}, ${accent})`,
    motifNote: null,
    note: null,
    ...cw,
  };
}

/** All 16: SDL's 15 locked colorways plus the preserved legacy pack. */
export const COLORWAYS = [...SDL_COLORWAYS, withDerived(LUMINA_NEON_LEGACY)];

const BY_ID = new Map(COLORWAYS.map((c) => [c.id, c]));

export const DEFAULT_COLORWAY = 'rose-dusk';

/** Never throws on an unknown id — a bad persisted value must not brick the shell. */
export function resolveColorway(id) {
  return BY_ID.get(id) || BY_ID.get(DEFAULT_COLORWAY);
}

export const isKnownColorway = (id) => BY_ID.has(id);

/** Grouped for the Settings picker: theme families in SDL's own order, legacy last. */
export function colorwaysByTheme() {
  const groups = THEMES.map((t) => ({
    id: t.id,
    name: t.name,
    mode: t.mode,
    grammar: t.grammar,
    colorways: COLORWAYS.filter((c) => c.theme === t.id),
  }));
  groups.push({
    id: 'lumina-neon',
    name: 'Legacy',
    mode: 'dark',
    grammar: ['the product\'s pre-SDL identity, preserved'],
    colorways: COLORWAYS.filter((c) => c.theme === 'lumina-neon'),
  });
  return groups;
}

export const FONT_STACK = (key) => FONT_STACKS[key] || FONT_STACKS.system;

/**
 * The accent's hue and chroma re-rendered at a fixed perceptual lightness.
 *
 * For WebGL and canvas ONLY. Those surfaces do not obey the mode: the Quantum core is a metallic
 * material that multiplies its base colour by the lighting, and the Music visualiser draws on a
 * deliberately near-black app background. Handing either of them a light colorway's accent — Honey
 * Vivid's is a dark teal at OKLCH L=0.50 — renders a black blob and a black waveform respectively.
 * Chrome can invert with the mode because ink inverts with it; a lit 3D object cannot.
 *
 * Hue and chroma still come from the colorway, so the object is unmistakably in-theme.
 */
export function accentAtLightness(cw, L = 0.74) {
  const { C, h } = hexToOklch(cw.roles.accent);
  // Lightness is pinned; chroma is NOT floored. A floor here used to force visible colour onto
  // Mono Soft (accent chroma 0.011), so the Quantum core rendered tinted while the icon set —
  // which applies no floor — correctly rendered that same colorway greyscale. One accent, two
  // answers, depending which code path read it. Visibility comes from L, so the floor bought
  // nothing it did not already have.
  return oklchToHex(L, C, h);
}

/**
 * SDL's locked accent band, measured across all 15 colorways. The showcase uses this to place any
 * accent — including the legacy neon — against what the design language has actually approved.
 * Cobalt #5387ee was PASSED as chrome at relLuminance 0.253 and demoted to a data bar; that is the
 * precedent the legacy pack fails.
 */
export const accentBand = (() => {
  const lums = SDL_COLORWAYS.map((c) => relLuminance(c.roles.accent));
  const sats = SDL_COLORWAYS.map((c) => saturation(c.roles.accent));
  return {
    lum: { min: +Math.min(...lums).toFixed(3), max: +Math.max(...lums).toFixed(3) },
    sat: { min: Math.min(...sats), max: Math.max(...sats) },
    cobaltPassedAt: 0.253,
  };
})();

/** SDL's ten laws, verbatim from the vendored tokens (the skill's own wording). */
export const LAWS = TOKENS.laws;
export const GLOBAL = TOKENS.global;
export const STATES = TOKENS.states;
