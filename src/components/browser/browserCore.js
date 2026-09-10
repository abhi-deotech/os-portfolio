/**
 * Flow-Net's pure core: URL resolution, the block-list matcher, per-tab history arithmetic and
 * the persisted bookmark/history stores.
 *
 * Deliberately free of React and JSX so the exact functions the component ships are the ones the
 * Node test harness imports and asserts on — retyping logic into a harness tests the copy, not
 * the code (tasks/lessons.md, "Verify a claimed fix against the same harness").
 */

/**
 * Internal pseudo-URL for the start page. It never reaches an iframe: Browser.jsx renders a React
 * page for it, the persisted history skips it, and the address bar displays it as an empty field.
 */
export const START_URL = 'lumina://start';

export const MAX_TABS = 8;
export const TAB_HOARDER_AT = 3;
export const HISTORY_CAP = 100;
export const RECENT_LIMIT = 8;
export const LOAD_TIMEOUT_MS = 12000;

export const BOOKMARKS_KEY = 'lumina-browser-bookmarks';
export const HISTORY_KEY = 'lumina-browser-history';

// The two shipped products that are live AND verified frameable (200, no X-Frame-Options, no CSP
// `frame-ancestors`) lead, so the first thing on the start page is real work. They are the same
// URLs the Projects app's "Live" buttons hand to `openBrowser` — see `src/config/projects.js`.
export const DEFAULT_BOOKMARKS = [
  { title: 'WorkLeisure', url: 'https://www.workleisure.in' },
  { title: 'Winndo', url: 'https://www.winndo.com' },
  { title: 'Wikipedia', url: 'https://en.m.wikipedia.org/wiki/Main_Page' },
  { title: 'Excalidraw', url: 'https://excalidraw.com/' },
  { title: 'Can I Use', url: 'https://caniuse.com/' },
];

/**
 * Sites that refuse framing (X-Frame-Options / frame-ancestors), kept as parsed-URL rules rather
 * than the old substring test — `github.com.evil.com` used to match "github.com" and
 * `notx.company` matched "x.com". A bare domain matches the hostname and its subdomains; an entry
 * containing "/" additionally requires the path prefix, so google.com/search is caught while
 * google.com/maps is not.
 */
export const BLOCKED_PATTERNS = [
  'github.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'netflix.com',
  'google.com/search',
];

/** Hostname for http(s) URLs only — the favicon service and history rows must never be handed
 *  the "start" authority that `new URL('lumina://start')` happily parses out. */
export function hostOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.hostname;
  } catch {
    return '';
  }
}

export function isBlockedUrl(url) {
  if (!url || url === START_URL) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  // Measured 2026-09-10: google.com/search WITH `igu=1` answers 200 carrying neither
  // X-Frame-Options nor a `frame-ancestors` directive — the embed parameter still works, and it
  // is the only search URL this app generates (resolveInput appends it). WITHOUT the parameter
  // Google sends SAMEORIGIN, so the pattern below stays for hand-typed search URLs: those get
  // the honest splash instead of a silently refused frame. Without this carve-out the address
  // bar's own searches landed on the block splash — the one thing the resolve heuristic and the
  // block list, both individually correct, must not do together.
  if (
    (host === 'google.com' || host.endsWith('.google.com'))
    && parsed.pathname.startsWith('/search')
    && parsed.searchParams.get('igu') === '1'
  ) {
    return false;
  }
  return BLOCKED_PATTERNS.some((pattern) => {
    const [domain, ...pathParts] = pattern.split('/');
    if (host !== domain && !host.endsWith('.' + domain)) return false;
    if (pathParts.length === 0) return true;
    return parsed.pathname.startsWith('/' + pathParts.join('/'));
  });
}

/**
 * The address-bar heuristic, unchanged from the original app: something with a dot and no space
 * is a site, everything else is a Google search. `igu=1` is the embed-friendly search parameter
 * the first version shipped with.
 */
export function resolveInput(raw) {
  const q = (raw ?? '').trim();
  if (!q) return null;
  if (q === START_URL) return START_URL;
  if (q.startsWith('http')) return q;
  if (q.includes('.') && !q.includes(' ')) return 'https://' + q;
  return 'https://www.google.com/search?q=' + encodeURIComponent(q) + '&igu=1';
}

/** True when the URL should drive an iframe load: the start page renders in React and a blocked
 *  page renders the splash, so neither ever produces a `load` event to clear a spinner. */
export function shouldLoad(url) {
  return url !== START_URL && !isBlockedUrl(url);
}

/** What the address bar shows — the start page presents as an empty field, not its pseudo-URL. */
export function displayInput(url) {
  return url === START_URL ? '' : url;
}

let idCounter = 0;
function newTabId() {
  // crypto.randomUUID exists everywhere this runs (browsers + Node 18); the counter is only a
  // paranoid fallback for exotic embeds.
  return globalThis.crypto?.randomUUID?.() ?? `tab-${++idCounter}`;
}

/**
 * A tab. `historyStack`/`historyIndex` track chrome-initiated navigations only: link clicks
 * INSIDE the cross-origin iframe are invisible to us (the sandbox has no bridge and same-origin
 * policy hides the frame's location), so Back/Forward walk what the toolbar committed — the same
 * honest limitation the old single-frame version had, now stated. `reloadKey` participates in the
 * iframe's React key; bumping it is how reload (and re-committing the current URL) forces a
 * remount, since assigning an identical `src` is a DOM no-op.
 */
export function makeTab(url = START_URL) {
  return {
    id: newTabId(),
    input: displayInput(url),
    url,
    loading: shouldLoad(url),
    historyStack: [url],
    historyIndex: 0,
    reloadKey: 0,
  };
}

export const canGoBack = (tab) => tab.historyIndex > 0;
export const canGoForward = (tab) => tab.historyIndex < tab.historyStack.length - 1;

/**
 * Commit a navigation: truncate any forward entries, then push. Re-committing the address already
 * on screen is treated as a reload (key bump) rather than a history push — it keeps Enter-on-the-
 * same-URL useful and keeps the stack free of adjacent duplicates, which would otherwise make a
 * Back step a visual no-op.
 */
export function navigateTabState(tab, url) {
  const loading = shouldLoad(url);
  if (url === tab.url) {
    return { ...tab, input: displayInput(url), loading, reloadKey: tab.reloadKey + 1 };
  }
  const historyStack = [...tab.historyStack.slice(0, tab.historyIndex + 1), url];
  return {
    ...tab,
    url,
    input: displayInput(url),
    loading,
    historyStack,
    historyIndex: historyStack.length - 1,
  };
}

export function backTabState(tab) {
  if (!canGoBack(tab)) return tab;
  const historyIndex = tab.historyIndex - 1;
  const url = tab.historyStack[historyIndex];
  return { ...tab, url, input: displayInput(url), loading: shouldLoad(url), historyIndex };
}

export function forwardTabState(tab) {
  if (!canGoForward(tab)) return tab;
  const historyIndex = tab.historyIndex + 1;
  const url = tab.historyStack[historyIndex];
  return { ...tab, url, input: displayInput(url), loading: shouldLoad(url), historyIndex };
}

/**
 * Persisted-history reducer: newest first, consecutive duplicates collapsed, hard cap. Only real
 * web URLs are recorded — the start page and parse failures are not visits.
 */
export function pushHistoryEntry(list, url, now = Date.now()) {
  const host = hostOf(url);
  if (!host) return list;
  if (list[0]?.url === url) return list;
  return [{ url, host, ts: now }, ...list].slice(0, HISTORY_CAP);
}

export function relativeTime(ts, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── localStorage stores ─────────────────────────────────────────────────────────────────────
 * Read once into state at mount; written back by Browser.jsx's state→storage sync effects —
 * never from inside a setState updater, where StrictMode's double invocation would run the
 * write twice (tasks/lessons.md). The `typeof` guard keeps this module importable by the Node
 * harness. */

function readStore(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota: the session keeps working, it just won't survive a reload.
  }
}

/** Seeded with the defaults only while the key is absent — an explicitly emptied list stays
 *  empty rather than resurrecting the seed on the next launch. */
export function loadBookmarks() {
  return readStore(BOOKMARKS_KEY, DEFAULT_BOOKMARKS).filter(
    (b) => b && typeof b.url === 'string' && typeof b.title === 'string'
  );
}

export function saveBookmarks(list) {
  writeStore(BOOKMARKS_KEY, list);
}

export function loadHistory() {
  return readStore(HISTORY_KEY, []).filter((e) => e && typeof e.url === 'string');
}

export function saveHistory(list) {
  writeStore(HISTORY_KEY, list);
}
