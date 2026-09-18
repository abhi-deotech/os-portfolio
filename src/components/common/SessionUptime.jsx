import React from 'react';
import useMinuteClock from '../../hooks/useMinuteClock';
import { fmt } from '../../system/facts.js';

/**
 * How long this page has been open — the only uptime a web page can honestly claim. Ticks once a
 * minute (useMinuteClock); the origin is the navigation's `performance.timeOrigin`, not a guess.
 */
const SessionUptime = ({ className = '', captionClassName = 'text-sdl-sec' }) => {
  const now = useMinuteClock();
  const ms = now.getTime() - performance.timeOrigin;
  return (
    <span className={className}>
      <span className="tabular-nums">{fmt.duration(ms)}</span>{' '}
      <span className={captionClassName}>since page load</span>
    </span>
  );
};

export default SessionUptime;
