/**
 * Permission state, shared. One `PermissionStatus` per permission name for the life of the page, so
 * ten rows reading `idle-detection` cost one query and one `change` listener, not ten.
 *
 *   subscribePermission(name, cb) → unsubscribe     cb('granted' | 'denied' | 'prompt' | 'unknown')
 *   refreshPermission(name) → Promise               re-query (after a request; some engines don't
 *                                                    fire `change`); resolves once subscribers have
 *                                                    been told the new state
 *
 * A `TypeError` rejection from `permissions.query` means the NAME isn't queryable in this engine
 * (Safari and `persistent-storage`, for example). That is 'unknown', never 'denied': a notice must not
 * tell someone they blocked something they were never asked about.
 *
 * The callback is always invoked asynchronously, so a subscriber may pass a state setter straight
 * from an effect without setting state synchronously inside that effect.
 */

const entries = new Map();

const normalise = (state) => (state === 'granted' || state === 'denied' || state === 'prompt' ? state : 'unknown');

function emit(entry, state) {
  entry.state = state;
  for (const cb of [...entry.listeners]) {
    try { cb(state); } catch { /* one bad listener must not starve the rest */ }
  }
}

function query(name, entry) {
  const permissions = typeof navigator === 'undefined' ? undefined : navigator.permissions;
  if (!permissions || typeof permissions.query !== 'function') {
    return Promise.resolve().then(() => emit(entry, 'unknown'));
  }
  let pending;
  try {
    pending = permissions.query({ name });
  } catch {
    pending = Promise.reject(new TypeError('query threw'));
  }
  // Only the newest query may write: an older one resolving late must not overwrite a newer state.
  const seq = ++entry.seq;
  return Promise.resolve(pending).then(
    (status) => {
      if (seq !== entry.seq) return;
      if (status && entry.status !== status) {
        // Each query() returns a fresh PermissionStatus; move the one listener rather than stacking.
        if (entry.status && entry.onChange) entry.status.removeEventListener?.('change', entry.onChange);
        entry.status = status;
        entry.onChange = () => emit(entry, normalise(status.state));
        status.addEventListener?.('change', entry.onChange);
      }
      emit(entry, normalise(status?.state));
    },
    // TypeError: the name isn't queryable here. Anything else: we still don't know — never 'denied'.
    () => { if (seq === entry.seq) emit(entry, 'unknown'); },
  );
}

export function subscribePermission(name, cb) {
  if (!name || typeof cb !== 'function') return () => {};
  let entry = entries.get(name);
  if (!entry) {
    entry = { state: undefined, status: null, onChange: null, seq: 0, listeners: new Set() };
    entries.set(name, entry);
    query(name, entry);
  }
  entry.listeners.add(cb);
  if (entry.state !== undefined) {
    const known = entry.state;
    Promise.resolve().then(() => { if (entry.listeners.has(cb)) cb(known); });
  }
  return () => { entry.listeners.delete(cb); };
}

export function refreshPermission(name) {
  const entry = entries.get(name);
  return entry ? query(name, entry) : Promise.resolve();
}
