import { APP_BY_ID } from './apps.jsx';
import { isGameId, isUserGameId } from './games.js';

/**
 * Which apps may leave the main window (owner decision, 2026-09-17: curated apps only).
 *
 * Data, no React and no store. It reads the app and game registries, which pull in lucide icons, so
 * the harness loads it through Vite (`ssrLoadModule`) rather than plain Node.
 *
 * Everything not listed stays docked, and its pop-out button explains why in its tooltip. It is never
 * a silent no-op.
 */
export const POPOUT = {
  notepad: 'ok',
  terminal: 'ok',
  media: 'ok',
  photos: 'ok',
  aichat: 'ok',
  taskmanager: 'ok',
  documentation: 'ok',
  about: 'ok',
  projects: 'ok',
  achievements: 'ok',
  settings: 'ok',
};

export const POPOUT_REASONS = {
  music: 'Music plays through an embedded YouTube player, which restarts if moved to another window.',
  browser: 'Web pages in Flow-Net reload when moved to another window.',
  games: 'Games rely on this window for input, visibility and scores.',
  other: 'Not yet checked outside the main window.',
};

/** popoutPolicy(id) → { allowed, reason } — `reason` is null when allowed. */
export function popoutPolicy(id) {
  if (POPOUT[id] === 'ok' && APP_BY_ID[id]) return { allowed: true, reason: null };
  if (id === 'music') return { allowed: false, reason: POPOUT_REASONS.music };
  if (id === 'browser') return { allowed: false, reason: POPOUT_REASONS.browser };
  if (isGameId(id) || isUserGameId(id)) return { allowed: false, reason: POPOUT_REASONS.games };
  return { allowed: false, reason: POPOUT_REASONS.other };
}
