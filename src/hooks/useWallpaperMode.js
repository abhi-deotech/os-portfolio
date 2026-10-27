import { useMemo, useSyncExternalStore } from 'react';
import useOSStore from '../store/osStore';
import { PLASH_CLASS, PLASH_BROWSING_CLASS, readWallpaperMode, buildWallpaperSearch } from '../wallpaper/config';

/**
 * Wallpaper mode lives in the URL (see src/wallpaper/config.js for why), so this hook is a
 * subscription to three external facts: `location.search`, whether Plash has stamped its class on
 * <html>, and whether Plash's Browsing Mode (the only time a click reaches the page) is on. The classes
 * arrive and change after load, so a MutationObserver watches them rather than a one-time read.
 */
const NAV_EVENT = 'lumina:navigate';

const snapshot = () => {
  const c = document.documentElement.classList;
  return `${window.location.search}|${c.contains(PLASH_CLASS) ? 1 : 0}${c.contains(PLASH_BROWSING_CLASS) ? 1 : 0}`;
};

function subscribe(onChange) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAV_EVENT, onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAV_EVENT, onChange);
    observer.disconnect();
  };
}

const navigate = (search) => {
  window.history.pushState(null, '', `${window.location.pathname}${search}${window.location.hash}`);
  window.dispatchEvent(new Event(NAV_EVENT));
};

/** Enter from the desktop: the URL becomes the Plash URL, so the browser shows exactly what Plash will. */
export const enterWallpaperMode = (prefs, appearance) => navigate(buildWallpaperSearch(prefs, appearance));

/** Inside Plash, `?mode=desktop` is needed to beat the class detection; elsewhere a clean URL is enough. */
export const exitWallpaperMode = () =>
  navigate(document.documentElement.classList.contains(PLASH_CLASS) ? '?mode=desktop' : '');

/**
 * Leave wallpaper mode straight into one of Lumina's apps. Plash's view has no session, so it signs in
 * as a guest — the same as the login screen's "Enter as Guest" — and App skips the boot sequence.
 */
export const openLuminaApp = (id) => {
  const s = useOSStore.getState();
  if (!s.isAuthenticated) s.login('guest');
  s.openWindow(id);
  exitWallpaperMode();
};

/** @returns {{ active: boolean, plash: boolean, interactive?: boolean, prefs?: object, theme?: object }} */
export default function useWallpaperMode() {
  const key = useSyncExternalStore(subscribe, snapshot);
  return useMemo(() => {
    const cut = key.lastIndexOf('|'); // a hand-typed query can contain '|' itself
    const flags = key.slice(cut + 1);
    return readWallpaperMode(key.slice(0, cut), flags[0] === '1', flags[1] === '1');
  }, [key]);
}
