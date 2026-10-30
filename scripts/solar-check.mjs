#!/usr/bin/env node
/**
 * solar-check — proves src/wallpaper/solar.js, the light behind the relief wallpapers.
 *
 * Part 1 holds the sun's position to answers from outside the module: the US Naval Observatory's
 * published rise, transit and set times for four cities and dates, the textbook noon altitude
 * 90 − |latitude − declination| at the equinox and both solstices, and a sunrise due east at an
 * equinox. Nothing here is computed by the module and then compared with itself.
 *
 * Part 2 checks the mapping onto the screen: a unit light vector; morning light from the right, noon
 * from the top and evening from the left in BOTH hemispheres; shadows 4..28px and longer as the sun
 * sinks; the CSS angle; the lunar rim at night; the turn from sun to moon through twilight, minute by
 * minute; the clock model with no place; the CSS variables; determinism; and that the source never
 * reads the clock itself.
 *
 *   node scripts/solar-check.mjs
 */
import { readFileSync } from 'node:fs';
import { computeLightVector, lightStyleVars } from '../src/wallpaper/solar.js';

let pass = 0;
let fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) pass++;
  else { fail++; console.error(`  FAIL ${label}\n       got  ${g}\n       want ${w}`); }
};
const ok = (label, cond, detail = '') => {
  if (cond) pass++;
  else { fail++; console.error(`  FAIL ${label}${detail ? `\n       ${detail}` : ''}`); }
};
const near = (label, got, want, tol, unit = '') =>
  ok(label, Math.abs(got - want) <= tol, `got ${got.toFixed(3)}${unit}, want ${want}${unit} ± ${tol}`);

const MIN = 60000;
const utc = (s) => new Date(`${s}Z`);
const minutesApart = (a, b) => (a.getTime() - b.getTime()) / MIN;
const hhmm = (d) => d.toISOString().slice(11, 16);

/** The first instant after `from`, within `hours`, where `test` flips from false to true; to the second. */
function crossing(from, hours, test) {
  let t = from.getTime();
  const end = t + hours * 3600000;
  let prev = test(new Date(t));
  for (t += MIN; t <= end; t += MIN) {
    const cur = test(new Date(t));
    if (cur && !prev) {
      let lo = t - MIN;
      let hi = t;
      while (hi - lo > 1000) {
        const mid = (lo + hi) / 2;
        if (test(new Date(mid))) hi = mid; else lo = mid;
      }
      return new Date(hi);
    }
    prev = cur;
  }
  return null;
}
const sunrise = (from, place) => crossing(from, 24, (d) => computeLightVector(d, place).isDay);
const sunset = (from, place) => crossing(from, 24, (d) => !computeLightVector(d, place).isDay);
const solarNoon = (from, place) => crossing(from, 24, (d) => computeLightVector(d, place).hourAngleDeg >= 0 && computeLightVector(d, place).hourAngleDeg < 90);

/* ── Part 1: the sun against published values ──────────────────────────────── */

const LONDON = { name: 'London', lat: 51.5074, lon: -0.1278 };
const SYDNEY = { name: 'Sydney', lat: -33.8688, lon: 151.2093 };
const DELHI = { name: 'New Delhi', lat: 28.6139, lon: 77.209 };
const NEW_YORK = { name: 'New York', lat: 40.7128, lon: -74.006 };
const QUITO = { name: 'Quito', lat: -0.1807, lon: -78.4678 };
const TROMSO = { name: 'Tromsø', lat: 69.6492, lon: 18.9553 };

// US Naval Observatory, Astronomical Applications API "Sun and Moon data for one day", fetched
// 2026-10-30: https://aa.usno.navy.mil/api/rstt/oneday?date=<date>&coords=<lat>,<lon>&tz=0
// Times are UTC, rounded to the minute; USNO's rise/set is the upper limb at the refracted horizon,
// the same -0.833° the module uses. Tolerance 1 min: USNO rounds to the minute. `search` is where
// the scan starts, a few hours before the events.
const USNO = [
  { place: LONDON, rise: '2026-06-21T03:43', noon: '2026-06-21T12:02', set: '2026-06-21T20:22', search: '2026-06-21T00:00' },
  { place: SYDNEY, rise: '2026-12-21T18:41', noon: '2026-12-21T01:53', set: '2026-12-21T09:05', search: '2026-12-20T20:00' },
  { place: DELHI, rise: '2026-03-20T00:55', noon: '2026-03-20T06:59', set: '2026-03-20T13:02', search: '2026-03-19T20:00' },
  { place: NEW_YORK, rise: '2026-10-30T11:24', noon: '2026-10-30T16:40', set: '2026-10-30T21:55', search: '2026-10-30T06:00' },
];
for (const { place, rise, noon, set, search } of USNO) {
  const from = utc(search);
  // Sydney's listed sunrise falls after its sunset on that UTC date, so it is searched from the set.
  const r = sunrise(place.name === 'Sydney' ? utc('2026-12-21T12:00') : from, place);
  const n = solarNoon(from, place);
  const s = sunset(from, place);
  for (const [what, got, want] of [['sunrise', r, rise], ['solar noon', n, noon], ['sunset', s, set]]) {
    if (!got) { ok(`${place.name} ${what} found`, false); continue; }
    ok(`${place.name} ${what} vs USNO ${want.slice(11)}Z`, Math.abs(minutesApart(got, utc(want))) <= 1,
      `got ${hhmm(got)}Z (${minutesApart(got, utc(want)).toFixed(1)} min off)`);
  }
}

// Noon altitude = 90 − |lat − δ|. δ ≈ 0 at the March equinox (2026-03-20 14:46Z; Delhi's noon is
// 8 h earlier, when δ ≈ −0.13°), +23.44° at the June solstice (2026-06-21 08:24Z), −23.44° at the
// December one (2026-12-21 20:50Z). Tolerances cover the hours between noon and the exact moment.
for (const [label, place, from, decl, tol] of [
  ['equinox, New Delhi', DELHI, '2026-03-19T20:00', 0, 0.5],
  ['equinox, Quito', QUITO, '2026-03-20T08:00', 0, 0.5],
  ['June solstice, London', LONDON, '2026-06-21T00:00', 23.44, 0.3],
  ['June solstice, Sydney', SYDNEY, '2026-06-20T20:00', 23.44, 0.3],
  ['December solstice, Sydney', SYDNEY, '2026-12-20T20:00', -23.44, 0.3],
  ['December solstice, New York', NEW_YORK, '2026-12-21T06:00', -23.44, 0.3],
]) {
  const n = solarNoon(utc(from), place);
  near(`noon altitude, ${label}`, computeLightVector(n, place).altitudeDeg, 90 - Math.abs(place.lat - decl), tol, '°');
}

// At an equinox (δ = 0) the sun rises due east and sets due west, except that "risen" means 0.833°
// below the horizon, which spherical trig puts at azimuth acos(tan φ · tan 0.833°) from north:
// 89.99° at Quito, 89.5° at New Delhi, 88.95° at London. δ drifts ±0.2° over the day, hence ± 0.5°.
for (const [place, from] of [[QUITO, '2026-03-20T06:00'], [DELHI, '2026-03-19T20:00'], [LONDON, '2026-03-20T00:00']]) {
  const east = Math.acos(Math.tan(place.lat * Math.PI / 180) * Math.tan(0.833 * Math.PI / 180)) * 180 / Math.PI;
  near(`equinox sunrise azimuth, ${place.name}`, computeLightVector(sunrise(utc(from), place), place).azimuthDeg, east, 0.5, '°');
  near(`equinox sunset azimuth, ${place.name}`, computeLightVector(sunset(utc(from), place), place).azimuthDeg, 360 - east, 0.5, '°');
}
// The noon sun is due south north of the tropics and due north south of them.
near('noon azimuth, London (south)', computeLightVector(utc('2026-06-21T12:02'), LONDON).azimuthDeg, 180, 1.5, '°');
{
  const az = computeLightVector(utc('2026-12-21T01:53'), SYDNEY).azimuthDeg;
  // Within a few degrees of due north; near the solstice Sydney's noon sun is high, so azimuth swings fast.
  ok('noon azimuth, Sydney (north)', Math.min(az, 360 - az) <= 6, `got ${az.toFixed(2)}°`);
}

// Polar extremes: Tromsø has no sunrise at the December solstice and no sunset at the June one.
{
  const days = (from, place) => Array.from({ length: 24 * 12 }, (_, i) => computeLightVector(new Date(utc(from).getTime() + i * 5 * MIN), place));
  ok('Tromsø, December solstice: never day', days('2026-12-21T00:00', TROMSO).every((l) => !l.isDay));
  const summer = days('2026-06-21T00:00', TROMSO);
  ok('Tromsø, June solstice: never night', summer.every((l) => l.isDay));
  // A midnight sun stands at hour angle ±180; the light may dip at most 10° below the horizontal.
  ok('Tromsø midnight sun: light at most 10° below horizontal', summer.every((l) => l.dy <= Math.sin(10 * Math.PI / 180) + 1e-9),
    `max dy ${Math.max(...summer.map((l) => l.dy)).toFixed(3)}`);
}

/* ── Part 2: the screen mapping ─────────────────────────────────────────────── */

/** Every 10 minutes of a day at `place` (null = the clock model, local midnight to midnight). */
const sweep = (place, fromUtc = '2026-06-21T00:00') => {
  const start = place ? utc(fromUtc).getTime() : new Date(2026, 5, 21).getTime();
  return Array.from({ length: 144 }, (_, i) => computeLightVector(new Date(start + i * 10 * MIN), place));
};
const PLACES = [LONDON, SYDNEY, DELHI, NEW_YORK, QUITO, TROMSO, null];
const all = [];
for (const place of PLACES) for (const from of ['2026-03-20T00:00', '2026-06-21T00:00', '2026-12-21T00:00']) all.push(...sweep(place, from));

ok('(dx, dy) is a unit vector', all.every((l) => Math.abs(Math.hypot(l.dx, l.dy) - 1) < 1e-9));
ok('angleDeg = atan2(dx, -dy) in [0, 360)', all.every((l) => {
  const want = ((Math.atan2(l.dx, -l.dy) * 180) / Math.PI + 360) % 360;
  return l.angleDeg >= 0 && l.angleDeg < 360 && Math.abs(((l.angleDeg - want + 540) % 360) - 180) < 1e-9;
}));
ok('shadow points away from the light', all.every((l) => {
  const len = Math.hypot(l.shadowDx, l.shadowDy);
  return Math.abs(l.shadowDx + l.dx * len) < 1e-9 && Math.abs(l.shadowDy + l.dy * len) < 1e-9;
}));
{
  const lens = all.map((l) => [l.elevation, Math.hypot(l.shadowDx, l.shadowDy)]).sort((a, b) => a[0] - b[0]);
  ok('shadow length within 4..28px', lens.every(([, len]) => len >= 4 - 1e-9 && len <= 28 + 1e-9));
  ok('shadow length never grows as the light rises', lens.every(([e, len], i) => i === 0 || e === lens[i - 1][0] || len <= lens[i - 1][1] + 1e-9));
  const horizon = all.find((l) => l.isDay && l.elevation === 0.05);
  ok('sun on the horizon: 28px shadow', horizon && Math.abs(Math.hypot(horizon.shadowDx, horizon.shadowDy) - 28) < 1e-9);
  // The sun is overhead on the equator at an equinox noon (Quito, 2026-03-20 ~17:21Z).
  const overhead = computeLightVector(solarNoon(utc('2026-03-20T08:00'), { lat: 0, lon: QUITO.lon }), { lat: 0, lon: QUITO.lon });
  near('sun overhead: 4px shadow', Math.hypot(overhead.shadowDx, overhead.shadowDy), 4, 0.01, 'px');
}
ok('day elevation within [0.05, 1]', all.filter((l) => l.isDay).every((l) => l.elevation >= 0.05 && l.elevation <= 1));
{
  // Below civil twilight (-6°) the light is the moon; between sunset and -6° it blends up from the
  // sun's 0.05 to the moon's 0.25 + 0.2·sin 6°.
  const range = (ls) => `range ${Math.min(...ls.map((l) => l.elevation))}..${Math.max(...ls.map((l) => l.elevation))}`;
  const night = all.filter((l) => l.altitudeDeg <= -6);
  const twilight = all.filter((l) => !l.isDay && l.altitudeDeg > -6);
  ok('night elevation (lunar rim) within [0.25, 0.45]', night.every((l) => l.elevation >= 0.25 && l.elevation <= 0.45), range(night));
  ok('twilight elevation within [0.05, 0.271]', twilight.length > 0
    && twilight.every((l) => l.elevation >= 0.05 && l.elevation <= 0.25 + 0.2 * Math.sin(6 * Math.PI / 180) + 1e-9), range(twilight));
}
ok('isDay is altitude > -0.833', all.every((l) => l.isDay === l.altitudeDeg > -0.833));

// Morning from the right, noon from the top, evening from the left: the same in both hemispheres.
// Times are local mean times converted to UTC: London ≈ UTC, Sydney ≈ UTC+10.
for (const [place, morning, noon, evening] of [
  [LONDON, '2026-06-21T08:00', '2026-06-21T12:02', '2026-06-21T17:00'],
  [LONDON, '2026-12-21T10:00', '2026-12-21T12:00', '2026-12-21T14:30'],
  [SYDNEY, '2026-12-20T22:00', '2026-12-21T01:53', '2026-12-21T07:00'],
  [SYDNEY, '2026-06-20T23:30', '2026-06-21T01:56', '2026-06-21T04:30'],
]) {
  const [m, n, e] = [morning, noon, evening].map((s) => computeLightVector(utc(s), place));
  const when = morning.slice(0, 10);
  ok(`${place.name} ${when} morning: daylight from the right`, m.isDay && m.dx > 0.3, `dx ${m.dx.toFixed(3)}`);
  ok(`${place.name} ${when} noon: from the top`, n.isDay && n.dy < -0.99 && Math.abs(n.dx) < 0.1, `dx ${n.dx.toFixed(3)} dy ${n.dy.toFixed(3)}`);
  ok(`${place.name} ${when} evening: from the left`, e.isDay && e.dx < -0.3, `dx ${e.dx.toFixed(3)}`);
  ok(`${place.name} ${when} morning shadow falls left`, m.shadowDx < 0);
}
// At night the moon stands opposite the sun: at local midnight it is at the top.
{
  const l = computeLightVector(utc('2026-06-21T00:00'), LONDON);
  ok('London midnight: night, moonlight from the top', !l.isDay && l.dy < -0.99, `dy ${l.dy.toFixed(3)}`);
}

// Sunrise and sunset turn the light between the sun and the moon (opposite sides) across twilight,
// over the top, instead of flipping it in one minute tick. Civil twilight lasts 20-35 minutes for the
// ~180° turn, so a step runs 5-9° a minute (the clock model's 20-minute band is the steepest); 10° at
// most keeps a 28px shadow's tip moving under 5px a minute. The flip this replaces was ~180°.
{
  const MAX_TURN = 10;
  const MAX_RISE = 0.02;
  const turn = (a, b) => Math.abs(((b.angleDeg - a.angleDeg + 540) % 360) - 180);
  /** Every minute from 90 before `at` to 90 after: worst turn, worst elevation step, highest dy, ends. */
  const walk = (at, place) => {
    const ls = Array.from({ length: 181 }, (_, i) => computeLightVector(new Date(at.getTime() + (i - 90) * MIN), place));
    let maxTurn = 0;
    let maxRise = 0;
    for (let i = 1; i < ls.length; i++) {
      maxTurn = Math.max(maxTurn, turn(ls[i - 1], ls[i]));
      maxRise = Math.max(maxRise, Math.abs(ls[i].elevation - ls[i - 1].elevation));
    }
    return { maxTurn, maxRise, topDy: Math.min(...ls.map((l) => l.dy)), first: ls[0], last: ls[ls.length - 1] };
  };
  const events = [];
  for (const [place, from] of [[LONDON, '2026-03-20T00:00'], [SYDNEY, '2026-06-20T18:00']]) {
    events.push([`${place.name} ${from.slice(0, 10)} sunrise`, sunrise(utc(from), place), place]);
    events.push([`${place.name} ${from.slice(0, 10)} sunset`, sunset(utc(from), place), place]);
  }
  events.push(['clock model sunrise', new Date(2026, 9, 30, 6), null], ['clock model sunset', new Date(2026, 9, 30, 18), null]);
  for (const [label, at, place] of events) {
    if (!at) { ok(`${label} found`, false); continue; }
    const w = walk(at, place);
    ok(`${label}: light turns at most ${MAX_TURN}° a minute`, w.maxTurn <= MAX_TURN, `worst ${w.maxTurn.toFixed(2)}°`);
    ok(`${label}: elevation moves at most ${MAX_RISE} a minute`, w.maxRise <= MAX_RISE, `worst ${w.maxRise.toFixed(4)}`);
    // It really does end on the other side, and it gets there over the top.
    ok(`${label}: ends on the other side`, Math.sign(w.first.dx) === -Math.sign(w.last.dx) && Math.abs(w.first.dx) > 0.5 && Math.abs(w.last.dx) > 0.5,
      `dx ${w.first.dx.toFixed(3)} -> ${w.last.dx.toFixed(3)}`);
    ok(`${label}: turns through the top`, w.topDy < -0.99, `highest dy ${w.topDy.toFixed(3)}`);
  }

  // Midsummer at 60-66°N: the sun dips into twilight at solar midnight without setting for long, and
  // used to drag the light across the screen in one minute there (Reykjavik ~139°). Every minute of
  // the whole day stays under the same bound. (Tromsø's midnight SUN, which never dips, keeps its
  // documented flip: it is outside twilight and out of scope.)
  // Polar night (Tromsø in December) is the mirror case: the moon's angle flips at solar noon, with
  // the sun only just below the horizon; London on an ordinary day is the control.
  const allDay = [['Reykjavik', 64.15, -21.94], ['Fairbanks', 64.84, -147.72], ['Trondheim', 63.43, 10.39], ['Anchorage', 61.22, -149.9]]
    .flatMap(([name, lat, lon]) => ['2026-05-20', '2026-06-21'].map((day) => [name, lat, lon, day]))
    .concat([['Tromsø', 69.65, 18.96, '2026-12-21'], ['Tromsø', 69.65, 18.96, '2027-01-05'], ['London', 51.5, -0.13, '2026-10-30']]);
  for (const [name, lat, lon, day] of allDay) {
    const place = { name, lat, lon };
    {
      const start = utc(`${day}T00:00`).getTime();
      let worst = 0;
      let worstRise = 0;
      let prev = computeLightVector(new Date(start), place);
      for (let i = 1; i <= 24 * 60; i++) {
        const l = computeLightVector(new Date(start + i * MIN), place);
        worst = Math.max(worst, turn(prev, l));
        worstRise = Math.max(worstRise, Math.abs(l.elevation - prev.elevation));
        prev = l;
      }
      ok(`${name} ${day}: light turns at most ${MAX_TURN}° a minute all day`, worst <= MAX_TURN, `worst ${worst.toFixed(2)}°`);
      ok(`${name} ${day}: elevation moves at most ${MAX_RISE} a minute all day`, worstRise <= MAX_RISE, `worst ${worstRise.toFixed(4)}`);
    }
  }
}

// Phases come in the day's order, each once (London at the equinox).
{
  const seq = sweep(LONDON, '2026-03-20T00:00').map((l) => l.phase).filter((p, i, a) => p !== a[i - 1]);
  eq('London equinox phase order', seq, ['night', 'dawn', 'morning', 'noon', 'afternoon', 'golden', 'dusk', 'night']);
}

// No place: the clock model. 06:00 up, 12:00 at 60°, 18:00 down, on this machine's clock.
{
  const at = (h, m = 0) => computeLightVector(new Date(2026, 9, 30, h, m), null);
  near('clock model 06:00: altitude 0', at(6).altitudeDeg, 0, 1e-9, '°');
  near('clock model 12:00: altitude 60', at(12).altitudeDeg, 60, 1e-9, '°');
  near('clock model 18:00: altitude 0', at(18).altitudeDeg, 0, 1e-9, '°');
  eq('clock model hour angles 06/09/12/15/18', [6, 9, 12, 15, 18].map((h) => Math.round(at(h).hourAngleDeg)), [-90, -45, 0, 45, 90]);
  eq('clock model day/night 05:50, 06:10, 17:50, 18:10', [at(5, 50), at(6, 10), at(17, 50), at(18, 10)].map((l) => l.isDay), [false, true, true, false]);
  eq('clock model phases 03/06:10/09/12/15/17:50/18:10', [at(3), at(6, 10), at(9), at(12), at(15), at(17, 50), at(18, 10)].map((l) => l.phase),
    ['night', 'dawn', 'morning', 'noon', 'afternoon', 'golden', 'dusk']);
  ok('clock model 06:00: light from the right', Math.abs(at(6).dx - 1) < 1e-9);
  ok('clock model 18:00: light from the left', Math.abs(at(18).dx + 1) < 1e-9);
  ok('clock model 12:00: light from the top', Math.abs(at(12).dy + 1) < 1e-9);
  // Midnight: sun 60° down, so the moon is at the top at 0.25 + 0.2·sin 60° = 0.4232.
  near('clock model midnight: lunar rim', at(0).elevation, 0.25 + 0.2 * Math.sin(Math.PI / 3), 1e-9);
  ok('clock model midnight: moonlight from the top', Math.abs(at(0).dy + 1) < 1e-9);
  eq('a place without numbers is the clock model', computeLightVector(new Date(2026, 9, 30, 9), { name: 'x' }), at(9));
  eq('default place is the clock model', computeLightVector(new Date(2026, 9, 30, 9)), at(9));
}

// CSS variables, from a hand-built light so the expected strings are independent of the module.
eq('lightStyleVars format', lightStyleVars({ dx: 0.6, dy: -0.8, shadowDx: -7.2, shadowDy: 9.6, angleDeg: 36.8699, elevation: 0.5 }), {
  '--light-dx': '0.600', '--light-dy': '-0.800', '--shadow-x': '-7.2px', '--shadow-y': '9.6px',
  '--bevel-x': '0.90px', '--bevel-y': '-1.20px', '--light-angle': '37deg', '--light-elev': '0.500',
});
eq('lightStyleVars: no "-0", 359.7° rounds to 0deg', lightStyleVars({ dx: -0.0001, dy: -1, shadowDx: 0.0001, shadowDy: 4, angleDeg: 359.7, elevation: 1 }), {
  '--light-dx': '0.000', '--light-dy': '-1.000', '--shadow-x': '0.0px', '--shadow-y': '4.0px',
  '--bevel-x': '0.00px', '--bevel-y': '-1.50px', '--light-angle': '0deg', '--light-elev': '1.000',
});
{
  const vars = lightStyleVars(computeLightVector(utc('2026-10-30T09:30'), DELHI));
  ok('lightStyleVars on a real light: every value well-formed', Object.entries({
    '--light-dx': /^-?\d\.\d{3}$/, '--light-dy': /^-?\d\.\d{3}$/, '--shadow-x': /^-?\d+\.\dpx$/, '--shadow-y': /^-?\d+\.\dpx$/,
    '--bevel-x': /^-?\d\.\d{2}px$/, '--bevel-y': /^-?\d\.\d{2}px$/, '--light-angle': /^\d{1,3}deg$/, '--light-elev': /^\d\.\d{3}$/,
  }).every(([k, re]) => re.test(vars[k])) && Object.keys(vars).length === 8, JSON.stringify(vars));
}

// Deterministic: the same instant and place give the same answer, and the date is not touched.
{
  const d = utc('2026-10-30T09:30');
  const before = d.getTime();
  eq('deterministic with a place', computeLightVector(d, DELHI), computeLightVector(new Date(before), DELHI));
  eq('deterministic without one', computeLightVector(d), computeLightVector(new Date(before)));
  eq('date not mutated', d.getTime(), before);
}

// The module never reads the clock or chance itself, and imports nothing.
{
  const src = readFileSync(new URL('../src/wallpaper/solar.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  ok('no Date.now in solar.js', !/Date\.now/.test(src));
  ok('no new Date() in solar.js', !/new\s+Date\s*\(/.test(src));
  ok('no Math.random in solar.js', !/Math\.random/.test(src));
  ok('no imports in solar.js', !/^\s*import\b/m.test(src));
}

console.log(`\nsolar-check: ${pass} passed, ${fail} failed — ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
