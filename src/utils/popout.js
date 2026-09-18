import { isSupported } from '../capabilities/support.js';
import { osAlert } from './dialog.js';

/**
 * The registry of popped-out windows: which app lives in which second browser window.
 *
 * This module must NOT import the store. windowSlice imports it (closeWindow / popInWindow / logout
 * close the popup after their `set()`), so a store import here would be a cycle. dialog.js does reach
 * the store, but only inside osAlert at call time, so that static cycle is harmless; it is already in
 * the first paint (App, Window, notify), and a dynamic import would only split it into an extra
 * preloaded chunk.
 *
 *   getPopout(id)         → { win, mode } | undefined     mode: 'pip' | 'popup' | 'frame'
 *   openPopout(id, opts)  → Promise<{ win, mode } | null> — call it straight from the click handler
 *   closePopout(id)       closes and forgets one
 *   closeAllPopouts()     closes every one; also runs on the main window's `pagehide`
 *   onPopoutActivity(cb)  → unsubscribe; pointer/key activity inside any popout (screensaver timer)
 *
 * The caller calls the store's `popOutWindow(id, mode)` once `openPopout` resolves with a window.
 */

/**
 * window.open features for a popup of `geom` ({ width, height, left?, top? }). Lives here rather than
 * in popoutDom.js so this eager module doesn't pull popoutDom (and PopoutHost's chunk with it) into
 * the first paint.
 */
export function popupFeatures({ width, height, left, top } = {}) {
  const parts = ['popup=yes'];
  for (const [name, value] of [['width', width], ['height', height], ['left', left], ['top', top]]) {
    if (Number.isFinite(value)) parts.push(`${name}=${Math.round(value)}`);
  }
  return parts.join(',');
}

const registry = new Map();
const activity = new Set();
let boundPageHide = false;

export const getPopout = (id) => registry.get(id);

const pipIsRegistered = () => [...registry.values()].some((e) => e.mode === 'pip');

export function closePopout(id) {
  const entry = registry.get(id);
  if (!entry) return;
  registry.delete(id);
  try {
    if (entry.frame) entry.frame.remove();
    else if (!entry.win.closed) entry.win.close();
  } catch { /* already gone */ }
}

/**
 * The id of a popped-out window whose document has focus, or null. SystemDialog renders only in the
 * main window, so a dialog raised from popped-out content (Settings → Reset, a share error) would
 * otherwise open out of sight: utils/dialog.js docks that window first.
 */
export function focusedPopoutId() {
  for (const [id, entry] of registry) {
    try {
      const doc = entry.frame ? entry.frame.contentDocument : entry.win?.document;
      if (doc && !entry.win?.closed && doc.hasFocus()) return id;
    } catch { /* closing, or not yet navigable */ }
  }
  return null;
}

export function closeAllPopouts() {
  for (const id of [...registry.keys()]) closePopout(id);
}

export function onPopoutActivity(cb) {
  activity.add(cb);
  return () => activity.delete(cb);
}

/** PopoutHost reports pointer and key activity in its window through this. */
export function notifyPopoutActivity(event) {
  for (const cb of [...activity]) {
    try { cb(event); } catch { /* one listener must not starve the rest */ }
  }
}

async function warn(title) {
  try {
    await osAlert({ tone: 'warn', title });
  } catch (err) {
    console.error(title, err);
  }
}

function register(id, entry) {
  registry.set(id, entry);
  if (!boundPageHide && typeof window !== 'undefined') {
    boundPageHide = true;
    window.addEventListener('pagehide', closeAllPopouts);
  }
  return entry;
}

/** DEV probes only (?popout=frame): an iframe is a second document that a hidden preview can drive. */
function wantsFrame() {
  if (!import.meta.env?.DEV || typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('popout') === 'frame';
  } catch {
    return false;
  }
}

/**
 * Open a second window for app `id`. Both browser APIs need the click's user activation, so this is
 * called directly from the click handler and opens synchronously:
 *
 *  - Document Picture-in-Picture (floats above other windows) when available, no placement was asked
 *    for, and no PiP window is registered — a page can own only one.
 *  - Otherwise `window.open`, called before any await. A rejected `requestWindow` does NOT fall back
 *    to `window.open` afterwards: the activation is spent by then, so it says so and stays docked.
 *
 * @param {string} id
 * @param {{ title?: string, width?: number, height?: number,
 *           placement?: { left: number, top: number } }} opts  placement → a popup on that screen
 */
export function openPopout(id, { title = 'Lumina', width = 900, height = 650, placement } = {}) {
  const existing = registry.get(id);
  if (existing && !existing.win?.closed) {
    try { existing.win.focus(); } catch { /* ignore */ }
    return Promise.resolve(existing);
  }
  if (existing) registry.delete(id);

  if (wantsFrame()) {
    const frame = document.createElement('iframe');
    frame.setAttribute('title', `${title} (pop-out probe)`);
    frame.setAttribute('data-popout-frame', id);
    frame.setAttribute('style', `position:fixed;right:8px;bottom:8px;width:${width / 2}px;height:${height / 2}px;z-index:5000;border:1px solid`);
    document.body.appendChild(frame);
    return Promise.resolve(register(id, { win: frame.contentWindow, mode: 'frame', frame }));
  }

  const pip = typeof window !== 'undefined' ? window.documentPictureInPicture : undefined;
  if (!placement && pip && isSupported('documentPip') && !pipIsRegistered() && !pip.window) {
    let request;
    try {
      request = pip.requestWindow({ width, height });
    } catch (err) {
      request = Promise.reject(err);
    }
    return request.then(
      (win) => register(id, { win, mode: 'pip' }),
      (err) => {
        warn(`Couldn't open a floating window (${err?.name ?? 'Error'}). Try again.`);
        return null;
      },
    );
  }

  const win = window.open('', '_blank', popupFeatures({ width, height, left: placement?.left, top: placement?.top }));
  if (!win) {
    warn('Pop-ups are blocked for this site');
    return Promise.resolve(null);
  }
  return Promise.resolve(register(id, { win, mode: 'popup' }));
}
