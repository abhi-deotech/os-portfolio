/**
 * Capability registry — the one place Lumina records what a browser can and cannot do for it.
 *
 * PURE: no React, no store, no `import.meta.env`. Plain Node imports this (scripts/capabilities-check.mjs),
 * so every relative import must carry an explicit `.js` extension and reach only other pure modules.
 *
 * Policy (tasks/integrations-catalog.md §1): detect the FEATURE, never the browser. The browser's
 * name is used only to word notices, in notice.js, which is the only place notice text is written.
 *
 * Entry shape:
 *   id, label, group
 *   detect({ win, nav, doc }) → boolean. Must never throw, including on `{}`.
 *   globals    paths that implement the feature, for masking (devMask.js, the harness). The first
 *              segment is `window` (for [Global] members, which live on the window object itself) or
 *              `<Interface>.prototype` — NEVER `Window.prototype`.
 *   engines    { chromium, edge?, firefox, safari } minimum version, or null. `edge` only when it
 *              differs from chromium.
 *   tier       'universal' | 'two-engine' | 'chromium' — must equal tierOf(engines)
 *   fallback   'complete' | 'partial' | 'none' — complete ⇒ no notice needed, no vendor URL required
 *   permissionName?, request?({ win, nav, doc }), settingsTab?, usedBy
 *
 * The prose for each entry (vendor positions, MDN link, `instead`, caveat, verifiedOn) lives in
 * positions.js, keyed by id. It is kept out of this module because the first paint reaches it
 * (facts.js → support.js → registry.js) and never needs that text.
 */

export const GROUPS = [
  { id: 'files', label: 'Files & storage' },
  { id: 'facts', label: 'System facts' },
  { id: 'media', label: 'Media & sharing' },
  { id: 'windows', label: 'Windows & input' },
];

// Nothing at module scope is a call: src/main.jsx imports this (through devMask.js) before anything
// else, and a top-level call would make the bundler keep the whole registry in the entry chunk even
// though production never uses it there.

const fn = (v) => typeof v === 'function';

export const CAPABILITIES = [
  /* ── Files & storage ─────────────────────────────────────────────────────────────────────── */
  {
    id: 'fileSystemAccess',
    label: 'Local folder and file access',
    group: 'files',
    detect: ({ win } = {}) => fn(win?.showDirectoryPicker),
    globals: ['window.showDirectoryPicker', 'window.showOpenFilePicker', 'window.showSaveFilePicker'],
    engines: { chromium: 86, firefox: null, safari: null },
    tier: 'chromium',
    fallback: 'none',
    usedBy: ['files'],
  },
  {
    id: 'storageEstimate',
    label: 'Storage usage',
    group: 'files',
    detect: ({ nav } = {}) => fn(nav?.storage?.estimate),
    globals: ['StorageManager.prototype.estimate'],
    engines: { chromium: 61, firefox: 57, safari: 17 },
    tier: 'universal',
    fallback: 'none',
    usedBy: ['facts'],
  },
  {
    id: 'persistentStorage',
    label: 'Eviction-protected storage',
    group: 'files',
    detect: ({ nav } = {}) => fn(nav?.storage?.persist),
    globals: ['StorageManager.prototype.persist', 'StorageManager.prototype.persisted'],
    engines: { chromium: 55, firefox: 57, safari: 15.2 },
    tier: 'universal',
    fallback: 'none',
    permissionName: 'persistent-storage',
    request: ({ nav } = {}) => nav.storage.persist(),
    usedBy: ['files'],
  },

  /* ── System facts ────────────────────────────────────────────────────────────────────────── */
  {
    id: 'computePressure',
    label: 'CPU pressure',
    group: 'facts',
    detect: ({ win } = {}) => fn(win?.PressureObserver),
    globals: ['window.PressureObserver'],
    engines: { chromium: 125, firefox: null, safari: null },
    tier: 'chromium',
    fallback: 'partial',
    usedBy: ['facts'],
  },
  {
    id: 'battery',
    label: 'Battery status',
    group: 'facts',
    detect: ({ nav } = {}) => fn(nav?.getBattery),
    globals: ['Navigator.prototype.getBattery'],
    engines: { chromium: 38, firefox: null, safari: null },
    tier: 'chromium',
    fallback: 'partial',
    usedBy: ['facts'],
  },
  {
    id: 'performanceMemory',
    label: 'JavaScript heap size',
    group: 'facts',
    detect: ({ win } = {}) => !!win?.performance?.memory,
    globals: ['Performance.prototype.memory'],
    engines: { chromium: 7, firefox: null, safari: null },
    tier: 'chromium',
    fallback: 'partial',
    usedBy: ['facts'],
  },
  {
    id: 'deviceMemory',
    label: 'Device memory class',
    group: 'facts',
    detect: ({ nav } = {}) => typeof nav?.deviceMemory === 'number',
    globals: ['Navigator.prototype.deviceMemory'],
    engines: { chromium: 63, firefox: null, safari: null },
    tier: 'chromium',
    fallback: 'partial',
    usedBy: ['facts'],
  },
  {
    id: 'uaClientHints',
    label: 'OS version and architecture',
    group: 'facts',
    detect: ({ nav } = {}) => fn(nav?.userAgentData?.getHighEntropyValues),
    globals: ['Navigator.prototype.userAgentData'],
    engines: { chromium: 90, firefox: null, safari: null },
    tier: 'chromium',
    fallback: 'partial',
    usedBy: ['facts'],
  },
  {
    id: 'networkInformation',
    label: 'Connection speed estimate',
    group: 'facts',
    detect: ({ nav } = {}) => !!nav?.connection && 'effectiveType' in nav.connection,
    globals: ['Navigator.prototype.connection'],
    engines: { chromium: 61, firefox: null, safari: null },
    tier: 'chromium',
    fallback: 'partial',
    usedBy: ['facts'],
  },
  {
    id: 'webgpu',
    label: 'GPU adapter information',
    group: 'facts',
    detect: ({ win, nav } = {}) =>
      fn(nav?.gpu?.requestAdapter) && fn(win?.GPUAdapter) && 'info' in (win.GPUAdapter.prototype ?? {}),
    globals: ['Navigator.prototype.gpu'],
    engines: { chromium: 127, firefox: 141, safari: 26 },
    tier: 'universal',
    fallback: 'none',
    usedBy: ['facts', 'benchmark'],
  },

  /* ── Media & sharing ─────────────────────────────────────────────────────────────────────── */
  {
    id: 'mediaSession',
    label: 'Media key control',
    group: 'media',
    detect: ({ nav } = {}) => !!nav?.mediaSession,
    globals: ['Navigator.prototype.mediaSession'],
    engines: { chromium: 73, firefox: 82, safari: 15 },
    tier: 'universal',
    fallback: 'none',
    usedBy: ['music', 'media'],
  },
  {
    id: 'wakeLock',
    label: 'Keep screen awake',
    group: 'media',
    detect: ({ nav } = {}) => fn(nav?.wakeLock?.request),
    globals: ['Navigator.prototype.wakeLock'],
    engines: { chromium: 84, firefox: 126, safari: 16.4 },
    tier: 'universal',
    fallback: 'none',
    permissionName: 'screen-wake-lock',
    usedBy: ['music', 'media', 'benchmark'],
  },
  {
    id: 'webShare',
    label: 'Native share sheet',
    group: 'media',
    detect: ({ nav } = {}) => fn(nav?.share),
    globals: ['Navigator.prototype.share'],
    engines: { chromium: 89, edge: 93, firefox: null, safari: 12.1 },
    tier: 'two-engine',
    fallback: 'complete',
    usedBy: ['notepad', 'media'],
  },
  {
    id: 'webShareFiles',
    label: 'Share files',
    group: 'media',
    detect: ({ nav } = {}) => fn(nav?.share) && fn(nav?.canShare),
    globals: ['Navigator.prototype.canShare'],
    engines: { chromium: 89, firefox: null, safari: 14 },
    tier: 'two-engine',
    fallback: 'complete',
    usedBy: ['notepad'],
  },

  /* ── Windows & input ─────────────────────────────────────────────────────────────────────── */
  {
    id: 'fullscreen',
    label: 'Fullscreen',
    group: 'windows',
    detect: ({ doc } = {}) => !!doc?.fullscreenEnabled && fn(doc?.documentElement?.requestFullscreen),
    globals: ['Document.prototype.fullscreenEnabled', 'Element.prototype.requestFullscreen'],
    engines: { chromium: 71, firefox: 64, safari: 16.4 },
    tier: 'universal',
    fallback: 'none',
    usedBy: ['immersive', 'media'],
  },
  {
    id: 'idleDetection',
    label: 'System idle detection',
    group: 'windows',
    detect: ({ win } = {}) => fn(win?.IdleDetector),
    globals: ['window.IdleDetector'],
    engines: { chromium: 94, edge: 114, firefox: null, safari: null },
    tier: 'chromium',
    fallback: 'partial',
    permissionName: 'idle-detection',
    request: ({ win } = {}) => win.IdleDetector.requestPermission(),
    settingsTab: 'system',
    usedBy: ['screensaver'],
  },
  {
    id: 'keyboardLock',
    label: 'Keyboard lock in fullscreen',
    group: 'windows',
    detect: ({ nav } = {}) => fn(nav?.keyboard?.lock),
    globals: ['Keyboard.prototype.lock'],
    engines: { chromium: 68, firefox: null, safari: null },
    tier: 'chromium',
    fallback: 'partial',
    permissionName: 'keyboard-lock',
    usedBy: ['immersive'],
  },
  {
    id: 'documentPip',
    label: 'Always-on-top pop-out',
    group: 'windows',
    detect: ({ win } = {}) => !!win?.documentPictureInPicture,
    globals: ['window.documentPictureInPicture'],
    engines: { chromium: 116, firefox: 151, safari: null },
    tier: 'two-engine',
    fallback: 'complete',
    usedBy: ['popout'],
  },
  {
    id: 'windowManagement',
    label: 'Multi-monitor placement',
    group: 'windows',
    detect: ({ win } = {}) => fn(win?.getScreenDetails),
    globals: ['window.getScreenDetails', 'Screen.prototype.isExtended'],
    engines: { chromium: 100, firefox: null, safari: null },
    tier: 'chromium',
    fallback: 'partial',
    permissionName: 'window-management',
    request: ({ win } = {}) => win.getScreenDetails(),
    usedBy: ['popout'],
  },
];

/** The entry for `id`, or undefined. 19 entries: a scan is cheaper than keeping an index alive. */
export const getCapability = (id) => CAPABILITIES.find((c) => c.id === id);

/** Every id whose feature is present in `env`. Never throws. */
export function detect(env = {}) {
  const out = new Set();
  for (const c of CAPABILITIES) {
    try {
      if (c.detect(env ?? {})) out.add(c.id);
    } catch {
      /* a detect that throws is an absent feature */
    }
  }
  return out;
}

/**
 * Resolve a globals path against an env's roots.
 *   'window.X'                 → [env.win, 'X']
 *   '<Interface>.prototype.X'  → [env.win[Interface].prototype, 'X']
 * Returns null when the root is missing.
 */
function resolvePath(env, path) {
  const parts = String(path).split('.');
  if (parts[0] === 'window' && parts.length === 2) {
    return env?.win ? [env.win, parts[1]] : null;
  }
  if (parts.length === 3 && parts[1] === 'prototype' && parts[0] !== 'Window') {
    const proto = env?.win?.[parts[0]]?.prototype;
    return proto ? [proto, parts[2]] : null;
  }
  return null;
}

/**
 * Delete every path in `paths` from the env. Pure with respect to its inputs' identity (it mutates
 * only the objects the env hands it). Never throws. Returns the paths that were actually removed.
 */
export function applyMask(env, paths = []) {
  const removed = [];
  for (const path of paths ?? []) {
    try {
      const hit = resolvePath(env, path);
      if (!hit) continue;
      const [obj, prop] = hit;
      if (!(prop in obj)) continue;
      delete obj[prop];
      if (!(prop in obj)) removed.push(path);
    } catch {
      /* non-configurable or exotic — leave it */
    }
  }
  return removed;
}

/** Globals to delete so the env looks like `browser` ('firefox' | 'safari'), derived from engines. */
export function presetGlobals(browser) {
  if (browser !== 'firefox' && browser !== 'safari') return [];
  return CAPABILITIES.filter((c) => c.engines[browser] == null).flatMap((c) => c.globals);
}
