import useOSStore from '../store/osStore';
import { osAlert } from '../utils/dialog';
import { describeBrowser } from './browser.js';

/**
 * Raise the Compatibility notice for `id` as a system dialog. For one-off actions (a button that
 * can't do its job here); persistent surfaces render <CapabilityNotice> in place instead.
 *
 * Dialogs render in the MAIN window. If the action came from content that lives in a popped-out
 * window (`fromEl` belongs to another document), that window is popped back in first so the notice
 * never lands in a main window the user can't currently see.
 *
 * `kind` is 'unsupported', 'denied' (a site permission is off) or 'refused' (the browser turned this
 * request down; pass the error's name as `errName`).
 *
 * notice.js (and the positions prose behind it) is loaded on demand, so eager callers of this helper
 * don't carry notice text in the first paint.
 */
export async function notifyUnavailable(id, { kind = 'unsupported', fromEl, errName } = {}) {
  if (fromEl && typeof document !== 'undefined' && fromEl.ownerDocument && fromEl.ownerDocument !== document) {
    const windowId = fromEl.closest?.('[data-window-id]')?.getAttribute('data-window-id');
    if (windowId) useOSStore.getState().popInWindow?.(windowId);
  }
  let buildNotice;
  try {
    ({ buildNotice } = await import('./notice.js'));
  } catch (err) {
    // Chunk failed to load (offline, or a stale hash after a deploy). Never leave the button
    // silently dead, and never improvise notice prose here: notice.js owns that text.
    console.error('Compatibility notice failed to load:', err);
    return osAlert({ tone: 'warn', title: `Couldn't open the compatibility notice (${err?.name ?? 'Error'}). Try again.` });
  }
  return osAlert(buildNotice(id, describeBrowser(), kind, { errName }));
}
