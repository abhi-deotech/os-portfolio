import { useCallback, useRef } from 'react';

const ARROWS = {
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
  w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
  W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
};

const SWIPE_THRESHOLD = 24;

/**
 * Directional input for a game board, from keys and from touch.
 *
 * Returns props to spread onto the board element. Everything is DOM-scoped: no `window` listener
 * anywhere. That is the whole point. Snake and 2048 both used to bind keydown on `window`, and
 * because App.jsx keeps minimized windows mounted, a minimized game kept consuming every arrow
 * key in the OS and mutating its own state invisibly. With two games open, one keypress drove
 * both boards. Neither called preventDefault either, so the arrows also scrolled the desktop.
 *
 * Touch exists because the OS ships a mobile layout and rendered these games on phones where
 * they had no input at all.
 *
 * @param {(dir: 'UP'|'DOWN'|'LEFT'|'RIGHT') => void} onDirection
 * @param {object} [opts]
 * @param {boolean} [opts.enabled=true]  when false, input is swallowed (still preventing default)
 * @param {() => void} [opts.onPause]    bound to Space and Escape
 * @param {(key: string, e: KeyboardEvent) => boolean} [opts.onKey]
 *        extra key handling; return true if handled, to suppress the directional mapping
 */
export default function useGameInput(onDirection, opts = {}) {
  const { enabled = true, onPause, onKey } = opts;
  const touchStart = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (onKey && onKey(e.key, e)) {
      e.preventDefault();
      return;
    }

    if ((e.key === ' ' || e.key === 'Escape') && onPause) {
      e.preventDefault();
      onPause();
      return;
    }

    const dir = ARROWS[e.key];
    if (!dir) return;
    // Prevented even when input is disabled: a paused game must still not scroll the desktop
    // underneath when someone taps an arrow to see if anything happens.
    e.preventDefault();
    if (enabled) onDirection(dir);
  }, [onDirection, enabled, onPause, onKey]);

  const handleTouchStart = useCallback((e) => {
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !enabled) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // A short travel is a tap, not a swipe — otherwise tapping a Memory card would also fire a
    // direction and games that use both would double-handle the gesture.
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    onDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP'));
  }, [onDirection, enabled]);

  return {
    onKeyDown: handleKeyDown,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}
