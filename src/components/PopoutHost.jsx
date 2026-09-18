import { useEffect, useLayoutEffect } from 'react';
import useOSStore from '../store/osStore';
import { getPopout, notifyPopoutActivity } from '../utils/popout.js';
import {
  THEME_ATTRS, bootstrapDocument, copyThemeState, preserveMediaState, syncSheets,
} from '../utils/popoutDom.js';
import { windowTitle } from '../config/windowTitle.js';

/**
 * The stand-in WindowSlot renders while window `id` lives in a second browser window. It renders
 * nothing itself: it MOVES the window's DOM host (whose content React keeps portaling into) into the
 * popup's document, keeps that document themed and styled like the main one, and docks the window
 * again when the popup closes.
 *
 * Moving the host instead of re-portaling is what keeps React state, refs and canvases alive: a
 * portal whose container changes remounts. React's listeners live on the portal container itself, so
 * events inside the popup still reach the app.
 *
 * StrictMode runs layout effects setup → cleanup → setup. Setup is idempotent (adopting into the
 * window that already holds the host does nothing) and cleanup NEVER closes the window: closing is
 * the store's job (closeWindow / popInWindow / sign-out call closePopout after their `set()`).
 *
 * Known limits (by design, not bugs to chase):
 *  - Ctrl/Cmd+K (Spotlight) and Alt+Arrow (snapping) listen on the main window, so they don't see keys
 *    typed in a popup.
 *  - requestAnimationFrame and ResizeObserver callbacks follow the MAIN window's rendering, so a
 *    popped-out canvas or measured layout can stall while the main tab is hidden.
 *  - framer-motion press gestures listen for `pointerup` on the main window, so `whileTap` can stick.
 *  - useIsMobile and useWindowVisibility read the main window (its size, its visibility).
 *  - Dialogs render in the main window: notifyUnavailable pops the window back in first.
 *  - Media survives the move only in Document Picture-in-Picture; a popup or frame reloads it, so its
 *    position and play state are restored on `loadedmetadata`.
 */

let parking = null;

/** A hidden node in the main document that holds a host between its popup closing and re-docking. */
function park(hostEl, mode) {
  if (typeof document === 'undefined') return;
  if (!parking || !parking.isConnected) {
    parking = document.createElement('div');
    parking.setAttribute('hidden', '');
    parking.setAttribute('data-popout-parking', '');
    document.body.appendChild(parking);
  }
  if (hostEl.parentNode === parking) return;
  if (mode !== 'pip') preserveMediaState(hostEl);
  parking.appendChild(hostEl);
}

export default function PopoutHost({ id, hostEl }) {
  const title = windowTitle(id);
  const isActive = useOSStore((s) => s.activeWindow === id);

  // Layout effect: the host is adopted in the same synchronous commit that unmounted the docked
  // Window, before the next microtask checkpoint, so detached media never gets paused.
  useLayoutEffect(() => {
    const entry = getPopout(id);
    const win = entry?.win;
    if (!win || win.closed) {
      // The popup closed before this mounted (or was never opened): dock the window again.
      park(hostEl, entry?.mode);
      useOSStore.getState().popInWindow(id);
      return undefined;
    }

    const doc = win.document;
    const main = document;
    bootstrapDocument(doc, { title, baseHref: `${window.location.origin}/`, lang: main.documentElement.lang || 'en' });
    copyThemeState(main.documentElement, doc.documentElement);
    syncSheets(main, doc);
    if (hostEl.parentNode !== doc.body) {
      if (entry.mode !== 'pip') preserveMediaState(hostEl);
      doc.body.appendChild(hostEl);
    }

    const themeObserver = new MutationObserver(() => copyThemeState(main.documentElement, doc.documentElement));
    themeObserver.observe(main.documentElement, { attributes: true, attributeFilter: [...THEME_ATTRS, 'style'] });
    // characterData too: Vite HMR rewrites a <style>'s text in place.
    const sheetObserver = new MutationObserver(() => syncSheets(main, doc));
    sheetObserver.observe(main.head, { childList: true, subtree: true, characterData: true });

    const onPageHide = () => {
      park(hostEl, entry.mode);
      useOSStore.getState().popInWindow(id);
    };
    const onActivity = (e) => notifyPopoutActivity(e);
    const onMouseDown = () => useOSStore.getState().focusWindow(id);
    win.addEventListener('pagehide', onPageHide);
    win.addEventListener('mousemove', onActivity, { passive: true });
    win.addEventListener('keydown', onActivity, { passive: true });
    hostEl.addEventListener('mousedown', onMouseDown);

    return () => {
      themeObserver.disconnect();
      sheetObserver.disconnect();
      win.removeEventListener('pagehide', onPageHide);
      win.removeEventListener('mousemove', onActivity);
      win.removeEventListener('keydown', onActivity);
      hostEl.removeEventListener('mousedown', onMouseDown);
      // Park only once the popup is really gone (the store forgot it, or it closed). StrictMode's
      // cleanup between two setups finds it still registered and leaves the host where it is, so
      // media isn't moved (and reloaded) twice. Never close the window here.
      const current = getPopout(id);
      if (!current || current.win !== win || win.closed) park(hostEl, entry.mode);
    };
  }, [id, hostEl, title]);

  useEffect(() => {
    if (!isActive) return;
    try {
      getPopout(id)?.win?.focus();
    } catch { /* closed between the store update and this effect */ }
  }, [isActive, id]);

  return null;
}
