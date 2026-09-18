import { useEffect, useEffectEvent, useState } from 'react';
import { isSupported } from '../capabilities/support.js';
import { refreshPermission } from '../capabilities/permissions.js';
import { IDLE_MS, idleTransition } from '../utils/idle.js';

/**
 * useIdleDetection({ enabled, threshold, onTransition }) → { status }
 *
 *   status  'unsupported' | 'off' | 'starting' | 'active' | 'denied'
 *
 * Wraps the Idle Detection API. `unsupported` and `off` are DERIVED in render, never set from an
 * effect. The detector's `change` listener computes idleTransition() and hands 'show' / 'hide' to
 * `onTransition` through useEffectEvent, so no effect ever watches an idle value. `start()` rejecting
 * (permission not granted, or revoked) reads `denied`, set in the rejection callback.
 *
 * Permission is never requested here: requestIdlePermission() needs a user gesture, so only the
 * Settings → System switch calls it, from its click handler.
 */
export function useIdleDetection({ enabled, threshold = IDLE_MS, onTransition }) {
  const supported = isSupported('idleDetection');
  const [runStatus, setRunStatus] = useState('starting');
  const fire = useEffectEvent((transition) => {
    onTransition?.(transition);
  });

  useEffect(() => {
    if (!supported || !enabled) return undefined;
    const controller = new AbortController();
    let detector;
    try {
      detector = new window.IdleDetector();
    } catch {
      Promise.resolve().then(() => { if (!controller.signal.aborted) setRunStatus('denied'); });
      return () => controller.abort();
    }

    let prev = null;
    const onChange = () => {
      const next = { userState: detector.userState, screenState: detector.screenState };
      const transition = idleTransition(prev, next);
      prev = next;
      if (transition) fire(transition);
    };
    detector.addEventListener('change', onChange);

    // The API refuses thresholds under 60 s.
    detector.start({ threshold: Math.max(60_000, threshold), signal: controller.signal }).then(
      () => { if (!controller.signal.aborted) setRunStatus('active'); },
      (err) => {
        if (controller.signal.aborted || err?.name === 'AbortError') return;
        setRunStatus('denied');
      },
    );

    return () => {
      controller.abort();
      detector.removeEventListener('change', onChange);
    };
  }, [supported, enabled, threshold]);

  let status = runStatus;
  if (!supported) status = 'unsupported';
  else if (!enabled) status = 'off';
  return { status };
}

/**
 * Ask for the idle-detection permission. Call ONLY from a click handler: the request needs the
 * gesture, and it is made synchronously before this function's first await.
 * `view` is the clicked element's window (`e.currentTarget.ownerDocument.defaultView`): a click in a
 * popped-out `window.open` popup activates only that window, so the request must use its realm.
 * Resolves 'granted' | 'denied' | 'unsupported'.
 */
export async function requestIdlePermission(view = window) {
  if (!isSupported('idleDetection')) return 'unsupported';
  const Detector = view?.IdleDetector ?? window.IdleDetector;
  try {
    return (await Detector.requestPermission()) === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  } finally {
    // Awaited, so the caller's next render already sees the new permission state.
    await refreshPermission('idle-detection');
  }
}

export default useIdleDetection;
