/**
 * OKLCH colour engine.
 *
 * Exists for one job: let an app icon keep its identity HUE while adopting the active colorway's
 * chroma and lightness discipline. Doing that in sRGB or HSL does not work — HSL "lightness" is not
 * perceptual, so holding it constant across hues makes yellow blinding and blue muddy, which is
 * precisely the artifact the legacy icon set suffers from. OKLab is perceptually uniform, so a
 * single (L, C) pair means the same *visual* weight at every hue angle.
 *
 * Everything returns hex rather than a CSS `oklch()` string. That is deliberate: the rest of the
 * theme layer measures WCAG contrast (registry.contrast) and emits space-separated rgb triples for
 * Tailwind, and neither can consume an unresolved `oklch()`. Resolving here keeps one source of
 * truth and — more importantly — lets us *prove* a glyph is readable rather than assume it.
 *
 * Matrices are Björn Ottosson's published OKLab constants.
 */

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/* ── sRGB transfer function ─────────────────────────────────────────────────────────────────── */

/** sRGB → linear, on 0-1 floats. Exported because registry.js's WCAG luminance needs the same
 *  curve, and two copies of one transfer function is a drift waiting to happen. */
export const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toLinear = srgbToLinear;
const toGamma = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/* ── hex ⇄ linear sRGB ──────────────────────────────────────────────────────────────────────── */

function hexToLinear(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => toLinear(parseInt(full.slice(i, i + 2), 16) / 255));
}

function linearToHex(rgb) {
  return '#' + rgb
    .map((c) => Math.round(clamp01(toGamma(c)) * 255).toString(16).padStart(2, '0'))
    .join('');
}

/* ── linear sRGB ⇄ OKLab ────────────────────────────────────────────────────────────────────── */

function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

/* ── public: hex ⇄ OKLCH ────────────────────────────────────────────────────────────────────── */

const DEG = 180 / Math.PI;

/** @returns {{L: number, C: number, h: number}} L and C in [0,1]-ish, h in degrees [0,360). */
export function hexToOklch(hex) {
  const [L, a, b] = linearToOklab(hexToLinear(hex));
  const C = Math.hypot(a, b);
  // A neutral has no meaningful hue; report 0 rather than atan2's noise on near-zero components.
  const h = C < 1e-6 ? 0 : (Math.atan2(b, a) * DEG + 360) % 360;
  return { L, C, h };
}

const inGamut = (rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/**
 * OKLCH → hex, reducing chroma until the colour fits sRGB.
 *
 * Naive clipping of out-of-gamut channels shifts HUE — clip the blue channel of a vivid violet and
 * it slides toward magenta. Since hue is the one thing this module exists to preserve, we bisect on
 * C instead: same L, same h, the most chroma sRGB can actually show.
 */
export function oklchToHex(L, C, h) {
  const rad = h / DEG;
  const at = (c) => oklabToLinear([L, c * Math.cos(rad), c * Math.sin(rad)]);

  let rgb = at(C);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 18; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(at(mid))) lo = mid; else hi = mid;
    }
    rgb = at(lo);
  }
  return linearToHex(rgb.map(clamp01));
}

/** Largest chroma sRGB can render at this (L, h). Used to keep a colorway's discipline honest. */
export function maxChroma(L, h) {
  const rad = h / DEG;
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 18; i += 1) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklabToLinear([L, mid * Math.cos(rad), mid * Math.sin(rad)]))) lo = mid; else hi = mid;
  }
  return lo;
}
