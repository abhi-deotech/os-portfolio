import { useEffect } from 'react';
import useOSStore from '../store/osStore';

/**
 * Immersive mode: the whole page fullscreen, plus a keyboard lock where the browser has one, so a
 * tapped Esc or app-switching shortcut stays inside Lumina (holding Esc still exits; the browser
 * guarantees that).
 *
 * Control and KeyK are deliberately NOT locked, so Ctrl/Cmd+K Spotlight keeps working.
 */
export const IMMERSIVE_LOCK_KEYS = Object.freeze(['Escape', 'Tab', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);

// Platform-neutral: the app-switching shortcut is Alt+Tab on Windows and Linux, Cmd+Tab on macOS.
const toastTitle = (browser) => `Esc and app switching will leave immersive mode in ${browser?.name ?? 'this browser'}`;

/**
 * Mount ONCE (App.jsx). The store's `isImmersive` follows `fullscreenchange`, never the click that
 * asked for it, so a refused request can't light the tile. Only the document element turns it on:
 * the MediaPlayer taking its own fullscreen is not immersive mode. Fullscreen stacks, though, so a
 * player going fullscreen ON TOP of immersive mode keeps it on (the page is still fullscreen
 * underneath), and the keyboard lock is dropped only once fullscreen has fully ended, by any route
 * (Esc held, the browser's own UI).
 */
export function useImmersiveSync() {
  const setIsImmersive = useOSStore((s) => s.setIsImmersive);
  const isAuthenticated = useOSStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onChange = () => {
      const el = document.fullscreenElement;
      const prev = useOSStore.getState().isImmersive;
      const on = el === document.documentElement || (prev && el != null);
      setIsImmersive(on);
      if (!el) {
        try { navigator.keyboard?.unlock?.(); } catch { /* nothing was locked */ }
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [setIsImmersive]);

  // Signing out resets isImmersive (WINDOW_SESSION_RESET) but can't leave fullscreen by itself, so
  // leave it here: the resulting fullscreenchange keeps the store and the page in step.
  useEffect(() => {
    if (isAuthenticated || typeof document === 'undefined') return;
    if (document.fullscreenElement === document.documentElement) exitImmersive();
  }, [isAuthenticated]);
}

/**
 * Call directly from the click handler: requestFullscreen needs the user gesture, and it is made
 * synchronously, before this function's first await.
 *
 *   keyboardLock  useCapability('keyboardLock') result
 *   browser       describeBrowser() result (words the toast)
 *   coarse        (pointer: coarse) — no hardware Esc or app-switching keys to warn about, so no toast
 *
 * Resolves { ok: true } once fullscreen is on, or { ok: false, error } when the browser refused it.
 */
export async function enterImmersive({ keyboardLock, browser, coarse = false } = {}) {
  let request;
  try {
    request = document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch (error) {
    return { ok: false, error };
  }
  try {
    await request;
  } catch (error) {
    return { ok: false, error };
  }

  const { pushToast } = useOSStore.getState();
  if (keyboardLock?.available) {
    try {
      await navigator.keyboard.lock([...IMMERSIVE_LOCK_KEYS]);
    } catch (err) {
      // Fullscreen stays; only the lock is missing, and the visitor is told so.
      pushToast({
        kicker: 'Immersive',
        title: toastTitle(browser),
        desc: `The browser refused the keyboard lock (${err?.name ?? 'Error'}).`,
        urgent: true,
      });
    }
  } else if (!coarse) {
    // notice.js is the only place the reason is worded; loaded on demand so the Control Center's
    // first paint doesn't carry it.
    let desc;
    try {
      const { buildNotice } = await import('../capabilities/notice.js');
      // Supported but not available means the site's permission is blocked, not a missing API.
      // The title names the feature; `why` alone says only "it".
      const n = buildNotice('keyboardLock', browser, keyboardLock?.supported ? 'denied' : 'unsupported');
      desc = `${n.title} ${n.why}`;
    } catch (err) {
      console.error('Compatibility notice failed to load:', err);
    }
    pushToast({ kicker: 'Immersive', title: toastTitle(browser), desc, urgent: true });
  }
  return { ok: true };
}

/** Leave immersive mode: drop the keyboard lock, then fullscreen. */
export async function exitImmersive() {
  try { navigator.keyboard?.unlock?.(); } catch { /* nothing was locked */ }
  if (typeof document !== 'undefined' && document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      /* already left (Esc raced the click) */
    }
  }
}
