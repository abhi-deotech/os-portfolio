import { useState, useEffect } from 'react';
import useOSStore from '../store/osStore';

/**
 * Whether the tab is visible at all. One listener per subscriber; cheap.
 */
export function useDocumentVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

/**
 * Is the window `id` something the user can currently see?
 *
 * False while the window is minimised or the tab is hidden. Minimising only animates a window to
 * `opacity: 0` — its content stays mounted (App.jsx renders every id in `openWindows`), so any
 * rAF loop, interval or canvas inside keeps running for a window nobody can see. Breakout gated
 * its loop on `minimizedWindows` by hand; this is that gate for everyone. The music engine's
 * seek-bar poll uses it too — audio keeps playing when minimised, only the poll stops.
 *
 * @param {string} id  window id as registered in openWindows
 * @returns {boolean}
 */
export default function useWindowVisibility(id) {
  const minimized = useOSStore((s) => s.minimizedWindows.includes(id));
  const docVisible = useDocumentVisible();
  return !minimized && docVisible;
}
