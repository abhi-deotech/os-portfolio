/**
 * Media Session, the owner-stack core. PURE: no React, no store, no `import.meta.env`; plain Node
 * imports this (scripts/interaction-check.mjs).
 *
 * The page has ONE `navigator.mediaSession`, but Music and Media can both be open. Each app registers
 * as an owner; the most recent registration sits on top and its spec is what the session shows.
 * Releasing the top owner re-applies the one below it, and releasing the last one clears everything,
 * so the OS now-playing card never keeps a closed app's title or a handler bound to an unmounted
 * component.
 *
 *   registerOwner(session, owner, spec, { MediaMetadata }?) → release()
 *     spec     { metadata?, playbackState?, positionState?, getPositionState?, handlers?: { [action]: fn } }
 *              getPositionState() is read on EVERY apply (it wins over positionState), so handing the
 *              session back to an owner that kept playing underneath never restores an old position.
 *     release  also carries release.update(patch), which merges into this owner's spec and
 *              re-applies it only when this owner is on top (an update must not steal the top).
 */

export const MEDIA_ACTIONS = Object.freeze([
  'play',
  'pause',
  'previoustrack',
  'nexttrack',
  'seekto',
  'seekbackward',
  'seekforward',
]);

const PLAYBACK_STATES = new Set(['none', 'paused', 'playing']);

const stacks = new WeakMap();

/**
 * A position state the browser will accept, or null. `setPositionState` throws a TypeError when
 * duration is missing, zero, negative or infinite (a live stream), or when position exceeds duration.
 */
export function safePositionState({ duration, position, playbackRate } = {}) {
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return null;
  const pos = typeof position === 'number' && Number.isFinite(position) ? Math.min(Math.max(position, 0), duration) : 0;
  const rate = typeof playbackRate === 'number' && Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1;
  return { duration, position: pos, playbackRate: rate };
}

/** MediaMetadata init for a catalog track or media item, or null. */
export function trackMetadata(track) {
  if (!track) return null;
  const src = track.cover ?? track.thumbnail;
  return {
    title: track.title ?? track.name ?? '',
    artist: track.artist ?? '',
    album: track.album ?? '',
    artwork: src ? [{ src }] : [],
  };
}

function trySet(fn) {
  try {
    fn();
  } catch {
    /* unsupported action / value in this engine: skip it, keep the rest */
  }
}

function apply(session, entry) {
  const { spec, MetadataCtor } = entry;
  trySet(() => {
    const init = spec.metadata;
    session.metadata = init ? (typeof MetadataCtor === 'function' ? new MetadataCtor(init) : init) : null;
  });
  trySet(() => {
    session.playbackState = PLAYBACK_STATES.has(spec.playbackState) ? spec.playbackState : 'none';
  });
  for (const action of MEDIA_ACTIONS) {
    const handler = spec.handlers?.[action];
    trySet(() => session.setActionHandler(action, typeof handler === 'function' ? handler : null));
  }
  if (typeof session.setPositionState === 'function') {
    trySet(() => {
      const position = typeof spec.getPositionState === 'function' ? spec.getPositionState() : spec.positionState;
      if (position) session.setPositionState(position);
      else session.setPositionState();
    });
  }
}

function clear(session) {
  trySet(() => { session.metadata = null; });
  trySet(() => { session.playbackState = 'none'; });
  for (const action of MEDIA_ACTIONS) trySet(() => session.setActionHandler(action, null));
  if (typeof session.setPositionState === 'function') trySet(() => session.setPositionState());
}

export function registerOwner(session, owner, spec = {}, { MediaMetadata } = {}) {
  if (!session || typeof session !== 'object') {
    const noop = () => {};
    noop.update = () => {};
    return noop;
  }
  let stack = stacks.get(session);
  if (!stack) {
    stack = [];
    stacks.set(session, stack);
  }
  const entry = {
    owner,
    spec: { ...spec },
    MetadataCtor: MediaMetadata ?? globalThis.MediaMetadata,
  };
  stack.push(entry);
  apply(session, entry);

  const release = () => {
    const i = stack.indexOf(entry);
    if (i === -1) return;
    const wasTop = i === stack.length - 1;
    stack.splice(i, 1);
    if (!wasTop) return;
    if (stack.length) apply(session, stack[stack.length - 1]);
    else clear(session);
  };
  release.update = (patch = {}) => {
    entry.spec = { ...entry.spec, ...patch };
    if (stack[stack.length - 1] === entry) apply(session, entry);
  };
  return release;
}

/** Owner names, bottom to top. For harnesses and debugging. */
export function ownersOf(session) {
  return (stacks.get(session) ?? []).map((e) => e.owner);
}
