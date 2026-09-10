// Extension-explicit, unlike the rest of the app: this module is imported by a plain-Node
// test harness as well as by Vite, and Node ESM refuses extensionless specifiers.
import { MUSIC_DATA } from '../../data/musicData.js';

/**
 * Pure playback-order logic for the Music app — no React, no store, no engine.
 *
 * Kept side-effect-free and import-light so the Node harness can assert on the REAL
 * functions (tasks/lessons.md: extract the actual source into the harness — a retyped
 * copy tests the copy, not the code). MusicApp owns the state these functions transform;
 * useYouTubePlayer owns the engine they steer.
 */

/** id → track for the whole catalog. Built once; the catalog is static data. */
export const TRACK_BY_ID = new Map(MUSIC_DATA.map((t) => [t.id, t]));

export const trackById = (id) => TRACK_BY_ID.get(id);

/** mm:ss for the seek bar and track tables. Non-finite/negative input renders 0:00. */
export const formatTime = (time) => {
  const t = Number.isFinite(time) && time > 0 ? time : 0;
  const min = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

/**
 * Stable signature for a playback context, so a shuffle bag can tell "same context,
 * keep consuming" from "context changed, reshuffle". NUL join because track ids are
 * human-readable slugs that may contain any printable character.
 */
export const contextSignature = (trackIds) => trackIds.join('\u0000');

/**
 * Fisher–Yates permutation of `trackIds` minus `excludeId` (the track playing when the
 * bag is built — a bag must never hand back the track that spawned it). `rng` is
 * injectable so the harness can drive it deterministically.
 */
export function buildShuffleBag(trackIds, excludeId, rng = Math.random) {
  const bag = trackIds.filter((id) => id !== excludeId);
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/**
 * Resolve what plays after the current track (track ended, or Next pressed).
 *
 * Resolution order — the first source that applies wins:
 *   1. repeat-one         → restart the current track; nothing is consumed
 *   2. explicit queue     → consume the head (the queue exists to override everything
 *                           below it, so it beats shuffle and the context)
 *   3. shuffle bag        → consume the head of a no-repeat permutation of the context;
 *                           when the bag runs dry, reshuffle (excluding the track that
 *                           just played) and keep going — this replaces the old
 *                           uniform-random pick, which could replay a track while
 *                           others had never come up
 *   4. sequential context → next index; wraps only under repeat-all, otherwise
 *                           `trackId: null` = playback stops at the end
 *
 * Inputs are never mutated. The caller applies the returned `queue`/`bag` (new values
 * only where something was consumed). A current track that is not IN the context (it
 * came from the queue, or the view changed underneath it) restarts the context from the
 * top rather than dead-ending.
 *
 * @param {{repeatMode: string, shuffle: boolean, queue: string[],
 *          bag: {sig: string, ids: string[]}, contextIds: string[],
 *          currentId: string, rng?: () => number}} s
 * @returns {{restart: boolean, trackId: string|null, queue: string[],
 *            bag: {sig: string, ids: string[]}}}
 */
export function resolveNextTrack({ repeatMode, shuffle, queue, bag, contextIds, currentId, rng = Math.random }) {
  // 1. Repeat-one restarts regardless of anything queued: the user asked for THIS track on loop.
  if (repeatMode === 'one') {
    return { restart: true, trackId: null, queue, bag };
  }

  // 2. The explicit queue.
  if (queue.length > 0) {
    return { restart: false, trackId: queue[0], queue: queue.slice(1), bag };
  }

  // 3. Shuffle bag.
  if (shuffle) {
    const sig = contextSignature(contextIds);
    let ids = bag && bag.sig === sig ? bag.ids : [];
    if (ids.length === 0) ids = buildShuffleBag(contextIds, currentId, rng);
    // A manual pick can play a track the live bag still holds; skipping an immediate
    // repeat is the only correction — the pick already counted as that track's turn.
    let head = ids[0] ?? null;
    let rest = ids.slice(1);
    if (head === currentId) {
      head = rest[0] ?? null;
      rest = rest.slice(1);
    }
    return { restart: false, trackId: head, queue, bag: { sig, ids: rest } };
  }

  // 4. Sequential.
  const idx = contextIds.indexOf(currentId);
  if (idx === -1) {
    return { restart: false, trackId: contextIds[0] ?? null, queue, bag };
  }
  if (idx === contextIds.length - 1) {
    return { restart: false, trackId: repeatMode === 'all' ? contextIds[0] ?? null : null, queue, bag };
  }
  return { restart: false, trackId: contextIds[idx + 1], queue, bag };
}

/**
 * Previous track: wraps to the end from the first slot, and from a current track that
 * is not in the context at all — both preserved from the pre-split behaviour. The
 * "restart if more than 5s in" rule lives with the caller, because it needs the engine.
 */
export function resolvePrevTrack({ contextIds, currentId }) {
  const idx = contextIds.indexOf(currentId);
  return (idx > 0 ? contextIds[idx - 1] : contextIds[contextIds.length - 1]) ?? null;
}

/**
 * The next few context tracks for the Up Next panel — sequential preview only. With
 * shuffle on the order belongs to the bag, and the panel says so instead of predicting
 * an order the resolver will not follow.
 */
export function upcomingFromContext({ contextIds, currentId, repeatMode, count = 5 }) {
  if (contextIds.length === 0) return [];
  const idx = contextIds.indexOf(currentId);
  const out = [];
  for (let step = 1; step <= count; step += 1) {
    // Off-context current (queue-sourced): the resolver restarts from the top, so the
    // preview does too.
    const j = idx === -1 ? step - 1 : idx + step;
    if (j < contextIds.length) out.push(contextIds[j]);
    else if (repeatMode === 'all') out.push(contextIds[j % contextIds.length]);
    else break;
  }
  return out;
}
