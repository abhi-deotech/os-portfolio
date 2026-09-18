import { useState, useEffect } from 'react';

/** Milliseconds until the next wall-clock minute boundary. Exported for the harness. */
export const msToNextMinute = (now = Date.now()) => 60_000 - (now % 60_000);

/**
 * A clock that ticks once a minute, phase-aligned to the minute boundary.
 *
 * Every clock in the shell displays HH:MM, so a per-second `setInterval` re-rendered its host
 * 60 times for one visible change — and two of those hosts were the whole dock and the clock
 * widget. One timeout aligns to the next boundary, then a 60 s interval keeps it there. The
 * pattern was already correct in MenuBar; this makes it the only implementation.
 *
 * @returns {Date}
 */
export default function useMinuteClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    let intervalId;
    const timeoutId = setTimeout(() => {
      setTime(new Date());
      intervalId = setInterval(() => setTime(new Date()), 60_000);
    }, msToNextMinute());
    return () => { clearTimeout(timeoutId); clearInterval(intervalId); };
  }, []);

  return time;
}
