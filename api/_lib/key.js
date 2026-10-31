// The wallpaper's private endpoints answer only callers that send WALLPAPER_KEY, as a Bearer token
// or `?key=`. Shared by api/calendar.js and api/clickup.js so both gates are the same gate.
import { createHash, timingSafeEqual } from 'node:crypto';

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
  });
}

function sameSecret(a, b) {
  const digest = (s) => createHash('sha256').update(String(s)).digest();
  return timingSafeEqual(digest(a), digest(b));
}

/** null when the caller holds the key; otherwise the Response to send back. */
export function keyRejection(request) {
  const expected = process.env.WALLPAPER_KEY;
  if (!expected) return json(500, { error: 'WALLPAPER_KEY is not set on the server' });
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = bearer || new URL(request.url).searchParams.get('key') || '';
  if (!provided || !sameSecret(provided, expected)) return json(401, { error: 'Missing or wrong key' });
  return null;
}
