/**
 * Where the light comes from, for the relief wallpapers: the sun's real position at the owner's
 * chosen place (prefs.place), turned into the few numbers a 2D scene needs to look lit from one
 * side: a screen direction, how high the light stands, and how long the shadows fall.
 *
 * Pure and deterministic: zero imports, and the date is always passed in, so the minute clock drives
 * every repaint and solar-check can pin any instant. The place is only ever the one the owner chose
 * in Settings; with none, the sun follows this machine's clock (sunrise 06:00, sunset 18:00).
 *
 * The sun's position is NOAA's: the Solar Calculator's declination and equation of time, then the
 * "General Solar Position Calculations" steps (true solar time, hour angle, zenith, azimuth). It is
 * good to well under a minute and a hundredth of a degree, far finer than a wallpaper can show.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Sunrise and sunset are when the sun's centre is 0.833° below the horizon (refraction + its radius). */
const HORIZON = -0.833;
/** Civil twilight ends 6° below the horizon: below that is night. */
const TWILIGHT = -6;
/** Below 6° the light is low and warm: dawn in the morning, golden hour in the evening. */
const LOW_SUN = 6;
/** Within an hour (15°) of solar noon, with the sun above LOW_SUN, the phase reads "noon". */
const NOON_HALF = 15;

const SHADOW_NEAR = 4;
const SHADOW_FAR = 28;
const ELEV_MIN = 0.05;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** 0 → 0, 1 → 1, flat at both ends, so a hand-over starts and finishes without a kink. */
const smoothstep = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
/** Fold any angle into [-180, 180). */
const wrap180 = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;
const wrap360 = (deg) => ((deg % 360) + 360) % 360;
const isPlace = (p) => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lon);

/**
 * The sun's declination (radians) and the equation of time (minutes) at `date`, as NOAA's Solar
 * Calculator spreadsheet works them out from the Julian century (Meeus, "Astronomical Algorithms").
 *
 * Not NOAA's shorter fractional-year Fourier fit: that fit is pinned to a mid-20th-century year, and
 * in the 2020s its declination runs about 0.4° behind near the equinoxes (solar-check caught it at
 * New Delhi's March noon). This one stays within ~0.01° and a few seconds of time for centuries.
 */
function sunOrbit(date) {
  const T = (date.getTime() / 86400000 + 2440587.5 - 2451545) / 36525; // Julian centuries from J2000
  const L0 = wrap360(280.46646 + T * (36000.76983 + T * 0.0003032)) * RAD; // mean longitude
  const M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * RAD; // mean anomaly
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T); // orbit eccentricity
  const C = Math.sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * M) * (0.019993 - 0.000101 * T) + Math.sin(3 * M) * 0.000289; // equation of centre, °
  const omega = (125.04 - 1934.136 * T) * RAD;
  const lambda = (L0 * DEG + C - 0.00569 - 0.00478 * Math.sin(omega)) * RAD; // apparent longitude
  const eps = (23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
    + 0.00256 * Math.cos(omega)) * RAD; // obliquity, corrected for nutation
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const y = Math.tan(eps / 2) ** 2;
  const eqTime = 4 * DEG * (y * Math.sin(2 * L0) - 2 * e * Math.sin(M) + 4 * e * y * Math.sin(M) * Math.cos(2 * L0)
    - 0.5 * y * y * Math.sin(4 * L0) - 1.25 * e * e * Math.sin(2 * M));
  return { decl, eqTime };
}

/**
 * The sun at `date` seen from `lat`/`lon`. Everything runs on UTC, with the longitude doing the work
 * a time zone would: 4 minutes of solar time per degree east.
 */
function noaaSun(date, lat, lon) {
  const { decl, eqTime } = sunOrbit(date);
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  // True solar time (minutes), then the hour angle: 0 at solar noon, 15° an hour.
  const trueSolar = minutes + eqTime + 4 * lon;
  const ha = wrap180(trueSolar / 4 - 180);

  const phi = clamp(lat, -90, 90) * RAD;
  const h = ha * RAD;
  const cosZenith = clamp(Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(h), -1, 1);
  const altitude = 90 - Math.acos(cosZenith) * DEG;
  // Azimuth from north, clockwise. The atan2 form of NOAA's arccos expression: it needs no
  // morning/afternoon branch and stays defined when the sun is overhead.
  const azimuth = wrap360(Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) * DEG + 180);
  // The hour angle at which the sun crosses the horizon today: 180 when it never sets, 0 when it
  // never rises. computeLightVector hands the light to the moon between this and midnight.
  const denom = Math.cos(phi) * Math.cos(decl);
  const cosSet = Math.abs(denom) < 1e-9 ? (altitude > HORIZON ? -2 : 2)
    : (Math.sin(HORIZON * RAD) - Math.sin(phi) * Math.sin(decl)) / denom;
  const setHourAngleDeg = cosSet <= -1 ? 180 : cosSet >= 1 ? 0 : Math.acos(cosSet) * DEG;
  return { hourAngleDeg: ha, altitudeDeg: altitude, azimuthDeg: azimuth, setHourAngleDeg };
}

/**
 * The sun by the local clock alone, for when the owner has not chosen a place: solar noon at 12:00,
 * up at 06:00 and down at 18:00, 60° high at noon. Altitude 60·cos(hour angle) is exactly that day,
 * and keeps falling to -60° at midnight. The azimuth follows a northern-hemisphere arc (east, south,
 * west); no scene steers by it, it is only there so the shape of the answer never changes.
 */
function clockSun(date) {
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const ha = wrap180((hour - 12) * 15);
  return {
    hourAngleDeg: ha,
    altitudeDeg: 60 * Math.cos(ha * RAD),
    azimuthDeg: wrap360(180 + ha),
    setHourAngleDeg: Math.acos(HORIZON / 60) * DEG, // 60·cos(ha) = HORIZON: about 18:03

  };
}

function phaseOf(ha, altitude) {
  if (altitude < TWILIGHT) return 'night';
  const morning = ha < 0;
  // The list has one word for low morning light and two for the evening, so the morning's twilight
  // and first low hour are both "dawn", and the evening splits at sunset into golden, then dusk.
  if (altitude < LOW_SUN) return morning ? 'dawn' : altitude > HORIZON ? 'golden' : 'dusk';
  if (Math.abs(ha) <= NOON_HALF) return 'noon';
  return morning ? 'morning' : 'afternoon';
}

/**
 * The light's direction on screen, from an hour angle. The hour angle, not the compass azimuth,
 * drives it because it reads the same in both hemispheres: it is negative before solar noon and
 * positive after, everywhere. The noon sun stands due south in London and due north in Sydney, so a
 * compass mapping would mirror the picture across the equator; the hour angle keeps one story for
 * every owner: light from the right in the morning, from the top at noon, from the left at evening.
 *
 * Six hours either side of noon map linearly onto the right and left edges. Beyond that (a summer
 * sunrise far from the equator) the swing is compressed to at most 10° below the horizontal, so the
 * light never comes from underneath the relief.
 */
function screenAngle(ha) {
  const a = Math.abs(ha);
  const swing = a <= 90 ? a : 90 + (a - 90) / 9;
  return -Math.sign(ha) * swing; // degrees: 0 = up, +90 = right, -90 = left
}

/** a at t = 0, b at t = 1, each exactly, so the ends of a blend match the unblended values. */
const lerp = (a, b, t) => a * (1 - t) + b * t;

/**
 * How high the light stands, 0..1, given how far into the evening the light has turned (`night`,
 * 0..1). By day, sin(altitude) clamped to [0.05, 1], so a sun on the horizon still lights the scene a
 * little. By night a moon stands opposite the sun at a low "lunar rim" height, 0.25 at the end of
 * twilight rising to 0.45 as the sun sinks to its lowest, so night relief still casts shadows instead
 * of going flat. In twilight the two blend.
 */
function elevationOf(altitude, night) {
  const day = clamp(Math.sin(altitude * RAD), ELEV_MIN, 1);
  const moon = 0.25 + 0.2 * clamp(-Math.sin(altitude * RAD), 0, 1);
  return lerp(day, moon, night);
}

/**
 * The light at `date`: from the sun at `place` ({lat, lon}) when the owner chose one, otherwise from
 * the local clock. See the module comment for what each field means.
 *
 * @returns {{hourAngleDeg: number, altitudeDeg: number, azimuthDeg: number, isDay: boolean,
 *   phase: 'night'|'dawn'|'morning'|'noon'|'afternoon'|'golden'|'dusk', elevation: number,
 *   dx: number, dy: number, shadowDx: number, shadowDy: number, angleDeg: number}}
 */
export function computeLightVector(date, place = null) {
  const sun = isPlace(place) ? noaaSun(date, place.lat, place.lon) : clockSun(date);
  const { hourAngleDeg, altitudeDeg, azimuthDeg } = sun;
  const isDay = altitudeDeg > HORIZON;
  // At night the light is the moon, opposite the sun: its hour angle is the sun's plus 180°. Through
  // civil twilight (sunset to 6° below) the light turns from the sun to the moon, so nothing jumps to
  // the other side at sunset or sunrise. The two angles always have opposite signs, so the blend runs
  // across the top (0°) and never underneath. With no place the band is 05:37–05:57 and 18:03–18:23.
  const night = clamp((HORIZON - altitudeDeg) / (HORIZON - TWILIGHT), 0, 1);
  const elevation = elevationOf(altitudeDeg, night);
  // Two flips must carry no weight. The sun's own screen angle flips side at solar midnight (±100°
  // at hour angle ±180), and in summer at 60-66° latitude the sun is only just below the horizon
  // then, so twilight depth alone never hands the light fully to the moon. So while the sun is down,
  // the moon's share also ramps from the sunset hour angle (0) to midnight (1): continuous at the
  // horizon, complete at the flip. The moon's angle flips at solar NOON instead, which only matters
  // in polar night (sun below the horizon at noon); there the sun keeps the light near noon.
  let toMoon = night;
  if (altitudeDeg < HORIZON) {
    const set = sun.setHourAngleDeg;
    const toMidnight = set >= 180 ? 1 : smoothstep((Math.abs(hourAngleDeg) - set) / (180 - set));
    toMoon = Math.max(night, toMidnight) * smoothstep(Math.abs(hourAngleDeg) / 30);
  }
  const angle = lerp(screenAngle(hourAngleDeg), screenAngle(wrap180(hourAngleDeg + 180)), toMoon) * RAD;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  // Shadows run away from the light: 4px with the sun overhead, 28px with it on the horizon, linear
  // in elevation between.
  const length = SHADOW_NEAR + (SHADOW_FAR - SHADOW_NEAR) * ((1 - elevation) / (1 - ELEV_MIN));
  return {
    hourAngleDeg,
    altitudeDeg,
    azimuthDeg,
    isDay,
    phase: phaseOf(hourAngleDeg, altitudeDeg),
    elevation,
    dx,
    dy,
    shadowDx: -dx * length,
    shadowDy: -dy * length,
    angleDeg: wrap360(Math.atan2(dx, -dy) * DEG),
  };
}

/** toFixed without the "-0.0" a tiny negative leaves behind. */
const fixed = (v, dp) => {
  const s = v.toFixed(dp);
  return Number(s) === 0 ? (0).toFixed(dp) : s;
};

/** The light as CSS custom properties, for a stage's style: scenes and CSS read the same numbers. */
export function lightStyleVars(light) {
  return {
    '--light-dx': fixed(light.dx, 3),
    '--light-dy': fixed(light.dy, 3),
    '--shadow-x': `${fixed(light.shadowDx, 1)}px`,
    '--shadow-y': `${fixed(light.shadowDy, 1)}px`,
    '--bevel-x': `${fixed(light.dx * 1.5, 2)}px`,
    '--bevel-y': `${fixed(light.dy * 1.5, 2)}px`,
    '--light-angle': `${Math.round(light.angleDeg) % 360}deg`,
    '--light-elev': fixed(light.elevation, 3),
  };
}
