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

const navigate = (search, { replace = false } = {}) => {
  window.history[replace ? 'replaceState' : 'pushState'](null, '', `${window.location.pathname}${search}${window.location.hash}`);
  window.dispatchEvent(new Event(NAV_EVENT));
};

/** Enter from the desktop: the URL becomes the Plash URL, so the browser shows exactly what Plash will. */
export const enterWallpaperMode = (prefs, appearance) => navigate(buildWallpaperSearch(prefs, appearance));

/** Inside Plash, `?mode=desktop` is needed to beat the class detection; elsewhere a clean URL is enough. */
export const exitWallpaperMode = () =>
  navigate(document.documentElement.classList.contains(PLASH_CLASS) ? '?mode=desktop' : '');

/**
 * Open one of Lumina's apps as a window over the wallpaper, without leaving wallpaper mode. Plash's
 * view has no session, so it signs in as a guest first — the same as the login screen's "Enter as
 * Guest". A window already open (perhaps minimized) comes to the front instead.
 */
export const openLuminaApp = (id) => {
  const s = useOSStore.getState();
  if (!s.isAuthenticated) s.login('guest');
  if (s.openWindows.includes(id)) s.focusWindow(id);
  else s.openWindow(id);
};

/** Settings, on its Wallpaper mode pane, as a window over the wallpaper. */
export const openWallpaperSettings = () => {
  const s = useOSStore.getState();
  if (!s.isAuthenticated) s.login('guest');
  s.openSettingsTab('wallpaper');
};

/**
 * Settings edits made while the wallpaper is showing land in the URL, which is what the wallpaper
 * reads. Replaced rather than pushed, so Back still leaves the mode. In Plash the change lasts until
 * a reload unless saved with Plash's own "Update Website to Current".
 */
export const replaceWallpaperSearch = (search) => {
  if (search !== window.location.search) navigate(search, { replace: true });
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
