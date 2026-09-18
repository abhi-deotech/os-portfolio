/**
 * Idle rules for the screensaver. PURE: no React, no store, no `import.meta.env`; plain Node imports
 * this (scripts/interaction-check.mjs).
 *
 * The in-page activity timer is always in charge (App.jsx). System idle detection, where the browser
 * has it and the visitor allowed it, only adds transitions on top: the screensaver also starts when
 * the person is idle across the whole system or the screen locks.
 */

/** In-page inactivity before the screensaver starts. Also the IdleDetector threshold (minimum 60 s). */
export const IDLE_MS = 120_000;

/** Idle across the system, or the screen is locked. */
export const isSystemIdle = ({ userState, screenState } = {}) => userState === 'idle' || screenState === 'locked';

/**
 * 'show' when the state becomes idle, 'hide' when it stops being idle, null when nothing changed.
 * A missing `prev` (the first reading) counts as active.
 */
export function idleTransition(prev, next) {
  const was = isSystemIdle(prev ?? {});
  const now = isSystemIdle(next ?? {});
  if (was === now) return null;
  return now ? 'show' : 'hide';
}
