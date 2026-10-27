import { useMemo, useSyncExternalStore } from 'react';
import { PLASH_CLASS, readWallpaperMode, buildWallpaperSearch } from '../wallpaper/config';

/**
 * Wallpaper mode lives in the URL (see src/wallpaper/config.js for why), so this hook is a
 * subscription to two external facts: `location.search`, and whether Plash has stamped its class on
 * <html>. The class arrives after load, so a MutationObserver watches for it rather than a one-time
 * read at boot.
 */
const NAV_EVENT = 'lumina:navigate';

const snapshot = () =>
  `${window.location.search}|${document.documentElement.classList.contains(PLASH_CLASS) ? 1 : 0}`;

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

/** @returns {{ active: boolean, plash: boolean, prefs?: object, theme?: object }} */
export default function useWallpaperMode() {
  const key = useSyncExternalStore(subscribe, snapshot);
  return useMemo(() => {
    const cut = key.lastIndexOf('|'); // a hand-typed query can contain '|' itself
    return readWallpaperMode(key.slice(0, cut), key.slice(cut + 1) === '1');
  }, [key]);
}
