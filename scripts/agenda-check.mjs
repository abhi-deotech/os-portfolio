#!/usr/bin/env node
/**
 * agenda-check — proves the wallpaper Agenda's backend: the iCal parser and the Vercel function.
 *
 * Part 1 drives api/_lib/ics.js over hand-written feeds whose answers are known: UTC times, a TZID
 * with and without its VTIMEZONE block, floating times, a daily series started in 2019 (thousands of
 * iterations before today), EXDATE, an instance moved INTO today and one moved OUT of it, a finished
 * COUNT series, all-day and multi-day events, and a cancelled event. Plus DST in both directions.
 *
 * Part 2 calls api/calendar.js's GET with real Requests against a feed served on 127.0.0.1: the key
 * gate, input validation, the unconfigured answer, sorting and de-duplication across feeds, partial
 * failure, and that no feed URL (the secret) ever appears in a response.
 *
 * Part 3 drives src/wallpaper/agenda.js's `agendaView`: which rows the widget shows at a minute, and
 * which one is "now", "next" (with its countdown) or "later".
 *
 *   npm run agenda:check
 */
import { createServer } from 'node:http';
import { eventsForDay, zonedToEpoch } from '../api/_lib/ics.js';
import { GET } from '../api/calendar.js';
import { agendaView, untilText } from '../src/wallpaper/agenda.js';

let pass = 0;
let fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) pass++;
  else { fail++; console.error(`  FAIL ${label}\n       got  ${g}\n       want ${w}`); }
};

/* ── Part 1: the parser ─────────────────────────────────────────────────────── */

const NY_VTIMEZONE = `BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE`;

const cal = (...blocks) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:agenda-check', ...blocks, 'END:VCALENDAR'].join('\r\n');
const ev = (lines) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'].join('\r\n');
const titles = (events) => events.map((e) => e.title).sort();
const iso = (ms) => new Date(ms).toISOString();
const DAY = { date: '2026-10-29', timeZone: 'Asia/Kolkata' };

// DST: 09:00 New York either side of the 2026-11-01 switch back to EST.
eq('09:00 EDT', iso(zonedToEpoch({ year: 2026, month: 10, day: 30, hour: 9 }, 'America/New_York')), '2026-10-30T13:00:00.000Z');
eq('09:00 EST', iso(zonedToEpoch({ year: 2026, month: 11, day: 2, hour: 9 }, 'America/New_York')), '2026-11-02T14:00:00.000Z');
eq('IST midnight', iso(zonedToEpoch({ year: 2026, month: 10, day: 29 }, 'Asia/Kolkata')), '2026-10-28T18:30:00.000Z');

{
  const byTitle = Object.fromEntries(eventsForDay(cal(
    NY_VTIMEZONE,
    ev(['UID:utc', 'DTSTART:20261029T043000Z', 'DTEND:20261029T050000Z', 'SUMMARY:UTC event']),
    ev(['UID:ny', 'DTSTART;TZID=America/New_York:20261028T233000', 'DTEND;TZID=America/New_York:20261029T000000', 'SUMMARY:NY late']),
    ev(['UID:ldn', 'DTSTART;TZID=Europe/London:20261029T090000', 'DTEND;TZID=Europe/London:20261029T100000', 'SUMMARY:London no vtz']),
    ev(['UID:float', 'DTSTART:20261029T150000', 'DTEND:20261029T153000', 'SUMMARY:Floating']),
    ev(['UID:other', 'DTSTART:20261030T120000Z', 'DTEND:20261030T130000Z', 'SUMMARY:Tomorrow']),
  ), DAY).map((e) => [e.title, e]));
  eq('single events: which ones are today', Object.keys(byTitle).sort(), ['Floating', 'London no vtz', 'NY late', 'UTC event']);
  eq('UTC time kept', byTitle['UTC event'].start, '2026-10-29T04:30:00.000Z');
  eq('VTIMEZONE resolved (23:30 EDT)', byTitle['NY late'].start, '2026-10-29T03:30:00.000Z');
  eq('TZID without VTIMEZONE resolved (GMT)', byTitle['London no vtz'].start, '2026-10-29T09:00:00.000Z');
  eq('floating time is the viewer’s (15:00 IST)', byTitle.Floating.start, '2026-10-29T09:30:00.000Z');
}

{
  const events = eventsForDay(cal(
    NY_VTIMEZONE,
    ev(['UID:standup', 'DTSTART;TZID=America/New_York:20190102T000000', 'DTEND;TZID=America/New_York:20190102T001500', 'RRULE:FREQ=DAILY', 'SUMMARY:Standup']),
    ev(['UID:sync', 'DTSTART:20260101T060000Z', 'DTEND:20260101T070000Z', 'RRULE:FREQ=WEEKLY;BYDAY=TH', 'EXDATE:20261029T060000Z', 'SUMMARY:Weekly sync']),
    ev(['UID:review', 'DTSTART:20260107T080000Z', 'DTEND:20260107T090000Z', 'RRULE:FREQ=WEEKLY;BYDAY=WE', 'SUMMARY:Design review']),
    ev(['UID:review', 'RECURRENCE-ID:20261028T080000Z', 'DTSTART:20261029T100000Z', 'DTEND:20261029T110000Z', 'SUMMARY:Design review (moved)']),
    ev(['UID:1on1', 'DTSTART:20260101T110000Z', 'DTEND:20260101T113000Z', 'RRULE:FREQ=WEEKLY;BYDAY=TH', 'SUMMARY:1:1']),
    ev(['UID:1on1', 'RECURRENCE-ID:20261029T110000Z', 'DTSTART:20261030T110000Z', 'DTEND:20261030T113000Z', 'SUMMARY:1:1 (moved)']),
    ev(['UID:done', 'DTSTART:20260101T120000Z', 'DTEND:20260101T130000Z', 'RRULE:FREQ=DAILY;COUNT=5', 'SUMMARY:Finished series']),
  ), DAY);
  eq('recurring: EXDATE, moved in, moved out, finished', titles(events), ['Design review (moved)', 'Standup']);
  eq('7-year-old daily series lands on today (00:00 EDT)', events.find((e) => e.title === 'Standup')?.start, '2026-10-29T04:00:00.000Z');
}

{
  const events = eventsForDay(cal(
    ev(['UID:hol', 'DTSTART;VALUE=DATE:20261029', 'DTEND;VALUE=DATE:20261030', 'SUMMARY:Holiday']),
    ev(['UID:trip', 'DTSTART;VALUE=DATE:20261027', 'DTEND;VALUE=DATE:20261031', 'SUMMARY:Offsite']),
    ev(['UID:ended', 'DTSTART;VALUE=DATE:20261027', 'DTEND;VALUE=DATE:20261029', 'SUMMARY:Ended yesterday']),
    ev(['UID:bday', 'DTSTART;VALUE=DATE:20101029', 'RRULE:FREQ=YEARLY', 'SUMMARY:Birthday']),
    ev(['UID:x', 'DTSTART:20261029T060000Z', 'DTEND:20261029T070000Z', 'STATUS:CANCELLED', 'SUMMARY:Cancelled']),
  ), DAY);
  eq('all-day, multi-day, yearly; cancelled dropped', titles(events), ['Birthday', 'Holiday', 'Offsite']);
  eq('all-day shape', events.find((e) => e.title === 'Holiday'), { title: 'Holiday', allDay: true, start: '2026-10-29', end: '2026-10-30' });
}

/* ── Part 2: the function ───────────────────────────────────────────────────── */

const FEED = cal(
  ev(['UID:1', 'DTSTART:20261029T100000Z', 'DTEND:20261029T103000Z', 'SUMMARY:Later']),
  ev(['UID:2', 'DTSTART:20261029T050000Z', 'DTEND:20261029T053000Z', 'SUMMARY:Earlier']),
  ev(['UID:3', 'DTSTART;VALUE=DATE:20261029', 'SUMMARY:All day']),
);
const server = createServer((req, res) => {
  if (req.url.split('?')[0] === '/cal.ics') { res.writeHead(200, { 'content-type': 'text/calendar' }); res.end(FEED); return; }
  res.writeHead(404); res.end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const call = (query, headers = {}) => GET(new Request(`https://wall.example/api/calendar?${query}`, { headers }));

try {
  delete process.env.WALLPAPER_KEY;
  eq('no WALLPAPER_KEY on the server → 500', (await call('tz=UTC')).status, 500);

  process.env.WALLPAPER_KEY = 'secret-key';
  eq('no key → 401', (await call('tz=UTC')).status, 401);
  eq('wrong key → 401', (await call('tz=UTC', { authorization: 'Bearer nope' })).status, 401);
  eq('unknown time zone → 400', (await call('tz=Not/AZone&key=secret-key')).status, 400);
  eq('bad date → 400', (await call('tz=UTC&date=tomorrow&key=secret-key')).status, 400);

  delete process.env.CALENDAR_ICS_URLS;
  eq('no feeds → configured: false', (await (await call('tz=UTC&key=secret-key')).json()).configured, false);

  // The same feed twice (de-duplicated) plus a broken one (partial failure).
  process.env.CALENDAR_ICS_URLS = `${base}/cal.ics, ${base}/cal.ics ${base}/missing.ics`;
  const res = await call('tz=Asia/Kolkata&date=2026-10-29', { authorization: 'Bearer secret-key' });
  const body = await res.json();
  eq('feeds → 200', res.status, 200);
  eq('never cached', res.headers.get('cache-control'), 'private, no-store');
  eq('all-day first, then by time, no duplicates', body.events.map((e) => e.title), ['All day', 'Earlier', 'Later']);
  eq('broken feed named by position only', body.errors, ['Calendar 3: HTTP 404']);
  eq('no feed URL in the response', JSON.stringify(body).includes(base), false);

  // A comma inside a link is part of it; only whitespace or ",<next link>" separates feeds.
  process.env.CALENDAR_ICS_URLS = `${base}/cal.ics?a=1,2,${base}/missing.ics data:text/calendar;base64,${Buffer.from(FEED).toString('base64')}`;
  const split = await (await call('tz=Asia/Kolkata&date=2026-10-29&key=secret-key')).json();
  eq('commas inside links kept: 3 feeds, 1 broken', split.errors, ['Calendar 2: HTTP 404']);
  eq('…and the data: feed parsed', split.events.map((e) => e.title), ['All day', 'Earlier', 'Later']);

  process.env.CALENDAR_ICS_URLS = `${base}/missing.ics`;
  eq('every feed failing → 502', (await call('tz=UTC&key=secret-key')).status, 502);
} finally {
  server.close();
}

/* ── Part 3: what the widget shows at a given minute ────────────────────────── */

{
  const now = new Date('2026-10-29T10:00:00Z');
  const at = (min) => new Date(now.getTime() + min * 60_000).toISOString();
  const { allDay, rows } = agendaView([
    { title: 'Ended', allDay: false, start: at(-90), end: at(-30) },
    { title: 'Demo day', allDay: true, start: '2026-10-29', end: '2026-10-30' },
    { title: 'Review', allDay: false, start: at(-20), end: at(25) },
    { title: 'Standup', allDay: false, start: at(35), end: at(50) },
    { title: '1:1', allDay: false, start: at(125), end: at(155) },
    { title: 'Fourth', allDay: false, start: at(300), end: at(330) },
  ], now);
  eq('all-day titles', allDay, ['Demo day']);
  eq('ended dropped, capped at 3', rows.map((r) => r.title), ['Review', 'Standup', '1:1']);
  eq('now / next / later', rows.map((r) => r.kind), ['now', 'next', 'later']);
  eq('minutes until next', rows[1].minutes, 35);
  eq('starts exactly now counts as now', agendaView([{ title: 'X', allDay: false, start: at(0), end: at(30) }], now).rows[0].kind, 'now');
  eq('untilText', [untilText(12), untilText(60), untilText(125)], ['12 min', '1h', '2h 5m']);
}

console.log(`\nagenda-check: ${pass} passed, ${fail} failed — ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
