import { useEffect, useEffectEvent, useRef } from 'react';
import { MEDIA_ACTIONS, registerOwner, safePositionState } from '../utils/mediaSessionCore.js';

const getSession = () => (typeof navigator === 'undefined' ? undefined : navigator.mediaSession);

/**
 * useMediaSession(owner, { enabled, metadata, playbackState, positionState: { duration, getPosition }, handlers })
 *
 * Media keys and the OS now-playing card for one app. The owner stack lives in
 * utils/mediaSessionCore.js: while Music and Media are both open, the most recently enabled one is
 * shown, and closing it hands the session back to the other.
 *
 * Handlers dispatch through useEffectEvent, so an app re-creating its handler closures every render
 * never re-registers anything. Registration depends only on `enabled`, `owner` and WHICH actions have
 * handlers; metadata, playback state and duration update the existing registration in place, so a
 * track change in a background owner cannot move it to the top.
 *
 * Unsupported browsers: no session, nothing registered (the on-screen controls are the fallback, and
 * Settings → Compatibility says so).
 */
export default function useMediaSession(owner, {
  enabled = true,
  metadata = null,
  playbackState = 'none',
  positionState,
  handlers = {},
} = {}) {
  const actionsKey = MEDIA_ACTIONS.filter((a) => typeof handlers?.[a] === 'function').join(',');
  const metaJson = JSON.stringify(metadata ?? null);
  const duration = positionState?.duration;
  const handleRef = useRef(null);

  const readPosition = useEffectEvent(() =>
    safePositionState({ duration: positionState?.duration, position: positionState?.getPosition?.(), playbackRate: 1 }),
  );
  const runAction = useEffectEvent((action, details) => {
    handlers?.[action]?.(details ?? {});
  });

  useEffect(() => {
    const session = getSession();
    if (!enabled || !session) return undefined;
    const actions = actionsKey ? actionsKey.split(',') : [];
    let release = null;
    const wrapped = Object.fromEntries(actions.map((action) => [action, (details) => {
      runAction(action, details);
      // A seek moves the position the OS card extrapolates from.
      if (action.startsWith('seek')) release?.update();
    }]));
    // The position is read on every apply, never stored, so a re-apply is never stale.
    release = registerOwner(session, owner, { handlers: wrapped, getPositionState: () => readPosition() });
    handleRef.current = release;
    return () => {
      if (handleRef.current === release) handleRef.current = null;
      release();
    };
  }, [enabled, owner, actionsKey]);

  useEffect(() => {
    const release = handleRef.current;
    if (!enabled || !release) return;
    release.update({
      metadata: JSON.parse(metaJson),
      playbackState,
    });
  }, [enabled, owner, actionsKey, metaJson, playbackState, duration]);
}
