/**
 * Wallpaper mode — the URL contract.
 *
 * Wallpaper mode exists to run inside Plash (sindresorhus.com/plash), which renders a URL as the Mac
 * desktop background in its own WKWebView. That webview has its own storage: nothing set in the
 * visitor's browser — colorway, layout, weather location — ever reaches it. So the URL is the only
 * source of truth for the mode. The store keeps the visitor's choices (`wallpaperPrefs`) purely to
 * BUILD that URL; the dashboard itself reads the URL and nothing else, so what the browser previews
 * is exactly what Plash will show. Settings opened over the wallpaper writes its edits back into the
 * URL (WallpaperMode.jsx), so that rule holds there too.
 *
 * Pure module, no React: App.jsx needs `readWallpaperMode` in the entry chunk to decide whether to
 * boot at all, and that decision must not pull the dashboard in with it.
 */
import { isKnownColorway } from '../theme/registry';
import { resolveWallpaper, isCustomWallpaper } from '../theme/wallpapers';

/** Plash stamps these classes on <html>, after load, so they are watched rather than read once. */
export const PLASH_CLASS = 'is-plash-app';
export const PLASH_BROWSING_CLASS = 'plash-is-browsing-mode';

/**
 * The catalogue. Sizes follow Apple's widget families — small is one 164px square, medium two side
 * by side, large a 2×2 square — plus `bar`, a slim full-width strip for the search box. Every source
 * here is local, localStorage or a plain cross-origin fetch, so all of it works in WebKit; nothing in
 * this list depends on a Chromium-only API. The two battery widgets read battery-guard's relay on the
 * Mac itself (see battery.js), so they show a setup note until it's installed.
 */
export const WIDGETS = {
  search:     { name: 'Search',            size: 'bar' },
  clock:      { name: 'Clock',             size: 'small' },
  apps:       { name: 'Apps',              size: 'medium' },
  todo:       { name: 'To-do',             size: 'large' },
  notes:      { name: 'Notes',             size: 'medium' },
  calendar:   { name: 'Calendar',          size: 'small' },
  weather:    { name: 'Weather',           size: 'small' },
  worldclock: { name: 'World clocks',      size: 'small' },
  progress:   { name: 'Day and year',      size: 'small' },
  music:      { name: 'Now playing',       size: 'medium' },
  agenda:     { name: 'Agenda',            size: 'medium' },
  focus:      { name: 'Today’s one thing', size: 'medium' },
  clickup:    { name: 'ClickUp',           size: 'large' },
  battery:    { name: 'Battery',           size: 'small' },
  batteryHealth: { name: 'Battery health', size: 'medium' },
};

/** Pixel boxes for each size; the dashboard packs columns from these heights. */
export const SIZE_PX = {
  bar: { width: 340, height: 52 },
  small: { width: 164, height: 164 },
  medium: { width: 340, height: 164 },
  large: { width: 340, height: 340 },
};

export const MAX_ZONES = 3;
export const MAX_LINKS = 4;
export const MAX_MAC_APPS = 4;
export const MAX_SHORTCUTS = 4;
export const MAX_PROJECTS = 4;
/** Editors a project tile can open in; each registers `<id>://file/<path>` (VS Code's scheme, kept by Cursor). */
export const PROJECT_EDITORS = ['cursor', 'vscode'];

/**
 * A Mac app's name as Finder shows it ("Microsoft Teams", "Final Cut Pro"). It is handed to a
 * Shortcuts shortcut that runs `open -a`, so only the characters app names use get through.
 */
export const sanitizeMacApp = (name) => {
  const clean = String(name ?? '').replace(/[^\p{L}\p{N} .&+'()-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return clean || null;
};

/**
 * A Shortcuts shortcut's name, run by name through `shortcuts://run-shortcut`. Shortcuts matches the
 * name exactly, so it is kept as typed (emoji sequences, accents, curly quotes, Indic vowel signs,
 * no-break and repeated spaces): `shortcutHref` percent-encodes it, so nothing here can reshape the
 * link. Only what no real name holds is changed: control characters and line breaks become spaces,
 * the bidi controls that would let a tile's label read differently from the name it runs are removed,
 * and the ends are trimmed as the Shortcuts app trims them.
 */
const BIDI_CONTROLS = /[\u202a-\u202e\u2066-\u2069]/gu;
export const sanitizeShortcut = (name) => {
  const clean = String(name ?? '').replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').replace(BIDI_CONTROLS, '').trim();
  // By code point, so a cut never splits an emoji's surrogate pair.
  return [...clean].slice(0, 50).join('').trim() || null;
};

/**
 * A project folder for a project tile: an absolute path, as Finder's Option-Command-C copies it, and
 * the editor to open it in. The path rides in the Plash URL and becomes a `cursor://file…` link, so
 * anything that is not a plain path is refused: no `..` or `.` segments, no control or format
 * characters, and no `?` or `#`, which would end the path part of that link.
 */
export function sanitizeProject(project) {
  const editor = PROJECT_EDITORS.includes(project?.editor) ? project.editor : null;
  const raw = String(project?.path ?? '').trim();
  // Format characters (bidi overrides, zero-widths) are refused too: they would let the tile's label
  // and tooltip show a different folder from the one that opens.
  if (!editor || !raw.startsWith('/') || raw.length > 200 || /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}?#]/u.test(raw)) return null;
  const parts = raw.split('/').filter(Boolean);
  if (parts.length === 0 || parts.some((p) => p === '.' || p === '..')) return null;
  return { editor, path: `/${parts.join('/')}` };
}

/** The folder's own name, for its tile. */
export const projectName = (path) => path.slice(path.lastIndexOf('/') + 1);

/**
 * Defaults describe the owner's Mac: Stage Manager's strip of running apps on the left, the Dock on
 * the right. So the left is left alone and the widgets form one column hugging the Dock.
 */
export const DEFAULT_PREFS = {
  // Sized to fit one column on a 14" MacBook (982pt tall): bar + two rows + the large to-do. The
  // menu bar already shows the date, so the month calendar is optional rather than a default.
  widgets: ['search', 'clock', 'weather', 'apps', 'todo'],
  side: 'right',        // 'right' | 'left' — which edge the widget column hugs
  dock: 'right',        // 'bottom' | 'left' | 'right' | 'hidden' — where the macOS Dock sits
  stage: 'on',          // 'on' | 'off' — Stage Manager's strip of running apps on the left
  hour: 'auto',         // 'auto' | '12' | '24'
  style: 'tinted',      // 'tinted' | 'color'
  unit: 'auto',         // 'auto' | 'c' | 'f'
  bright: 85,           // law 6: a wallpaper is looked past all day, so it starts dimmer than the shell
  zones: ['Europe/London', 'America/New_York'],
  place: null,          // { name, lat, lon } — chosen in Settings, never guessed
  tiles: ['mac:vscode', 'mac:spotify', 'web:gmail', 'web:github', 'web:chatgpt', 'app:terminal', 'app:notepad', 'app:music'],
  links: [],            // [{ name, href }] — the visitor's own web links, http(s) only
  macApps: [],          // ['Finder', …] — any Mac app by name, opened through a Shortcuts shortcut
  shortcuts: [],        // ['Start focus block', …] — the visitor's own shortcuts, run by name
  projects: [],         // [{ editor, path }] — folders opened in Cursor or VS Code
  engine: 'google',
  // The Agenda's key for /api/calendar (WALLPAPER_KEY on the server). It rides in the Plash URL, so
  // that URL is private; the calendar's own feed links never leave the server.
  calKey: '',
  // ClickUp tasks due today also appear on the Agenda (the ClickUp widget reads them either way).
  // Same key: /api/clickup sits behind WALLPAPER_KEY too, and the ClickUp token stays on the server.
  clickup: false,
  // battery-guard's relay runs on this Mac (battery.js). Off by default, so the page never asks a
  // visitor's loopback for anything.
  battery: false,
};

/** A calendar key as `openssl rand -hex 24` or a password manager makes one: no URL syntax. */
export const sanitizeCalKey = (key) => String(key ?? '').replace(/[^\w-]/g, '').slice(0, 128);

const isZone = (z) => {
  try { new Intl.DateTimeFormat(undefined, { timeZone: z }); return true; } catch { return false; }
};
const clampInt = (v, lo, hi, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const oneOf = (v, options, fallback) => (options.includes(v) ? v : fallback);
const list = (v) => (v ? v.split(',').filter(Boolean) : []);

/** Known widget ids, each once, in the given order. */
export const sanitizeWidgets = (ids) => [...new Set((ids || []).filter((w) => WIDGETS[w]))];

/** A link must be plain http(s): never a `javascript:` or data URL smuggled in through the query. */
export function safeHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

/**
 * Safe areas, in px, for what macOS already draws: the menu bar (37pt on a notched MacBook, so 40
 * clears it), the Dock on whichever edge it lives, and Stage Manager's strip on the left.
 */
export function screenInsets({ dock, stage }) {
  return {
    top: 40,
    bottom: dock === 'bottom' ? 92 : 20,
    left: Math.max(dock === 'left' ? 96 : 20, stage === 'on' ? 220 : 20),
    right: dock === 'right' ? 96 : 20,
  };
}

/** Store prefs + the live appearance → the query string Plash is given. */
export function buildWallpaperSearch(prefs, { colorway, wallpaper } = {}) {
  const p = { ...DEFAULT_PREFS, ...prefs };
  const q = new URLSearchParams({ mode: 'wallpaper' });
  q.set('w', sanitizeWidgets(p.widgets).join(','));
  q.set('side', p.side);
  q.set('dock', p.dock);
  q.set('stage', p.stage);
  q.set('h', p.hour);
  q.set('style', p.style);
  q.set('unit', p.unit);
  q.set('bright', String(p.bright));
  q.set('tz', p.zones.join(','));
  if (p.place) q.set('wx', `${p.place.name}~${p.place.lat.toFixed(3)}~${p.place.lon.toFixed(3)}`);
  q.set('apps', p.tiles.join(','));
  for (const l of p.links.slice(0, MAX_LINKS)) q.append('link', `${l.name}~${l.href}`);
  for (const name of p.macApps.slice(0, MAX_MAC_APPS)) q.append('mac', name);
  for (const name of p.shortcuts.slice(0, MAX_SHORTCUTS)) q.append('sc', name);
  for (const pr of p.projects.slice(0, MAX_PROJECTS)) q.append('proj', `${pr.editor}~${pr.path}`);
  q.set('se', p.engine);
  if (p.calKey) q.set('ck', p.calKey);
  if (p.battery) q.set('bat', '1');
  if (p.clickup) q.set('cu', '1');
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
 * Query string (+ whether Plash was detected, and whether its Browsing Mode is on) → the mode. `?mode=desktop` is an explicit opt-out that
 * beats Plash detection, so "Exit wallpaper mode" can work inside Plash's browsing mode too.
 */
export function readWallpaperMode(search, isPlash, browsing = false) {
  const q = new URLSearchParams(search);
  const mode = q.get('mode');
  const active = mode === 'wallpaper' || (isPlash && mode !== 'desktop');
  if (!active) return { active: false, plash: isPlash };

  // Plash with no parameters at all gets the defaults rather than an empty screen.
  const widgets = q.has('w') ? sanitizeWidgets(list(q.get('w'))) : DEFAULT_PREFS.widgets;
  const zones = q.has('tz') ? list(q.get('tz')).filter(isZone).slice(0, MAX_ZONES) : DEFAULT_PREFS.zones;

  let place = null;
  const wx = q.get('wx');
  if (wx) {
    const [name, lat, lon] = wx.split('~');
    const la = Number(lat);
    const lo = Number(lon);
    if (name && Math.abs(la) <= 90 && Math.abs(lo) <= 180) place = { name, lat: la, lon: lo };
  }

  const links = q.getAll('link').slice(0, MAX_LINKS).map((raw) => {
    const cut = raw.indexOf('~');
    const href = cut > 0 ? safeHttpUrl(raw.slice(cut + 1)) : null;
    return href ? { name: raw.slice(0, cut).slice(0, 24), href } : null;
  }).filter(Boolean);

  const projects = [];
  for (const raw of q.getAll('proj')) {
    const cut = raw.indexOf('~');
    const pr = cut > 0 ? sanitizeProject({ editor: raw.slice(0, cut), path: raw.slice(cut + 1) }) : null;
    if (pr && !projects.some((x) => x.path === pr.path) && projects.length < MAX_PROJECTS) projects.push(pr);
  }

  const cw = q.get('cw');
  const wp = q.get('wp');
  return {
    active: true,
    plash: isPlash,
    // Clicks reach the page in a normal browser, and in Plash only while Browsing Mode is on.
    interactive: !isPlash || browsing,
    prefs: {
      widgets,
      side: oneOf(q.get('side'), ['right', 'left'], DEFAULT_PREFS.side),
      // 'shown' is the first release's value for a bottom Dock.
      dock: q.get('dock') === 'shown' ? 'bottom' : oneOf(q.get('dock'), ['bottom', 'left', 'right', 'hidden'], DEFAULT_PREFS.dock),
      stage: oneOf(q.get('stage'), ['on', 'off'], DEFAULT_PREFS.stage),
      hour: oneOf(q.get('h'), ['auto', '12', '24'], DEFAULT_PREFS.hour),
      style: oneOf(q.get('style'), ['tinted', 'color'], DEFAULT_PREFS.style),
      unit: oneOf(q.get('unit'), ['auto', 'c', 'f'], DEFAULT_PREFS.unit),
      bright: clampInt(q.get('bright'), 30, 100, DEFAULT_PREFS.bright),
      zones,
      place,
      // Raw `kind:id` strings; the Apps widget drops any it does not know (see launchers.js, which
      // stays out of this module so its icons stay out of the entry chunk).
      tiles: q.has('apps') ? list(q.get('apps')).slice(0, 12) : DEFAULT_PREFS.tiles,
      links,
      macApps: [...new Set(q.getAll('mac').map(sanitizeMacApp).filter(Boolean))].slice(0, MAX_MAC_APPS),
      shortcuts: [...new Set(q.getAll('sc').map(sanitizeShortcut).filter(Boolean))].slice(0, MAX_SHORTCUTS),
      projects,
      engine: oneOf(q.get('se'), ['google', 'duckduckgo', 'bing', 'perplexity'], DEFAULT_PREFS.engine),
      calKey: sanitizeCalKey(q.get('ck')),
      battery: q.get('bat') === '1',
      clickup: q.get('cu') === '1',
    },
    // Only overrides the theme when the URL names a real value; otherwise the store's own wins.
    theme: {
      colorway: isKnownColorway(cw) ? cw : null,
      wallpaper: wp && resolveWallpaper(wp).id === wp ? wp : null,
    },
  };
}
