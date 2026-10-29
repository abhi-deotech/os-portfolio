// Turns an iCalendar (.ics) feed into the list of events that touch one local day.
// Kept free of Vercel specifics so it can be tested with plain `node --test`.
import ICAL from 'ical.js';

const MAX_ITERATIONS = 20000; // ~55 years of a daily meeting

// Offset (ms) between UTC and wall-clock time in `timeZone` at the given instant.
function tzOffset(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// Wall-clock time in `timeZone` -> epoch ms.
export function zonedToEpoch({ year, month, day, hour = 0, minute = 0, second = 0 }, timeZone) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  let result = guess - tzOffset(guess, timeZone);
  // A second pass fixes guesses that landed on the other side of a DST switch.
  result = guess - tzOffset(result, timeZone);
  return result;
}

export function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

// YYYY-MM-DD of the given instant in `timeZone`.
export function localDate(ms, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(ms));
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function dateString(time) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${time.year}-${pad(time.month)}-${pad(time.day)}`;
}

// ICAL.Time -> epoch ms. Times whose TZID had no VTIMEZONE block come back from
// ical.js as "floating"; resolve those with the IANA name ourselves, and treat
// truly floating times as the viewer's local time.
function toEpoch(time, tzid, viewerTz) {
  const tz = time.zone && time.zone.tzid;
  if (tz && tz !== 'floating') return time.toJSDate().getTime();
  const zone = tzid && isValidTimeZone(tzid) ? tzid : viewerTz;
  return zonedToEpoch(time, zone);
}

function tzidOf(component, name) {
  const prop = component.getFirstProperty(name);
  return prop ? prop.getParameter('tzid') : undefined;
}

function registerTimezones(vcalendar) {
  for (const vtz of vcalendar.getAllSubcomponents('vtimezone')) {
    const zone = new ICAL.Timezone(vtz);
    if (zone.tzid && !ICAL.TimezoneService.has(zone.tzid)) ICAL.TimezoneService.register(zone.tzid, zone);
  }
}

/**
 * Events from one .ics feed that overlap `date` (YYYY-MM-DD) in `timeZone`.
 * Returns [{ title, allDay, start, end }] where start/end are ISO instants for
 * timed events and YYYY-MM-DD (end exclusive) for all-day events.
 */
export function eventsForDay(icsText, { date, timeZone }) {
  const vcalendar = new ICAL.Component(ICAL.parse(icsText));
  registerTimezones(vcalendar);

  const nextDate = addDays(date, 1);
  const [y, m, d] = date.split('-').map(Number);
  const [ny, nm, nd] = nextDate.split('-').map(Number);
  const rangeStart = zonedToEpoch({ year: y, month: m, day: d }, timeZone);
  const rangeEnd = zonedToEpoch({ year: ny, month: nm, day: nd }, timeZone);

  const vevents = vcalendar.getAllSubcomponents('vevent')
    .filter((c) => String(c.getFirstPropertyValue('status') || '').toUpperCase() !== 'CANCELLED');

  // Moved or edited occurrences ("exceptions") are separate VEVENTs carrying a
  // RECURRENCE-ID. Judge them on their own times and hide the original slot.
  const exceptionKeys = new Set();
  for (const c of vcalendar.getAllSubcomponents('vevent')) {
    if (!c.hasProperty('recurrence-id')) continue;
    const rid = c.getFirstPropertyValue('recurrence-id');
    const key = rid.isDate ? dateString(rid) : toEpoch(rid, tzidOf(c, 'recurrence-id'), timeZone);
    exceptionKeys.add(`${c.getFirstPropertyValue('uid')}|${key}`);
  }

  const out = [];
  const push = (title, start, end, startTzid, endTzid) => {
    if (start.isDate) {
      const s = dateString(start);
      const e = end ? dateString(end) : addDays(s, 1);
      if (s <= date && e > date) out.push({ title, allDay: true, start: s, end: e });
      return;
    }
    const s = toEpoch(start, startTzid, timeZone);
    const e = end ? toEpoch(end, endTzid, timeZone) : s;
    if (s < rangeEnd && (e > rangeStart || (e === s && s >= rangeStart))) {
      out.push({ title, allDay: false, start: new Date(s).toISOString(), end: new Date(e).toISOString() });
    }
  };

  for (const component of vevents) {
    const event = new ICAL.Event(component);
    const title = event.summary || '(No title)';
    const startTzid = tzidOf(component, 'dtstart');
    const endTzid = tzidOf(component, 'dtend') || startTzid;

    if (event.isRecurrenceException() || !event.isRecurring()) {
      push(title, event.startDate, event.endDate, startTzid, endTzid);
      continue;
    }

    const durationSeconds = event.duration.toSeconds();
    const iterator = event.iterator();
    for (let i = 0, next; i < MAX_ITERATIONS && (next = iterator.next()); i++) {
      const key = next.isDate ? dateString(next) : toEpoch(next, startTzid, timeZone);
      if (next.isDate ? key > date : key >= rangeEnd) break;
      if (exceptionKeys.has(`${event.uid}|${key}`)) continue;
      const end = next.clone();
      end.addDuration(ICAL.Duration.fromSeconds(durationSeconds));
      push(title, next, end, startTzid, startTzid);
    }
  }

  return out;
}

export { addDays };
