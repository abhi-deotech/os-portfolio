// Finds the one link that joins an event's video call, for the Agenda widget's Join button.
//
// Only the hosts below count, matched on the parsed URL's hostname (so `zoom.us.evil.com`,
// `https://zoom.us@evil.com/…` and a "zoom.us" buried in a path all fail). The answer is the join
// link alone, never the description it came from: event bodies can hold dial-in PINs and notes the
// wallpaper has no business showing.
//
// Zoom and Teams get their app's own scheme, so a click goes straight to the app instead of a browser
// tab that then asks to open it. Meet and Webex have no Mac app scheme and stay https.

const URL_IN_TEXT = /https:\/\/[^\s<>"'`]+/g;

// Event bodies are written by whoever sent the invite, so scanning is bounded: a field is read up to
// MAX_FIELD characters (scanning is linear, so this is generous: rich-text bodies run long) and a
// single "link" longer than MAX_LINK is skipped, not parsed.
const MAX_FIELD = 1_000_000;
const MAX_LINK = 2048;
const TRAILING = new Set(['.', ',', ';', ':', '!', '?', ')', ']']);

/** Prose around a link often ends it with punctuation that is not part of it. A loop, not a `+$` regex,
 *  so a run of thousands of dots costs linear time rather than quadratic backtracking. */
function trimTrailing(raw) {
  let end = raw.length;
  while (end > 0 && TRAILING.has(raw[end - 1])) end--;
  return raw.slice(0, end);
}

/** Hostname is `domain` or a subdomain of it. */
const isHost = (host, domain) => host === domain || host.endsWith(`.${domain}`);

function zoom(url) {
  if (!isHost(url.hostname, 'zoom.us')) return null;
  const m = url.pathname.match(/^\/(?:j|w|s)\/(\d{9,11})\/?$/);
  // A personal link (zoom.us/my/name) has no meeting number for the app; the browser handles it.
  if (!m) return url.pathname.startsWith('/my/') ? { provider: 'Zoom', href: url.href } : null;
  const q = new URLSearchParams({ action: 'join', confno: m[1] });
  const pwd = url.searchParams.get('pwd');
  if (pwd && /^[\w.-]{1,128}$/.test(pwd)) q.set('pwd', pwd);
  return { provider: 'Zoom', href: `zoommtg://${url.hostname}/join?${q}` };
}

function teams(url) {
  if (url.hostname !== 'teams.microsoft.com' && url.hostname !== 'teams.live.com') return null;
  if (!url.pathname.startsWith('/l/meetup-join/') && !url.pathname.startsWith('/meet/')) return null;
  // Teams' documented deep link: the https link with its origin swapped for the app's scheme.
  return { provider: 'Teams', href: `msteams:${url.pathname}${url.search}` };
}

function meet(url) {
  if (url.hostname !== 'meet.google.com' || !/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url.pathname)) return null;
  return { provider: 'Meet', href: `https://meet.google.com${url.pathname}` };
}

// Webex meeting links come in a few shapes: personal rooms (/meet/<name>), /join/…, the join service,
// and site pages ending in a .php that carries the meeting's MTID (j.php, e.php, Events' onstage/g.php,
// k2/j.php…). Anything else on webex.com (help articles, pricing, the blog) is not a way into the call
// and must not win over a real link later in the invite.
const WEBEX_ROOM = /^\/(?:meet\/[^/]+\/?|join\/.+|wbxmjs\/joinservice\/.+)$/;
const WEBEX_PHP = /^\/(?:[^/]+\/)+[a-z0-9]+\.php$/i;
const NOT_MEETINGS = ['www.webex.com', 'help.webex.com', 'blog.webex.com', 'developer.webex.com', 'settings.webex.com'];

function webex(url) {
  if (!isHost(url.hostname, 'webex.com') || NOT_MEETINGS.includes(url.hostname)) return null;
  const hasMtid = [...url.searchParams.keys()].some((k) => k.toLowerCase() === 'mtid');
  if (!WEBEX_ROOM.test(url.pathname) && !(WEBEX_PHP.test(url.pathname) && hasMtid)) return null;
  return { provider: 'Webex', href: url.href };
}

const PROVIDERS = [zoom, teams, meet, webex];

function fromUrl(raw) {
  let url;
  try {
    // Rich-text descriptions carry links as HTML, where `&` is written `&amp;` (or `&#38;`, `&#x26;`).
    url = new URL(trimTrailing(raw.replace(/&(?:amp|#38|#x26);/gi, '&')));
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  for (const provider of PROVIDERS) {
    const found = provider(url);
    if (found) return found;
  }
  return null;
}

/**
 * The first join link in `fields`, which are tried in order (most specific first), each scanned for
 * every https link it contains. Returns `{ provider, href }` or null.
 */
export function findMeetingLink(fields) {
  for (const text of fields) {
    if (!text) continue;
    for (const raw of String(text).slice(0, MAX_FIELD).match(URL_IN_TEXT) || []) {
      if (raw.length > MAX_LINK) continue;
      const found = fromUrl(raw);
      if (found) return found;
    }
  }
  return null;
}

/** The event properties worth looking in, most specific first. */
export const MEETING_FIELDS = ['url', 'x-google-conference', 'x-microsoft-skypeteamsmeetingurl', 'location', 'description'];
