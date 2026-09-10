/**
 * The single wallpaper library.
 *
 * Previously declared three times: LiveWallpaper.jsx had TWO copies in one 53-line file (the second
 * shadowed the first and was missing all four image ids, so selecting a photo wallpaper fell through
 * to a hardcoded navy), and Settings.jsx held a third with different thumbnail URLs. Adding a
 * wallpaper meant editing three literals and any omission failed silently.
 *
 * P3 adds the `colorway` entry — a wallpaper that renders nothing, letting the colorway's own plane,
 * wash and motif show through. That becomes the default for SDL colorways, because SDL's atmosphere
 * grammar (law 8) assumes the designer owns the background while this OS hands it to the user.
 */

import { relLuminance } from './registry';
import { hexToOklch } from './oklch';

/** @typedef {{id: string, name: string, type: 'live'|'image'|'none', gradient?: string, url?: string,
 *             thumb?: string, tone?: {lum: number, rgb: number[]}}} Wallpaper */

const UNSPLASH = (id, w, q) =>
  `https://images.unsplash.com/photo-${id}?q=${q}&w=${w}&auto=format&fit=crop`;

/**
 * Measured mean tone of the four photographs.
 *
 * A gradient carries its ingredients in its own class string, so its tone is DERIVED below and
 * cannot drift. A JPEG does not, and there is no image decoder in the dependency list — so these
 * four are the one hand-carried fact in this file. They were measured, not estimated: each thumb
 * was drawn to a 64x64 canvas in the browser and averaged in linear-light sRGB (the same
 * companding `relLuminance` uses), which is why `dark-mountain` reads 0.040 and `cyber-vibes`
 * 0.626 rather than both being called "kind of blue".
 *
 * If a photo is ever swapped for a different Unsplash id, re-measure it. A stale number here does
 * not crash anything — it just quietly lets the randomizer pair a dark photo with a paper-white
 * colorway again, which is the exact failure this table exists to prevent.
 */
const PHOTO_TONE = {
  'abstract-blue': { lum: 0.265, rgb: [117, 103, 204] },
  'dark-mountain': { lum: 0.040, rgb: [35, 37, 54] },
  'cyber-vibes': { lum: 0.626, rgb: [203, 196, 204] },
  'tech-minimal': { lum: 0.077, rgb: [59, 38, 75] },
};

/** @type {Wallpaper[]} */
export const WALLPAPERS = [
  // Renders NOTHING, so the colorway's own plane + wash + motif show through. This is the
  // resolution to a real conflict: SDL's atmosphere grammar (law 8) assumes the designer owns the
  // background, while this OS hands it to the user. Default for SDL colorways.
  { id: 'colorway', name: 'Colorway', type: 'none' },
  { id: 'neon-nebula', name: 'Neon Nebula', type: 'live', gradient: 'bg-gradient-to-br from-[#cc97ff] to-[#00d2fd]' },
  { id: 'cyber-grid', name: 'Cyber Grid', type: 'live', gradient: 'bg-gradient-to-br from-[#00f5a0] to-[#00d2fd]' },
  { id: 'sunset-glow', name: 'Sunset Glow', type: 'live', gradient: 'bg-gradient-to-br from-[#ff4d4d] to-[#ffaf40]' },
  { id: 'quantum-flow', name: 'Quantum Flow', type: 'live', gradient: 'bg-gradient-to-br from-[#cc97ff] to-[#60a5fa]' },
  { id: 'linux-default', name: 'Linux Default', type: 'live', gradient: 'bg-gradient-to-br from-[#4e1a3d] via-[#772953] to-[#e95420]' },
  { id: 'abstract-blue', name: 'Abstract Blue', type: 'image', url: UNSPLASH('1618005182384-a83a8bd57fbe', 1200, 70), thumb: UNSPLASH('1618005182384-a83a8bd57fbe', 400, 40) },
  { id: 'dark-mountain', name: 'Dark Mountain', type: 'image', url: UNSPLASH('1477346611705-65d1883cee1e', 1200, 70), thumb: UNSPLASH('1477346611705-65d1883cee1e', 400, 40) },
  { id: 'cyber-vibes', name: 'Cyber Vibes', type: 'image', url: UNSPLASH('1614850523296-d8c1af93d400', 1200, 70), thumb: UNSPLASH('1614850523296-d8c1af93d400', 400, 40) },
  { id: 'tech-minimal', name: 'Minimal Tech', type: 'image', url: UNSPLASH('1550745165-9bc0b252726f', 1200, 70), thumb: UNSPLASH('1550745165-9bc0b252726f', 400, 40) },
];

export const DEFAULT_WALLPAPER = 'linux-default';

const BY_ID = new Map(WALLPAPERS.map((w) => [w.id, w]));

export const isCustomWallpaper = (value) => typeof value === 'string' && value.startsWith('data:image');

/** Resolve an id to its entry, falling back to the default rather than to a bare colour. */
export function resolveWallpaper(id) {
  return BY_ID.get(id) || BY_ID.get(DEFAULT_WALLPAPER);
}

/* ── how a wallpaper measures against a colorway ─────────────────────────────── */

const hexIn = (s) => s.match(/#[0-9a-f]{6}/gi) || [];
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const asHex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

/**
 * A wallpaper's ingredients, reduced to the three numbers that decide whether it belongs with a
 * given colorway. Live gradients are read straight out of the Tailwind class that renders them, so
 * this can never disagree with what is on screen.
 */
const INGREDIENTS = new Map(
  WALLPAPERS.map((w) => {
    if (w.type === 'none') return [w.id, null]; // the plane IS the colorway; nothing to compare
    if (w.type === 'live') {
      const stops = hexIn(w.gradient || '');
      return [w.id, {
        lum: mean(stops.map(relLuminance)),
        hues: stops.map((h) => hexToOklch(h).h),
        chroma: mean(stops.map((h) => hexToOklch(h).C)),
      }];
    }
    const t = PHOTO_TONE[w.id];
    if (!t) return [w.id, null];
    const o = hexToOklch(asHex(t.rgb));
    return [w.id, { lum: t.lum, hues: [o.h], chroma: o.C }];
  }),
);

/** Circular distance between two OKLCH hue angles, 0..180 degrees. */
const hueDistance = (a, b) => {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
};

/**
 * The three gates. Tuned against the measured lineup so that every colorway keeps a usable pool
 * rather than so that a target number of pairs survives.
 *
 *   POLARITY  How far the wallpaper's tone sits from the plane the colorway was designed around.
 *             This is the clash you see first: Steel and Jewel put near-black planes (relative
 *             luminance 0.004) under glass panels tuned for darkness, and the five live gradients
 *             are 100%-saturation neon left over from the pre-SDL shell — `cyber-grid` averages
 *             0.605, a 0.60 gap, and the whole shell reads as floating on a lightbox. The inverse
 *             is worse: `linux-default` averages 0.109 under paper-white light colorways, a gap of
 *             up to 0.81.
 *   HUE       Whether the wallpaper tells the same colour story as the accent. Rose Dusk's accent
 *             is pink at hue 351; `cyber-grid` is green-into-cyan at 159, 132 degrees away, and the
 *             desktop argues with itself.
 *   CHROMA    SDL law 2, applied to the background instead of the icons. icons.js already pins
 *             glyphs to "the accent's own chroma, never above it, so they cannot out-shout the
 *             accent" — a wallpaper that clears the accent by a wide margin out-shouts it far more
 *             effectively than an icon can. Mono Soft is the case that proves it: its accent
 *             carries a chroma of 0.011, so every saturated gradient in the library is off-register
 *             for it by an order of magnitude.
 *
 * The ceiling is a RATIO rather than an absolute, because a vivid colorway has earned a vivid
 * background and a near-neutral one has not.
 */
const MAX_POLARITY = 0.35;
const MAX_HUE_DEG = 100;
const MAX_CHROMA_RATIO = 2.2;

/**
 * Measure a wallpaper against a colorway.
 *
 * Exported so the same numbers can back a randomizer filter and, later, a Settings warning — the
 * lesson `iconAudit` already encodes: a measurement you can show the user beats a promise you
 * cannot check.
 *
 * @param {string} wallpaperId
 * @param {object} cw  resolved colorway (from registry.resolveColorway)
 * @returns {{ok: boolean, polarity: number, hue: number, chroma: number, reasons: string[]}}
 */
export function wallpaperFit(wallpaperId, cw) {
  const ing = INGREDIENTS.get(wallpaperId);
  // The "Colorway" plane renders nothing, so it is in-register with every colorway by construction.
  // An uploaded image is the user's own file and is never judged — see randomize.js.
  if (!ing) return { ok: true, polarity: 0, hue: 0, chroma: 0, reasons: [] };

  const accent = hexToOklch(cw.roles.accent);
  const polarity = Math.abs(ing.lum - relLuminance(cw.roles.plane));
  const hue = Math.min(...ing.hues.map((h) => hueDistance(accent.h, h)));
  // Mono Soft's accent chroma is 0.011; without a floor the ratio explodes and the message stops
  // being useful. The floor is well below any other colorway in the lineup, so only Mono Soft
  // notices it.
  const chroma = ing.chroma / Math.max(accent.C, 0.02);

  const reasons = [];
  if (polarity > MAX_POLARITY) reasons.push('tone');
  if (hue > MAX_HUE_DEG) reasons.push('hue');
  if (chroma > MAX_CHROMA_RATIO) reasons.push('chroma');

  return { ok: reasons.length === 0, polarity, hue, chroma, reasons };
}
