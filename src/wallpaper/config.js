/**
 * Wallpaper mode — the URL contract.
 *
 * Wallpaper mode exists to run inside Plash (sindresorhus.com/plash), which renders a URL as the Mac
 * desktop background in its own WKWebView. That webview has its own storage: nothing set in the
 * visitor's browser — colorway, layout, weather location — ever reaches it. So the URL is the only
 * source of truth for the mode. The store keeps the visitor's choices (`wallpaperPrefs`) purely to
 * BUILD that URL; the dashboard itself reads the URL and nothing else, so what the browser previews
 * is exactly what Plash will show.
 *
 * Pure module, no React: App.jsx needs `readWallpaperMode` in the entry chunk to decide whether to
 * boot at all, and that decision must not pull the dashboard in with it.
 */
import { isKnownColorway } from '../theme/registry';
import { resolveWallpaper, isCustomWallpaper } from '../theme/wallpapers';

/** Plash stamps this class on <html>. Added after load, so it is watched, not just read once. */
export const PLASH_CLASS = 'is-plash-app';

export const CORNERS = ['tl', 'tr', 'bl', 'br'];
export const CORNER_NAMES = { tl: 'Top left', tr: 'Top right', bl: 'Bottom left', br: 'Bottom right' };

/**
 * The catalogue. Sizes follow Apple's widget families: small is one 164px square, medium is two of
 * them side by side. Every source here is local or a plain cross-origin fetch, so all of them work in
 * WebKit — nothing in this list depends on a Chromium-only API.
 */
export const WIDGETS = {
  clock:      { name: 'Clock',             size: 'medium' },
  worldclock: { name: 'World clocks',      size: 'small' },
  calendar:   { name: 'Calendar',          size: 'small' },
  music:      { name: 'Now playing',       size: 'medium' },
  weather:    { name: 'Weather',           size: 'small' },
  progress:   { name: 'Day and year',      size: 'small' },
};

/** Finder's desktop icons live in the top-right column, so that corner only takes small widgets. */
export const fitsCorner = (widget, corner) => corner !== 'tr' || WIDGETS[widget]?.size === 'small';

export const MAX_PER_CORNER = 3;
export const MAX_ZONES = 3;

export const DEFAULT_PREFS = {
  layout: { tl: ['clock', 'worldclock'], tr: ['calendar'], bl: ['music'], br: ['weather', 'progress'] },
  dock: 'shown',        // 'shown' | 'hidden' — how much bottom inset to leave for the macOS Dock
  hour: 'auto',         // 'auto' | '12' | '24'
  style: 'tinted',      // 'tinted' | 'color'
  unit: 'auto',         // 'auto' | 'c' | 'f'
  bright: 85,           // law 6: a wallpaper is looked past all day, so it starts dimmer than the shell
  zones: ['Europe/London', 'America/New_York'],
  place: null,          // { name, lat, lon } — chosen in Settings, never guessed
};

const isZone = (z) => {
  try { new Intl.DateTimeFormat(undefined, { timeZone: z }); return true; } catch { return false; }
};
const clampInt = (v, lo, hi, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const oneOf = (v, options, fallback) => (options.includes(v) ? v : fallback);
const list = (v) => (v ? v.split(',').filter(Boolean) : []);

/** Drop unknown ids, repeats, and anything that does not fit its corner; cap each corner. */
export function sanitizeLayout(layout) {
  const seen = new Set();
  const out = {};
  for (const corner of CORNERS) {
    out[corner] = (layout?.[corner] || [])
      .filter((w) => WIDGETS[w] && !seen.has(w) && fitsCorner(w, corner) && seen.add(w))
      .slice(0, MAX_PER_CORNER);
  }
  return out;
}

/** Store prefs + the live appearance → the query string Plash is given. */
export function buildWallpaperSearch(prefs, { colorway, wallpaper } = {}) {
  const p = { ...DEFAULT_PREFS, ...prefs };
  const layout = sanitizeLayout(p.layout);
  const q = new URLSearchParams({ mode: 'wallpaper' });
  for (const corner of CORNERS) q.set(corner, layout[corner].join(','));
  q.set('dock', p.dock);
  q.set('h', p.hour);
  q.set('style', p.style);
  q.set('unit', p.unit);
  q.set('bright', String(p.bright));
  q.set('tz', p.zones.join(','));
  if (p.place) q.set('wx', `${p.place.name}~${p.place.lat.toFixed(3)}~${p.place.lon.toFixed(3)}`);
  if (colorway) q.set('cw', colorway);
  // An uploaded wallpaper is a Blob in THIS browser's IndexedDB; Plash can never load it, so the
  // colorway plane stands in rather than a URL that paints nothing.
  if (wallpaper) q.set('wp', isCustomWallpaper(wallpaper) ? 'colorway' : wallpaper);
  return `?${q.toString()}`;
}

/**
 * The `unit` pref → 'c' | 'f'. 'auto' means Fahrenheit only where it is the everyday unit. Lives here
 * rather than in weather.js so the eager desktop clock can know its unit without loading that module.
 */
export function resolveUnit(unit, language = navigator.language) {
  if (unit === 'c' || unit === 'f') return unit;
  try {
    return ['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW'].includes(new Intl.Locale(language).maximize().region) ? 'f' : 'c';
  } catch {
    return 'c';
  }
}

export const buildWallpaperUrl = (prefs, appearance) =>
  `${window.location.origin}${window.location.pathname}${buildWallpaperSearch(prefs, appearance)}`;

/**
 * Query string (+ whether Plash was detected) → the mode. `?mode=desktop` is an explicit opt-out that
 * beats Plash detection, so "Exit wallpaper mode" can work inside Plash's browsing mode too.
 */
export function readWallpaperMode(search, isPlash) {
  const q = new URLSearchParams(search);
  const mode = q.get('mode');
  const active = mode === 'wallpaper' || (isPlash && mode !== 'desktop');
  if (!active) return { active: false, plash: isPlash };

  // Plash with no parameters at all gets the defaults rather than an empty screen.
  const hasLayout = CORNERS.some((c) => q.has(c));
  const layout = hasLayout
    ? sanitizeLayout(Object.fromEntries(CORNERS.map((c) => [c, list(q.get(c))])))
    : sanitizeLayout(DEFAULT_PREFS.layout);

  const zones = q.has('tz') ? list(q.get('tz')).filter(isZone).slice(0, MAX_ZONES) : DEFAULT_PREFS.zones;

  let place = null;
  const wx = q.get('wx');
  if (wx) {
    const [name, lat, lon] = wx.split('~');
    const la = Number(lat);
    const lo = Number(lon);
    if (name && Math.abs(la) <= 90 && Math.abs(lo) <= 180) place = { name, lat: la, lon: lo };
  }

  const cw = q.get('cw');
  const wp = q.get('wp');
  return {
    active: true,
    plash: isPlash,
    prefs: {
      layout,
      dock: oneOf(q.get('dock'), ['shown', 'hidden'], DEFAULT_PREFS.dock),
      hour: oneOf(q.get('h'), ['auto', '12', '24'], DEFAULT_PREFS.hour),
      style: oneOf(q.get('style'), ['tinted', 'color'], DEFAULT_PREFS.style),
      unit: oneOf(q.get('unit'), ['auto', 'c', 'f'], DEFAULT_PREFS.unit),
      bright: clampInt(q.get('bright'), 30, 100, DEFAULT_PREFS.bright),
      zones,
      place,
    },
    // Only overrides the theme when the URL names a real value; otherwise the store's own wins.
    theme: {
      colorway: isKnownColorway(cw) ? cw : null,
      wallpaper: wp && resolveWallpaper(wp).id === wp ? wp : null,
    },
  };
}
