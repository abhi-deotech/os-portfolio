import { useEffect, useRef } from 'react';

/**
 * Run `task` now and every `intervalMs`, but only while the page is visible. When the page comes
 * back, it runs at once if the last run is older than the interval. Built for wallpaper mode, which
 * stays open all day on a laptop: a hidden page (another Space, a closed lid) costs no requests.
 *
 * `task` may change between renders; the latest one is always called. Pass `enabled: false` to stop,
 * and change `resetKey` (e.g. the place a forecast is for) to restart the cycle with an immediate run.
 */
export default function useVisiblePoll(task, intervalMs, enabled = true, resetKey = '') {
  const taskRef = useRef(task);
  useEffect(() => { taskRef.current = task; });

  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    let last = 0;

    const run = () => {
      last = Date.now();
      taskRef.current();
    };
    const arm = () => {
      clearInterval(timer);
      timer = setInterval(run, intervalMs);
    };
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(timer);
        timer = null;
        return;
      }
      if (Date.now() - last >= intervalMs) run();
      arm();
    };

    if (!document.hidden) { run(); arm(); }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled, resetKey]);
}
