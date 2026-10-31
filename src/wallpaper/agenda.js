/**
 * The Agenda widget's data: today's events from /api/calendar (api/calendar.js), and how they read
 * at a given minute. Pure apart from the fetch, so agenda-check can drive `agendaView` directly.
 */

/** YYYY-MM-DD of `date` on this machine's clock: the day the widget asks for. */
export const localDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Ask the server for `day`'s events. Never throws: every outcome is a status the widget can say
 * plainly, rather than a blank card.
 *
 * @returns {Promise<{status: 'ok', events: object[]} | {status: 'rejected' | 'unconfigured' | 'error'}>}
 */
export async function fetchAgenda(key, day, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  try {
    const res = await fetch(`/api/calendar?${new URLSearchParams({ tz: timeZone, date: day })}`, {
      headers: { authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (res.status === 401) return { status: 'rejected' };
    if (!res.ok) return { status: 'error' };
    const body = await res.json();
    if (!body.configured) return { status: 'unconfigured' };
    return { status: 'ok', events: Array.isArray(body.events) ? body.events : [] };
  } catch {
    return { status: 'error' };
  }
}

/** Minutes before a call that its Join button appears on the `next` row. */
export const JOIN_LEAD_MIN = 10;

/**
 * The server's join link (api/_lib/meeting.js), kept only if it is one of the shapes that file makes.
 * The page renders it as an href, so it is checked here too rather than trusted.
 */
export function safeJoin(join) {
  if (!join || typeof join.href !== 'string' || typeof join.provider !== 'string') return null;
  if (!/^(?:https:\/\/|zoommtg:\/\/|msteams:\/)/.test(join.href)) return null;
  return { provider: join.provider.slice(0, 16), href: join.href, app: !join.href.startsWith('https:') };
}

/**
 * What the card shows at minute `now`: all-day titles, then the timed events that have not ended,
 * at most `max`. The one in progress is `now`; the first still to come is `next`, with the minutes
 * until it starts; the rest are `later`. `join` rides on `now` rows, and on any row starting
 * JOIN_LEAD_MIN or less away.
 */
export function agendaView(events, now, max = 3) {
  const t = now.getTime();
  const allDay = events.filter((e) => e.allDay).map((e) => e.title);
  const timed = events
    .filter((e) => !e.allDay)
    // `task` marks a ClickUp task's due moment (clickup.js `agendaTasks`): no join, no end of its own.
    .map((e) => ({ title: e.title, start: new Date(e.start), end: new Date(e.end), join: safeJoin(e.join), task: e.task ?? null }))
    .filter((e) => e.end.getTime() > t || (e.end.getTime() === e.start.getTime() && e.start.getTime() >= t))
    .sort((a, b) => a.start - b.start)
    .slice(0, max);

  let nextSeen = false;
  const rows = timed.map((e) => {
    if (e.start.getTime() <= t) return { ...e, kind: 'now' };
    // Join is gated on each row's own lead time, not on being `next`: two events can start together.
    const minutes = Math.ceil((e.start.getTime() - t) / 60_000);
    const join = minutes <= JOIN_LEAD_MIN ? e.join : null;
    if (nextSeen) return { ...e, kind: 'later', join };
    nextSeen = true;
    return { ...e, kind: 'next', minutes, join };
  });
  return { allDay, rows };
}

/** "12 min", "1h", "2h 5m". */
export function untilText(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
