/**
 * Icon themes.
 *
 * ── Why the old system looked bad ──────────────────────────────────────────────────────────────
 *
 * App identity was stored as a literal hex from the *legacy Lumina Neon* palette (#00f5a0, #cc97ff,
 * #ffc86b …) and the glyph colour carried 100% of that identity. Two consequences:
 *
 *   1. Those hexes are pinned to one colorway's temperament. #00f5a0 sits at OKLCH L=0.855 — on the
 *      near-white plane of a light colorway it measures ~1.4:1 and effectively disappears. Against
 *      Carbon or Steel (46–60% saturation by design) the whole set simply shouts.
 *   2. With no tile, ANY retint is violent, because the glyph is the entire icon.
 *
 * ── The fix: identity is the HUE, discipline is the colorway ───────────────────────────────────
 *
 * Each app declares an OKLCH hue angle. We re-render that hue at the ACTIVE colorway's own chroma
 * and lightness, then walk lightness until measured contrast against the plane clears 3:1. You can
 * still find Music by its purple and Files by its amber — wayfinding survives — but the set is as
 * muted as Carbon wants it or as vivid as the legacy neon wants it, and it is never unreadable.
 *
 * This is what SDL law 2 actually permits: one accent VOICE, with identity carried by hue rather
 * than by a second competing saturation. Icons are pinned to the accent's own chroma, never above
 * it, so they cannot out-shout the accent.
 *
 * Every theme resolves TWO channels — a `tile` and a `glyph` — so identity has somewhere to live
 * besides the stroke colour.
 */
import { hexToOklch, oklchToHex } from './oklch';
import { contrast, onAccentInk, hexToRgb } from './registry';

export const ICON_THEMES = [
  {
    id: 'harmonized',
    name: 'Harmonized',
    description:
      "Each app keeps its own hue, retuned to this colorway's chroma and lightness. Identity without the clash.",
  },
  {
    id: 'solid',
    name: 'Solid',
    description: 'Filled tiles in each app’s hue, glyph in whichever ink measures more readable on it.',
  },
  {
    id: 'mono',
    name: 'Monochrome',
    description: 'One voice — the accent, on its soft. SDL law 2 at its strictest; quiet, but harder to scan.',
  },
  {
    id: 'outline',
    name: 'Outline',
    description: 'Hairline glyphs in ink with a whisper of hue. Chrome recedes furthest.',
  },
  {
    id: 'lumina',
    name: 'Lumina Neon',
    description:
      'The original hardcoded neon palette. Off-theme by design — it belongs to the legacy colorway and will fight the others.',
  },
];

export const DEFAULT_ICON_THEME = 'harmonized';
export const isKnownIconTheme = (id) => ICON_THEMES.some((t) => t.id === id);

/** WCAG 1.4.11 floor for non-text UI. An app icon IS the affordance, so it is held to it. */
const MIN_ON_PLANE = 3.0;
/** A glyph inside a filled tile reads as a symbol on a background — held to the text floor. */
const MIN_ON_TILE = 4.5;

const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
const rgba = (hex, a) => `rgb(${hexToRgb(hex).join(' ')} / ${a})`;

/** Worst measured contrast against every surface this glyph might land on. */
const worstOn = (hex, backdrops) => Math.min(...backdrops.map((b) => contrast(hex, b)));

/**
 * Render `hue` at the colorway's chroma, then walk lightness AWAY from the plane until it is
 * legible on every backdrop it can sit on.
 *
 * The walk is not optional. OKLab lightness is perceptual; WCAG contrast is relative luminance —
 * they are different functions of the same colour. At a fixed L, yellow carries far more luminance
 * than blue, so holding L constant across the hue wheel passes for some apps and fails for others.
 * Stepping until the measurement passes is the only way to make a promise about all eighteen.
 */
function harmonize(hue, cw, chromaScale = 1) {
  const acc = hexToOklch(cw.roles.accent);
  const C = acc.C * chromaScale;
  const backdrops = [cw.roles.plane, cw.roles.surface];
  const dir = cw.mode === 'dark' ? +1 : -1; // toward white in dark, toward black in light

  let L = acc.L;
  let hex = oklchToHex(L, C, hue);
  for (let i = 0; i < 48 && worstOn(hex, backdrops) < MIN_ON_PLANE; i += 1) {
    const next = clamp(L + dir * 0.02, 0.04, 0.98);
    if (next === L) break; // clamped out; ship the best we reached rather than spin
    L = next;
    hex = oklchToHex(L, C, hue);
  }
  return hex;
}

/**
 * A filled tile plus the ink that reads on it.
 *
 * `onAccentInk` picks plane-family or ink-family by MEASURED contrast rather than by role name —
 * the same correction P2 needed for primary buttons, and for the same reason: "plane-family ink" is
 * inverted for every light colorway whose accent is dark.
 */
function solidTile(hue, cw) {
  const dir = cw.mode === 'dark' ? +1 : -1;
  let tile = harmonize(hue, cw);
  let ink = onAccentInk(tile, cw.roles.plane, cw.roles.ink);

  let { L, C } = hexToOklch(tile);
  for (let i = 0; i < 48 && contrast(tile, ink) < MIN_ON_TILE; i += 1) {
    const next = clamp(L + dir * 0.02, 0.04, 0.98);
    if (next === L) break;
    L = next;
    tile = oklchToHex(L, C, hue);
    ink = onAccentInk(tile, cw.roles.plane, cw.roles.ink);
  }
  return { tile, ink };
}

const cache = new Map();

/**
 * Resolve both channels of an app icon under the active theme.
 *
 * @param {string} themeId  icon theme id
 * @param {object} cw       resolved colorway (from registry.resolveColorway)
 * @param {{hue?: number, legacyHex?: string}} app  the app's identity declaration
 * @returns {{glyph: string, bare: string, tile: string|null, tileBorder: string|null,
 *            strokeWidth: number, glow: string|false, dot: string}}
 *
 *   `bare` is the glyph colour to use when the icon renders WITHOUT its tile — the dock does this.
 *          It only differs for Solid, whose glyph is an ink chosen to read *inside* a filled shape;
 *          drawn on the bare dock that ink is cream-on-cream and the icon disappears. Caught by
 *          looking at a screenshot, not by any measurement, because the number was right for the
 *          surface the glyph was measured against — just not for the surface it landed on.
 *
 *   `dot`  is the dock's running-app indicator, which used to be a SECOND hardcoded hex per app
 *          (Terminal's was #ffffff — invisible on every light colorway).
 */
export function iconStyle(themeId, cw, app = {}) {
  const hue = typeof app.hue === 'number' ? app.hue : hexToOklch(cw.roles.accent).h;
  const key = `${themeId}|${cw.id}|${hue}|${app.legacyHex || ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const dark = cw.mode === 'dark';
  // Halos are dark-mode grammar; --sdl-glow is already `transparent` in light. Alpha rides the
  // Atmosphere dial so law 8's one control still governs every ambient effect.
  const halo = (hex) => (dark ? `rgb(${hexToRgb(hex).join(' ')} / calc(0.32 * var(--sdl-atmo, 1)))` : false);

  let out;
  switch (themeId) {
    case 'solid': {
      const { tile, ink } = solidTile(hue, cw);
      out = {
        glyph: ink, bare: tile, tile, tileBorder: rgba(tile, 0.55),
        strokeWidth: 2.4, glow: halo(tile), dot: tile,
      };
      break;
    }
    case 'mono': {
      const g = cw.roles.accent;
      out = {
        glyph: g, bare: g, tile: rgba(cw.roles.soft || g, dark ? 0.9 : 1), tileBorder: rgba(g, 0.22),
        strokeWidth: 2.2, glow: halo(g), dot: g,
      };
      break;
    }
    case 'outline': {
      // A whisper of hue at a third of the chroma — enough to tell apps apart at a glance without
      // the set reading as coloured. The old build used `sec`, which made every glyph the same
      // muted grey: the lowest-contrast option in the list, for the one thing you must be able to hit.
      const g = harmonize(hue, cw, 0.34);
      out = { glyph: g, bare: g, tile: null, tileBorder: null, strokeWidth: 1.5, glow: false, dot: g };
      break;
    }
    case 'lumina': {
      // Preserved verbatim, including its flaws. Someone running the legacy colorway wants exactly
      // this; the theme description says plainly that it will fight the other fifteen.
      const g = app.legacyHex || cw.roles.accent;
      out = {
        glyph: g, bare: g, tile: rgba(cw.roles.ink, dark ? 0.1 : 0.06), tileBorder: rgba(cw.roles.ink, 0.1),
        strokeWidth: 2.5, glow: halo(g), dot: g,
      };
      break;
    }
    case 'harmonized':
    default: {
      const g = harmonize(hue, cw);
      out = {
        glyph: g,
        bare: g,
        // A TINT rather than a fill: the desktop tile sits over the user's wallpaper with a
        // backdrop-blur, and an opaque tile would throw that glass away.
        tile: rgba(g, dark ? 0.16 : 0.13),
        tileBorder: rgba(g, dark ? 0.3 : 0.24),
        strokeWidth: 2.3,
        glow: halo(g),
        dot: g,
      };
      break;
    }
  }

  cache.set(key, out);
  return out;
}

/**
 * Measure a theme against a colorway, so Settings can TELL you a combination is bad instead of
 * letting you discover it on the dock.
 *
 * This is the whole reason the icon layer resolves to hex rather than emitting `oklch()`: a
 * measurement you can show the user beats a promise you cannot check. Only "Lumina Neon" is
 * expected to fail here — it is a fixed palette, so on a light colorway most of its glyphs are
 * genuinely unreadable, and the settings card says so with a number.
 *
 * Also reports whether the set is still *distinguishable*. Icons are held at the colorway's own
 * chroma, never above it, so on a deliberately near-neutral colorway (Mono Soft's accent carries an
 * OKLCH chroma of 0.011) Harmonized correctly degenerates into eighteen indistinguishable greys.
 * That is the colorway getting its way rather than a bug — but a theme that promises per-app hue
 * and silently delivers greyscale is the same broken promise this whole rework is about, so the
 * card says so.
 *
 * @returns {{below: number, total: number, worst: number, chroma: number, flat: boolean}}
 */
export function iconAudit(themeId, cw, apps) {
  let below = 0;
  let worst = Infinity;
  const marks = [];
  for (const app of apps) {
    const s = iconStyle(themeId, cw, app);
    // A glyph on a filled tile is measured against the tile; otherwise against the plane it floats on.
    const backdrop = themeId === 'solid' ? s.tile : cw.roles.plane;
    const floor = themeId === 'solid' ? MIN_ON_TILE : MIN_ON_PLANE;
    const r = contrast(s.glyph, backdrop);
    if (r < worst) worst = r;
    if (r < floor - 0.001) below += 1;
    marks.push(hexToOklch(themeId === 'solid' ? s.tile : s.glyph));
  }

  // Peak chroma across the set. Deliberately NOT the closest pair: Lumina Neon puts three apps on
  // the same #00f5a0, so a min-pairwise-distance test would call that palette "flat" when it is the
  // loudest one there is. What we actually want to know is whether the set has any COLOUR left.
  const chroma = Math.max(...marks.map((m) => m.C));

  return {
    below,
    total: apps.length,
    worst: worst === Infinity ? 0 : worst,
    chroma,
    // `mono` is monochrome on purpose and is never flagged.
    flat: themeId !== 'mono' && chroma < 0.02,
  };
}
