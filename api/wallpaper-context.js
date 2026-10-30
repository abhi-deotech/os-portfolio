// GET /api/wallpaper-context?lat=12.97&lon=77.59[&unit=c|f]
// The current weather at the place the owner chose in Settings, for the relief wallpapers. The place
// always comes from the query: this endpoint never reads x-vercel-ip-* or any other request header,
// because the location is chosen, never guessed. The answer depends on nothing but the URL, so the
// CDN may share it between callers.
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const FETCH_TIMEOUT_MS = 5000;
const CURRENT_FIELDS = 'temperature_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,cloud_cover';
const UNITS = { c: 'celsius', f: 'fahrenheit' };
// A plain decimal: no hex, no exponent, no blank string that Number() would read as 0.
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function json(status, body, cacheControl = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': cacheControl },
  });
}

// Two decimals is about a kilometre: plenty for weather, and it keeps the CDN cache key coarse.
const round2 = (n) => Math.round(n * 100) / 100;

function coordinate(raw, limit) {
  if (raw === null || !DECIMAL.test(raw.trim())) return null;
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= limit ? round2(n) : null;
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// Open-Meteo's `current` block, checked field by field; null when anything is missing or off.
function readCurrent(data) {
  const c = data && typeof data === 'object' ? data.current : null;
  if (!c || typeof c !== 'object') return null;
  const fields = [c.temperature_2m, c.weather_code, c.is_day, c.wind_speed_10m, c.wind_direction_10m, c.cloud_cover];
  if (!fields.every(isNum)) return null;
  if (c.is_day !== 0 && c.is_day !== 1) return null;
  if (c.cloud_cover < 0 || c.cloud_cover > 100 || c.wind_speed_10m < 0) return null;
  return {
    temp: Math.round(c.temperature_2m),
    code: Math.round(c.weather_code),
    isDay: c.is_day === 1,
    windSpeed: Math.round(c.wind_speed_10m),
    windDir: ((Math.round(c.wind_direction_10m) % 360) + 360) % 360,
    cloudCover: round2(c.cloud_cover / 100),
  };
}

export async function GET(request) {
  const url = new URL(request.url);
  const lat = coordinate(url.searchParams.get('lat'), 90);
  const lon = coordinate(url.searchParams.get('lon'), 180);
  if (lat === null || lon === null) return json(400, { error: 'lat and lon are required (|lat| ≤ 90, |lon| ≤ 180)' });
  const unit = url.searchParams.get('unit') ?? 'c';
  // Own keys only: a plain-object lookup would let __proto__, constructor or toString through.
  if (!Object.hasOwn(UNITS, unit)) return json(400, { error: 'unit must be c or f' });

  const upstream = new URL(FORECAST_URL);
  upstream.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: CURRENT_FIELDS,
    temperature_unit: UNITS[unit],
    wind_speed_unit: 'kmh',
    timezone: 'auto',
  }).toString();

  // Short fixed reasons only: nothing from the upstream (its message, body or URL) is echoed back.
  let weather;
  try {
    const res = await fetch(upstream, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return json(502, { error: `Weather service answered HTTP ${res.status}` });
    weather = readCurrent(await res.json());
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    const syntax = err instanceof SyntaxError;
    return json(502, { error: timedOut ? 'Weather service timed out' : syntax ? 'Weather service sent an unreadable answer' : 'Weather service unreachable' });
  }
  if (!weather) return json(502, { error: 'Weather service sent an unexpected answer' });

  return json(200, { place: { lat, lon }, weather }, 'public, s-maxage=600, stale-while-revalidate=1800');
}
