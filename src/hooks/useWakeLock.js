import { useEffect, useState } from 'react';

/**
 * Screen Wake Lock, shared status. A tiny module-level store so Settings → Compatibility can say
 * what is happening right now without owning a lock itself.
 *
 *   getWakeLockStatus() → { state: 'idle' | 'held' | 'released' | 'blocked', owner, error }
 *   subscribeWakeLock(listener) → unsubscribe
 *
 * `held` wins while any owner holds a sentinel (owner = the most recent holder). Otherwise the last
 * failure reads `blocked` (for example NotAllowedError under a battery saver), and a lock that was
 * held and let go reads `released`.
 */
const holders = new Map(); // sentinel → owner, in acquisition order
const listeners = new Set();
let lastError = null;
let everHeld = false;
let status = Object.freeze({ state: 'idle', owner: null, error: null });

function publish() {
  const owners = [...holders.values()];
  let next;
  if (owners.length) next = { state: 'held', owner: owners[owners.length - 1], error: null };
  else if (lastError) next = { state: 'blocked', owner: null, error: lastError };
  else if (everHeld) next = { state: 'released', owner: null, error: null };
  else next = { state: 'idle', owner: null, error: null };
  if (next.state === status.state && next.owner === status.owner && next.error === status.error) return;
  status = Object.freeze(next);
  for (const l of [...listeners]) {
    try { l(); } catch { /* one bad listener must not starve the rest */ }
  }
}

export const getWakeLockStatus = () => status;

export function subscribeWakeLock(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * useWakeLock(active, owner) → { held, error }
 *
 * Keeps the screen awake while `active` and the document is visible. The browser drops the lock
 * whenever the page is hidden, so it is re-requested on `visibilitychange`. Released when inactive or
 * unmounted; a request that resolves after `active` flipped (or after unmount) is released at once.
 * State is only ever set from promise and event callbacks.
 */
export default function useWakeLock(active, owner) {
  const [held, setHeld] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const wakeLock = typeof navigator === 'undefined' ? undefined : navigator.wakeLock;
    if (!active || typeof wakeLock?.request !== 'function') return undefined;

    let disposed = false;
    let sentinel = null;
    let pending = false;

    const acquire = () => {
      if (disposed || sentinel || pending || document.visibilityState !== 'visible') return;
      pending = true;
      wakeLock.request('screen').then(
        (s) => {
          pending = false;
          if (disposed) {
            // The race: `active` flipped (or the component unmounted) while the request was out.
            s.release().catch(() => {});
            return;
          }
          sentinel = s;
          holders.set(s, owner);
          everHeld = true;
          lastError = null;
          publish();
          setHeld(true);
          setError(null);
          s.addEventListener('release', () => {
            holders.delete(s);
            publish();
            if (sentinel === s) sentinel = null;
            if (!disposed) setHeld(false);
          });
        },
        (err) => {
          pending = false;
          lastError = err?.name ?? 'Error';
          publish();
          if (!disposed) {
            setHeld(false);
            setError(lastError);
          }
        },
      );
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel) {
        const s = sentinel;
        sentinel = null;
        s.release().catch(() => {});
      }
    };
  }, [active, owner]);

  return { held: active && held, error: active ? error : null };
}
