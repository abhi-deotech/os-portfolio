/**
 * Pure date helpers for the wallpaper widgets. No React, so the harness can import them directly.
 */

/** `hour` pref → the `hour12` option. 'auto' leaves it to the locale. */
const hour12Of = (hour) => (hour === 'auto' ? undefined : hour === '12');

const FORMATTERS = new Map();
/** Intl formatters are costly to build and these render every minute, so each is built once. */
export function formatter(key, options) {
  let f = FORMATTERS.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(undefined, options);
    FORMATTERS.set(key, f);
  }
  return f;
}

/** Time split into the digits and the AM/PM marker, so the marker can be set smaller. */
export function timeParts(date, hour, timeZone) {
  const f = formatter(`t|${hour}|${timeZone ?? ''}`, {
    hour: 'numeric', minute: '2-digit', hour12: hour12Of(hour), timeZone,
  });
  const parts = f.formatToParts(date);
  const period = parts.find((p) => p.type === 'dayPeriod')?.value ?? '';
  const digits = parts
    .filter((p) => p.type !== 'dayPeriod')
    .map((p) => p.value)
    .join('')
    .trim();
  return { digits, period };
}

/** The wall-clock fields of `date` as seen in `timeZone`. */
function fieldsIn(date, timeZone) {
  const f = formatter(`f|${timeZone}`, {
    timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  });
  const out = {};
  for (const p of f.formatToParts(date)) if (p.type !== 'literal') out[p.type] = Number(p.value);
  return out;
}

/**
 * How a zone relates to the local clock: hours ahead (may be fractional, e.g. +5.5) and whether its
 * date is yesterday, today or tomorrow from here. Computed from wall-clock fields rather than
 * `timeZoneName: 'shortOffset'`, which older WebKit builds do not support.
 */
export function zoneRelation(date, timeZone) {
  const z = fieldsIn(date, timeZone);
  const zoneAsUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute);
  const localAsUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes());
  const hours = Math.round((zoneAsUtc - localAsUtc) / 900_000) / 4; // quarter-hour zones exist
  const dayDiff = Math.round(
    (Date.UTC(z.year, z.month - 1, z.day) - Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86_400_000,
  );
  return { hours, dayDiff };
}

/** "Europe/London" → "London", "America/Port_of_Spain" → "Port of Spain". */
export const cityOf = (zone) => zone.split('/').pop().replace(/_/g, ' ');

/** ISO-8601 week number. */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7);
}

export function dayOfYear(date) {
  return Math.round(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / 86_400_000,
  ) + 1;
}

export const daysInYear = (year) => ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365);

/** Fraction of the local day elapsed, 0..1. */
export const dayFraction = (date) => (date.getHours() * 60 + date.getMinutes()) / 1440;

/**
 * First day of the week for the visitor's locale, 1 = Monday … 7 = Sunday. WebKit exposes
 * `weekInfo` as a property, Chromium as `getWeekInfo()`, and Firefox has neither — there the region
 * decides, so a US visitor still gets the Sunday-first grid they expect.
 */
export function firstDayOfWeek(language = navigator.language) {
  try {
    const locale = new Intl.Locale(language);
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info?.firstDay) return info.firstDay;
    return ['US', 'CA', 'JP', 'BR', 'MX', 'IL', 'PH'].includes(locale.maximize().region) ? 7 : 1;
  } catch {
    return 1;
  }
}

/**
 * A month as rows of seven day numbers, `null` for cells outside the month (Apple's small calendar
 * leaves them blank rather than greying in the neighbours).
 */
export function monthGrid(date, firstDay) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDow = new Date(year, month, 1).getDay() || 7; // 1..7, Monday = 1
  const lead = (startDow - firstDay + 7) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/** Weekday initials in grid order, from the locale ("M T W …", or "S M T …"). */
export function weekdayInitials(firstDay) {
  const f = formatter('wd', { weekday: 'narrow' });
  // 2024-01-01 was a Monday; day n (1..7) is that date + n − 1.
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, ((firstDay - 1 + i) % 7) + 1)));
}
