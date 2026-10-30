// GET /api/calendar?tz=Asia/Kolkata[&date=YYYY-MM-DD]
// Returns today's events from the feeds in CALENDAR_ICS_URLS. The feed URLs are
// secret (anyone with one can read the calendar), so they live only in Vercel
// env vars, and the endpoint answers only callers that send WALLPAPER_KEY.
import { createHash, timingSafeEqual } from 'node:crypto';
import { eventsForDay, isValidTimeZone, localDate } from './_lib/ics.js';

const FETCH_TIMEOUT_MS = 8000;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
  });
}

function sameSecret(a, b) {
  const digest = (s) => createHash('sha256').update(String(s)).digest();
  return timingSafeEqual(digest(a), digest(b));
}

// Feeds are separated by whitespace, or by a comma that starts the next link. A comma inside a link
// (a query string, a data: URL) is part of it.
function feedUrls() {
  return (process.env.CALENDAR_ICS_URLS || '')
    .split(/\s+|,(?=\s*(?:https?|webcal|data):)/i)
    .filter(Boolean)
    .map((url) => url.replace(/^webcal:\/\//i, 'https://'));
}

export async function GET(request) {
  const expected = process.env.WALLPAPER_KEY;
  if (!expected) return json(500, { error: 'WALLPAPER_KEY is not set on the server' });

  const url = new URL(request.url);
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = bearer || url.searchParams.get('key') || '';
  if (!provided || !sameSecret(provided, expected)) return json(401, { error: 'Missing or wrong key' });

  const timeZone = url.searchParams.get('tz') || 'UTC';
  if (!isValidTimeZone(timeZone)) return json(400, { error: 'Unknown time zone' });
  const date = url.searchParams.get('date') || localDate(Date.now(), timeZone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(400, { error: 'date must be YYYY-MM-DD' });

  const urls = feedUrls();
  if (urls.length === 0) return json(200, { configured: false, date, events: [] });

  const results = await Promise.allSettled(urls.map(async (feed) => {
    const res = await fetch(feed, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return eventsForDay(await res.text(), { date, timeZone });
  }));

  // Never echo feed URLs back: they are the secret.
  const errors = results.flatMap((r, i) => (r.status === 'rejected' ? [`Calendar ${i + 1}: ${r.reason.message}`] : []));
  if (errors.length === urls.length) return json(502, { error: 'Could not load any calendar', details: errors });

  // The same meeting can come from two feeds, and only one copy may carry its join link (a calendar
  // published as "titles and locations" drops the description), so a duplicate lends its link.
  const seen = new Map();
  const events = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((e) => {
      const key = `${e.title}|${e.start}`;
      const first = seen.get(key);
      if (!first) {
        seen.set(key, e);
        return true;
      }
      if (!first.join && e.join) first.join = e.join;
      return false;
    })
    .sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1));

  return json(200, { configured: true, date, events, errors });
}
