import { get, set, del } from 'idb-keyval';

/**
 * The persist storage adapter, with the write side throttled.
 *
 * zustand's `persist` middleware has no write diffing: `api.setState` is wrapped so that EVERY
 * `set()` anywhere in the store runs `partialize` over the whole state and hands the result to
 * `storage.setItem` (zustand/middleware.js, `setItem` inside `persistImpl`). Nothing checks whether
 * a persisted key actually changed. Measured on this checkout: ten calls to `setMusicCurrentTime`
 * produced ten IndexedDB puts of 44,664 bytes each — so a playing track was ~150 MB/hour of
 * structured-clone + IDB traffic to persist a number that is thrown away on reload anyway.
 *
 * The fix that covers every such caller at once lives here rather than in each of them: writes
 * are coalesced to at most one per `PERSIST_WRITE_MS`, always carrying the LATEST payload
 * (trailing throttle, not a leading one — the last state of a burst is the one that must land).
 *
 * The one thing a deferred write can lose is the final burst before the page goes away, so the
 * pending write is flushed synchronously on `pagehide` and on `visibilitychange → hidden`. Reads
 * and removes are untouched.
 */
export const PERSIST_WRITE_MS = 750;

/**
 * @param {{ setItem: Function, getItem: Function, removeItem: Function }} backend
 * @param {number} delayMs
 * @returns {{ storage: object, flush: () => (Promise|undefined) }}
 */
export function createThrottledStorage(backend, delayMs = PERSIST_WRITE_MS) {
  let pending = null; // { name, value }
  let timer = null;

  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!pending) return undefined;
    const { name, value } = pending;
    pending = null;
    return backend.setItem(name, value);
  };

  const storage = {
    getItem: (name) => backend.getItem(name),
    setItem: (name, value) => {
      pending = { name, value };
      if (!timer) timer = setTimeout(flush, delayMs);
    },
    removeItem: (name) => {
      // A remove must not be overtaken by a stale pending write of the same key.
      if (pending?.name === name) { pending = null; }
      return backend.removeItem(name);
    },
  };

  return { storage, flush };
}

const idbBackend = {
  getItem: async (name) => (await get(name)) || null,
  setItem: (name, value) => set(name, value),
  removeItem: (name) => del(name),
};

const { storage, flush } = createThrottledStorage(idbBackend);

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/** Force the pending write out now. Exposed for tests and for anything that must not lose state. */
export const flushPersist = flush;

export default storage;
