/**
 * Weather from Open-Meteo (open-meteo.com): no API key, CORS-enabled, and plain fetch — so it works
 * in Plash's WebKit view exactly as in any browser. Data is CC BY 4.0; the credit sits in
 * Settings → Wallpaper mode beside the location picker.
 *
 * Nothing here is ever invented. No place chosen means no weather, and a failed request reports
 * itself as unavailable rather than falling back to a plausible-looking number.
 */
import { Sun, Moon, CloudSun, CloudMoon, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';

const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';

/** WMO weather interpretation codes, as documented by Open-Meteo. */
const WMO = [
  [[0], 'Clear', Sun, Moon],
  [[1], 'Mostly clear', CloudSun, CloudMoon],
  [[2], 'Partly cloudy', CloudSun, CloudMoon],
  [[3], 'Overcast', Cloud],
  [[45, 48], 'Fog', CloudFog],
  [[51, 53, 55, 56, 57], 'Drizzle', CloudDrizzle],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Rain', CloudRain],
  [[71, 73, 75, 77, 85, 86], 'Snow', CloudSnow],
  [[95, 96, 99], 'Thunderstorm', CloudLightning],
];

export function describeCode(code, isDay = true) {
  const row = WMO.find(([codes]) => codes.includes(code));
  if (!row) return { label: 'Unknown', Icon: Cloud };
  const [, label, dayIcon, nightIcon] = row;
  return { label, Icon: !isDay && nightIcon ? nightIcon : dayIcon };
}

export async function fetchWeather({ lat, lon }, unit) {
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '1',
  });
  if (unit === 'f') q.set('temperature_unit', 'fahrenheit');
  const res = await fetch(`${FORECAST}?${q}`);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();
  const c = data.current;
  if (!c || typeof c.temperature_2m !== 'number') throw new Error('Open-Meteo: no current conditions');
  return {
    temp: Math.round(c.temperature_2m),
    code: c.weather_code,
    isDay: c.is_day === 1,
    high: Math.round(data.daily?.temperature_2m_max?.[0]),
    low: Math.round(data.daily?.temperature_2m_min?.[0]),
  };
}

/** Place search for the Settings picker. */
export async function searchPlaces(name) {
  const q = new URLSearchParams({ name, count: '6', language: navigator.language?.slice(0, 2) || 'en', format: 'json' });
  const res = await fetch(`${GEOCODE}?${q}`);
  if (!res.ok) throw new Error(`Open-Meteo geocoding ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((r) => ({
    name: r.name,
    detail: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}
