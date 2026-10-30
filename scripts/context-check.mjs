#!/usr/bin/env node
/**
 * context-check — proves api/wallpaper-context.js, the weather behind the relief wallpapers.
 *
 * globalThis.fetch is swapped for stubs that record the upstream URL and answer with canned bodies,
 * so nothing leaves the machine. Covered: the query sent to Open-Meteo (rounding, units, fields), the
 * normalized payload and its size, the headers on 200 / 400 / 502, rejection of bad lat / lon / unit,
 * timeout, network failure, non-OK and malformed answers, and that location headers are ignored (the
 * place is only ever the one chosen in Settings).
 *
 *   node scripts/context-check.mjs
 */
import { GET } from '../api/wallpaper-context.js';

let pass = 0;
let fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) pass++;
  else { fail++; console.error(`  FAIL ${label}\n       got  ${g}\n       want ${w}`); }
};

const OK_BODY = {
  latitude: 12.97,
  longitude: 77.59,
  current: { temperature_2m: 27.6, weather_code: 3, is_day: 1, wind_speed_10m: 11.4, wind_direction_10m: 247.5, cloud_cover: 63 },
};

// Each stub records what it was asked for; `answer` decides the reply.
let calls = [];
const stub = (answer) => {
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ url: new URL(String(input)), signal: init.signal });
    return answer(init);
  };
};
const reply = (body, status = 200) => () => new Response(typeof body === 'string' ? body : JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});
const call = (query, headers = {}) => GET(new Request(`https://wall.example/api/wallpaper-context?${query}`, { headers }));

const realFetch = globalThis.fetch;
try {
  /* ── Success: the upstream query and the payload ─────────────────────────── */

  calls = [];
  stub(reply(OK_BODY));
  {
    const res = await call('lat=12.97159&lon=77.59456');
    const text = await res.text();
    const up = calls[0]?.url;
    eq('one upstream call', calls.length, 1);
    eq('upstream host and path', `${up.origin}${up.pathname}`, 'https://api.open-meteo.com/v1/forecast');
    eq('latitude rounded to 2 dp', up.searchParams.get('latitude'), '12.97');
    eq('longitude rounded to 2 dp', up.searchParams.get('longitude'), '77.59');
    eq('current fields', up.searchParams.get('current'), 'temperature_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,cloud_cover');
    eq('default unit is celsius', up.searchParams.get('temperature_unit'), 'celsius');
    eq('wind in km/h', up.searchParams.get('wind_speed_unit'), 'kmh');
    eq('timezone auto', up.searchParams.get('timezone'), 'auto');
    eq('fetch carries an AbortSignal', calls[0].signal instanceof AbortSignal, true);
    eq('…not yet aborted', calls[0].signal?.aborted, false);

    eq('200', res.status, 200);
    eq('json content type', res.headers.get('content-type'), 'application/json');
    eq('CDN-cacheable', res.headers.get('cache-control'), 'public, s-maxage=600, stale-while-revalidate=1800');
    eq('normalized payload', JSON.parse(text), {
      place: { lat: 12.97, lon: 77.59 },
      weather: { temp: 28, code: 3, isDay: true, windSpeed: 11, windDir: 248, cloudCover: 0.63 },
    });
    eq('body under 400 bytes', Buffer.byteLength(text) < 400, true);
  }

  calls = [];
  stub(reply({ current: { ...OK_BODY.current, temperature_2m: 81.5, is_day: 0, cloud_cover: 100, wind_direction_10m: 359.7 } }));
  {
    const res = await call('lat=-33.8688&lon=151.2093&unit=f');
    const body = await res.json();
    const up = calls[0].url;
    eq('fahrenheit requested upstream', up.searchParams.get('temperature_unit'), 'fahrenheit');
    eq('negative latitude rounded', up.searchParams.get('latitude'), '-33.87');
    eq('place echoes the rounded point', body.place, { lat: -33.87, lon: 151.21 });
    eq('temp integer in the asked unit', body.weather.temp, 82);
    eq('isDay false at night', body.weather.isDay, false);
    eq('cloudCover 0..1', body.weather.cloudCover, 1);
    eq('wind direction wraps 360 → 0', body.weather.windDir, 0);
  }

  calls = [];
  stub(reply(OK_BODY));
  {
    const body = await (await call('lat=90&lon=-180&unit=c')).json();
    eq('poles and antimeridian accepted', body.place, { lat: 90, lon: -180 });
    eq('explicit unit=c → celsius', calls[0].url.searchParams.get('temperature_unit'), 'celsius');
  }

  /* ── 400: bad input, and no location guessed from headers ─────────────────── */

  calls = [];
  stub(reply(OK_BODY));
  const bad = [
    ['no lat or lon', ''],
    ['lat only', 'lat=12.9'],
    ['lon only', 'lon=77.5'],
    ['empty lat', 'lat=&lon=77.5'],
    ['blank lat (Number(" ") is 0)', 'lat=%20&lon=77.5'],
    ['lat not a number', 'lat=north&lon=77.5'],
    ['lat NaN', 'lat=NaN&lon=77.5'],
    ['lat Infinity', 'lat=Infinity&lon=77.5'],
    ['lat hex', 'lat=0x10&lon=77.5'],
    ['lat > 90', 'lat=90.01&lon=77.5'],
    ['lat < -90', 'lat=-91&lon=77.5'],
    ['lon > 180', 'lat=12.9&lon=180.5'],
    ['lon < -180', 'lat=12.9&lon=-181'],
    ['unit k', 'lat=12.9&lon=77.5&unit=k'],
    ['unit empty', 'lat=12.9&lon=77.5&unit='],
    ['unit celsius spelled out', 'lat=12.9&lon=77.5&unit=celsius'],
    ['unit __proto__ (inherited key)', 'lat=12.9&lon=77.5&unit=__proto__'],
    ['unit constructor (inherited key)', 'lat=12.9&lon=77.5&unit=constructor'],
    ['unit toString (inherited key)', 'lat=12.9&lon=77.5&unit=toString'],
  ];
  for (const [label, query] of bad) {
    const res = await call(query);
    const body = await res.json();
    eq(`${label} → 400`, res.status, 400);
    eq(`${label} → no-store`, res.headers.get('cache-control'), 'no-store');
    eq(`${label} → {error}`, typeof body.error, 'string');
  }

  {
    const res = await call('', {
      'x-vercel-ip-latitude': '12.97',
      'x-vercel-ip-longitude': '77.59',
      'x-vercel-ip-city': 'Bengaluru',
      'x-forwarded-for': '1.2.3.4',
    });
    eq('IP location headers without lat/lon → 400', res.status, 400);
  }
  {
    await call('lat=40.71&lon=-74.01', { 'x-vercel-ip-latitude': '12.97', 'x-vercel-ip-longitude': '77.59' });
    const up = calls.at(-1).url;
    eq('query wins over IP headers', [up.searchParams.get('latitude'), up.searchParams.get('longitude')], ['40.71', '-74.01']);
  }
  eq('no upstream call for any rejected request', calls.length, 1);

  /* ── 502: every way the upstream can fail ─────────────────────────────────── */

  const failures = [
    ['timeout', () => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError'); }, 'Weather service timed out'],
    ['abort', () => { throw new DOMException('This operation was aborted', 'AbortError'); }, 'Weather service timed out'],
    ['network error', () => { throw new TypeError('fetch failed: getaddrinfo ENOTFOUND api.open-meteo.com'); }, 'Weather service unreachable'],
    ['HTTP 503', reply({ reason: 'secret upstream detail' }, 503), 'Weather service answered HTTP 503'],
    ['HTTP 400', reply({ error: true, reason: 'Latitude must be in range' }, 400), 'Weather service answered HTTP 400'],
    ['not JSON', reply('<html>gateway</html>'), 'Weather service sent an unreadable answer'],
    ['no current block', reply({ latitude: 1 }), 'Weather service sent an unexpected answer'],
    ['JSON null', reply('null'), 'Weather service sent an unexpected answer'],
    ['field missing', reply({ current: { ...OK_BODY.current, cloud_cover: undefined } }), 'Weather service sent an unexpected answer'],
    ['field a string', reply({ current: { ...OK_BODY.current, temperature_2m: '27.6' } }), 'Weather service sent an unexpected answer'],
    ['is_day not 0/1', reply({ current: { ...OK_BODY.current, is_day: 2 } }), 'Weather service sent an unexpected answer'],
    ['cloud_cover > 100', reply({ current: { ...OK_BODY.current, cloud_cover: 140 } }), 'Weather service sent an unexpected answer'],
  ];
  for (const [label, answer, reason] of failures) {
    stub(answer);
    const res = await call('lat=12.97&lon=77.59');
    const text = await res.text();
    eq(`${label} → 502`, res.status, 502);
    eq(`${label} → no-store`, res.headers.get('cache-control'), 'no-store');
    eq(`${label} → short reason only`, JSON.parse(text), { error: reason });
    eq(`${label} → no upstream detail leaked`, /open-meteo|ENOTFOUND|secret|range|gateway/i.test(text), false);
  }

  // A real abort: the stub honours the signal it is given, and the signal fires.
  {
    const ctrl = new AbortController();
    const realTimeout = AbortSignal.timeout;
    AbortSignal.timeout = () => ctrl.signal;
    globalThis.fetch = (_input, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
    try {
      const pending = call('lat=12.97&lon=77.59');
      ctrl.abort(new DOMException('timed out', 'TimeoutError'));
      const res = await pending;
      eq('signal-driven timeout → 502', [res.status, (await res.json()).error], [502, 'Weather service timed out']);
    } finally {
      AbortSignal.timeout = realTimeout;
    }
  }
} finally {
  globalThis.fetch = realFetch;
}

eq('fetch restored', globalThis.fetch === realFetch, true);

console.log(`\ncontext-check: ${pass} passed, ${fail} failed — ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
