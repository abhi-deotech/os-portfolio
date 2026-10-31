/**
 * The Battery widgets' data: this Mac's battery, read from battery-guard's relay
 * (~/Projects/battery-optimization), and what each reading means under the charging rules.
 *
 * Plash is WebKit, which has no Battery Status API, so the readings come from a LaunchAgent on the
 * Mac. The relay is https because this page is: WebKit blocks an https page's requests to
 * http://127.0.0.1 as mixed content (measured on macOS 27.0.1), so the relay carries a certificate for
 * 127.0.0.1 that the owner trusts once. The site CSP's `connect-src https:` already allows it.
 *
 * The page asks only when the URL says the relay is installed (`bat=1`, see config.js), so visitors
 * never touch their own loopback, and Chrome never shows them a local-network prompt.
 *
 * Pure apart from the fetch, so battery-check can drive the views directly. Thresholds come from the
 * relay (`limits`), so the wallpaper and the guard's notifications always agree.
 */

export const BATTERY_RELAY = 'https://127.0.0.1:47380/v1/battery';
const FETCH_TIMEOUT_MS = 4000;

/** The README's rules, used only when a reading arrives without its own limits. */
export const DEFAULT_LIMITS = { floor: 20, cap: 80, capAlert: 82, recharge: [30, 40], hotC: 40 };

const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (v) => (typeof v === 'string' && DAY.test(v) ? v : null);
const flag = (v) => (v === 0 || v === 1 ? v : null);

function readLimits(l) {
  const d = DEFAULT_LIMITS;
  if (!l || typeof l !== 'object') return d;
  const floor = isInt(l.floor, 1, 60) ? l.floor : d.floor;
  const cap = isInt(l.cap, 50, 100) && l.cap > floor ? l.cap : d.cap;
  const capAlert = isInt(l.capAlert, cap, 100) ? l.capAlert : Math.min(100, cap + 2);
  const r = Array.isArray(l.recharge) && l.recharge.length === 2 && l.recharge.every((x) => isInt(x, floor, cap)) && l.recharge[0] <= l.recharge[1]
    ? [l.recharge[0], l.recharge[1]] : d.recharge;
  const hotC = num(l.hotC, 30, 70) ?? d.hotC;
  return { floor, cap, capAlert, recharge: r, hotC };
}

function readPower(p) {
  if (!p || typeof p !== 'object') return null;
  const side = (s) => (s && typeof s === 'object' ? { powernap: flag(s.powernap), lowpowermode: flag(s.lowpowermode) } : { powernap: null, lowpowermode: null });
  return { battery: side(p.battery), ac: side(p.ac) };
}

/**
 * The relay's JSON → a reading, every field checked rather than trusted. null when the core of it
 * (level and power state) is missing or malformed.
 */
export function parseBattery(body) {
  if (!body || typeof body !== 'object' || body.v !== 1) return null;
  if (!isInt(body.pct, 0, 100) || typeof body.ac !== 'boolean' || typeof body.charging !== 'boolean') return null;
  const mah = (v) => (isInt(v, 1, 100_000) ? v : null);
  const routine = body.routine && typeof body.routine === 'object' ? body.routine : {};
  const history = Array.isArray(body.history) ? body.history.filter((h) =>
    h && day(h.date) && isInt(h.cycles, 0, 100_000) && mah(h.nominalMah) && mah(h.designMah)).slice(-24) : [];
  return {
    pct: body.pct,
    ac: body.ac,
    charging: body.charging,
    full: body.full === true,
    minutes: isInt(body.minutes, 1, 6000) ? body.minutes : null,
    tempC: num(body.tempC, -20, 100),
    cycles: isInt(body.cycles, 0, 100_000) ? body.cycles : null,
    cyclesRated: isInt(body.cyclesRated, 100, 100_000) ? body.cyclesRated : null,
    nominalMah: mah(body.nominalMah),
    designMah: mah(body.designMah),
    fullMah: mah(body.fullMah),
    power: readPower(body.power),
    limits: readLimits(body.limits),
    routine: { below40: day(routine.below40), near20: day(routine.near20), since: day(routine.since) },
    history: history.map((h) => ({ date: h.date, cycles: h.cycles, nominalMah: h.nominalMah, designMah: h.designMah })),
    // The death clock's inputs: the battery's start month (set on the Mac, `--battery-since`), the use
    // rate in cycles a day, and a seven-day median capacity that doesn't jitter between readings.
    batterySince: typeof body.batterySince === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(body.batterySince) ? body.batterySince : null,
    usage: readUsage(body.usage),
    nominalMahSmoothed: mah(body.nominalMahSmoothed),
  };
}

function readUsage(u) {
  if (!u || typeof u !== 'object') return null;
  const cyclesPerDay = num(u.cyclesPerDay, 0, 20);
  if (cyclesPerDay === null || !['ledger', 'log'].includes(u.source)) return null;
  return { cyclesPerDay, source: u.source, days: num(u.days, 0, 10_000) };
}

/**
 * Ask the relay. Never throws. A browser can't tell "not running" from "certificate not trusted"
 * (both are a failed fetch), so both are `unreachable`, and Settings says to check each.
 *
 * @returns {Promise<{status: 'ok', reading: object} | {status: 'unreachable' | 'error'}>}
 */
export async function fetchBattery(url = BATTERY_RELAY) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) return { status: 'error' };
    const reading = parseBattery(await res.json());
    return reading ? { status: 'ok', reading } : { status: 'error' };
  } catch (err) {
    return { status: err instanceof SyntaxError ? 'error' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/** One request serves both widgets: answers younger than 10 s are shared. */
let shared = { at: 0, promise: null };
export function fetchBatteryShared() {
  if (!shared.promise || Date.now() - shared.at > 10_000) shared = { at: Date.now(), promise: fetchBattery() };
  return shared.promise;
}

/** "45 m", "2 h", "4 h 59 m". */
export function minutesText(m) {
  if (m < 60) return `${m} m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} m` : `${h} h`;
}

/** °C with one decimal, or whole °F, as the wallpaper's temperature setting says. */
export const tempText = (c, unit) => (unit === 'f' ? `${Math.round((c * 9) / 5 + 32)}°` : `${c.toFixed(1)}°`);

/**
 * What the Battery widget says: one line of advice from the README's charging band, a sub line, and a
 * tone (`normal` | `warn` | `alert`). Heat overrides the rest, as the README calls it the biggest risk.
 * Every line fits the small widget's 130 px (measured in its own font), so none is ever cut off.
 */
export function batteryView(r, unit = 'c') {
  const L = r.limits;
  const temp = r.tempC === null ? null : tempText(r.tempC, unit);
  const hot = r.tempC !== null && r.tempC >= L.hotC;
  const warm = r.tempC !== null && r.tempC >= L.hotC - 5;
  let tone = 'normal';
  let line;
  let sub;
  let icon;

  if (r.ac) {
    icon = 'plug';
    sub = 'On adapter';
    if (r.charging && r.pct >= L.capAlert) {
      tone = 'alert';
      line = `Above ${L.cap}% cap`;
      sub = 'Check Charge Limit';
      icon = 'charging';
    } else if (r.charging) {
      line = `Charging to ${L.cap}%`;
      sub = r.minutes ? `${minutesText(r.minutes)} to go` : 'Charging';
      icon = 'charging';
    } else if (L.cap < 100 && r.pct >= L.cap - 3) {
      line = `Holding at ${L.cap}%`;
    } else if (r.full) {
      line = 'Charged';
    } else {
      line = 'Not charging';
    }
  } else {
    icon = 'battery';
    sub = r.minutes ? `${minutesText(r.minutes)} left` : 'Estimating time left';
    if (r.pct <= L.floor) {
      tone = 'alert';
      line = 'Plug in now';
      if (r.pct < 10) sub = `Very low · ${sub[0].toLowerCase()}${sub.slice(1)}`;
      icon = 'low';
    } else if (r.pct < L.recharge[0]) {
      tone = 'warn';
      line = 'Plug in soon';
      icon = 'low';
    } else if (r.pct <= L.recharge[1]) {
      line = 'Good time to plug in';
    } else {
      line = 'On battery';
    }
  }

  if (hot) {
    tone = 'alert';
    line = `Hot · ${temp}`;
    sub = 'Give it air or pause';
    icon = 'hot';
  }
  return { pct: r.pct, tone, line, sub, temp: hot ? null : temp, tempTone: hot ? 'alert' : warm ? 'warn' : null, icon, limits: L };
}

const DAY_MS = 86_400_000;
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The README's routines: a run down to about 35% every 1–2 weeks, and to about 20% once a month. */
export const RUN_DOWN_DAYS = 14;
export const CALIBRATE_DAYS = 30;

/**
 * What the Battery health widget says beside its death clock: maximum capacity as System Settings
 * shows it (nominal ÷ design, from the seven-day median so the ring doesn't flicker between 94% and
 * 95%), cycles against the rated count, and the one routine that is due.
 */
export function healthView(r, now) {
  const nominal = r.nominalMahSmoothed ?? r.nominalMah;
  if (!nominal || !r.designMah) return null;
  const maxPct = (nominal / r.designMah) * 100;

  let due = null;
  const { below40, near20, since } = r.routine;
  if (since) {
    const today = localDay(now);
    const age = (d) => daysBetween(d ?? since, today);
    if (age(near20) >= CALIBRATE_DAYS) {
      due = { line: 'Let it reach ~20% once this month', last: near20 };
    } else if (age(below40) >= RUN_DOWN_DAYS) {
      due = { line: 'Run it down to ~35% this week', last: below40 };
    } else {
      due = { line: 'Routines up to date', last: null, done: true };
    }
    if (due.last) due.sub = `Last time ${age(due.last)} days ago`;
    else if (!due.done) due.sub = 'Not seen since battery-guard started';
  }

  return {
    maxPct: Math.round(maxPct),
    cycles: r.cycles,
    rated: r.cyclesRated ?? 1000,
    due,
  };
}

/* ── Death clock ───────────────────────────────────────────────────────────── */

/** The measured trend takes over once the monthly log spans this long and shows at least this drop. */
export const TREND_MIN_DAYS = 90;
export const TREND_MIN_DROP = 1;

/** Beyond this the clock says so rather than counting decades. */
const NEVER_DAYS = 20 * 365;

const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const addMonths = (d, n) => {
  const y = d.getFullYear() + Math.floor((d.getMonth() + n) / 12);
  const m = (((d.getMonth() + n) % 12) + 12) % 12;
  return new Date(y, m, Math.min(d.getDate(), daysInMonth(y, m)), 12);
};
const wholeDays = (a, b) => Math.round((noon(b) - noon(a)) / DAY_MS);

/**
 * Calendar distance from `a` to `b` (b later) as years, months and days, the way a person counts:
 * whole months first (31 Jan + 1 month is 28 or 29 Feb), then the days left over.
 */
export function ymdBetween(a, b) {
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (addMonths(a, months) > noon(b)) months -= 1;
  const days = wholeDays(addMonths(a, months), b);
  return { y: Math.floor(months / 12), m: months % 12, d: days };
}

/** Least-squares capacity trend over the monthly log, in % lost per day; null until it can be trusted. */
export function historyTrend(history) {
  if (history.length < 3) return null;
  const pts = history.map((h) => ({ x: Date.parse(`${h.date}T00:00:00Z`) / DAY_MS, y: (h.nominalMah / h.designMah) * 100 }));
  const span = pts[pts.length - 1].x - pts[0].x;
  if (span < TREND_MIN_DAYS) return null;
  const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const sxx = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const slope = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / sxx;
  return -slope * span >= TREND_MIN_DROP ? -slope : null;
}

/**
 * When maximum capacity will reach `threshold`, at the current pace.
 *
 * Capacity is the seven-day median from battery-guard, so one reading can't move the date by weeks.
 * The pace, best evidence first:
 *   trend   the monthly log's own slope, once it spans 3 months and shows a 1% drop;
 *   age     use plus age: Apple's rating (80% left at the rated cycles, so 0.02% a cycle at 1000) times
 *           cycles a day, plus the yearly loss that rating leaves unexplained over the battery's life
 *           (it needs `batterySince`). A battery that has worn better than rated keeps its own rate;
 *   cycles  with no start date, every lost point is blamed on cycles. That is harsher: it can only
 *           bring the date earlier than the use-plus-age estimate would.
 *
 * @returns null without capacity data; else `{ threshold, maxPct, status }` plus, when counting,
 *   `{ days, end, ymd, perYear, method, cyclesPerDay, source }`. status: 'counting' | 'reached' |
 *   'learning' (no usage rate yet) | 'never' (more than 20 years away).
 */
export function deathClock(r, threshold, now) {
  const nominal = r.nominalMahSmoothed ?? r.nominalMah;
  if (!nominal || !r.designMah) return null;
  const maxPct = (nominal / r.designMah) * 100;
  const base = { threshold, maxPct };
  if (maxPct <= threshold) return { ...base, status: 'reached' };

  const lost = 100 - maxPct;
  const rated = r.cyclesRated ?? 1000;
  const cycleWearRated = 20 / rated;
  const cyclesPerDay = r.usage?.cyclesPerDay ?? null;
  let perDay;
  let method;
  const trend = historyTrend(r.history);
  if (trend !== null) {
    perDay = trend;
    method = 'trend';
  } else {
    if (cyclesPerDay === null) return { ...base, status: 'learning' };
    const cycles = r.cycles ?? 0;
    let cycleWear = cycleWearRated;
    let agePerDay = 0;
    const [y, m] = r.batterySince ? r.batterySince.split('-').map(Number) : [];
    const ageDays = r.batterySince ? wholeDays(new Date(y, m - 1, 1), now) : 0;
    if (ageDays >= 180) {
      const ageLoss = lost - cycles * cycleWearRated;
      if (ageLoss >= 0) agePerDay = ageLoss / ageDays;
      else if (cycles > 0) cycleWear = lost / cycles;
      method = 'age';
    } else {
      if (cycles > 0) cycleWear = Math.max(cycleWearRated, lost / cycles);
      method = 'cycles';
    }
    perDay = agePerDay + cycleWear * cyclesPerDay;
  }

  const days = perDay > 0 ? (maxPct - threshold) / perDay : Infinity;
  if (days > NEVER_DAYS) return { ...base, status: 'never', method };
  const start = noon(now);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + Math.round(days), 12);
  return {
    ...base,
    status: 'counting',
    days: Math.round(days),
    end,
    ymd: ymdBetween(start, end),
    perYear: perDay * 365,
    method,
    cyclesPerDay,
    source: method === 'trend' ? 'log' : r.usage.source,
  };
}

/** "1y 6m 7d" as parts, so the widget can set the numbers large and the units small. Zero leaders drop. */
export function ymdParts({ y, m, d }) {
  const parts = [{ n: y, u: 'y' }, { n: m, u: 'm' }, { n: d, u: 'd' }];
  const first = parts.findIndex((p) => p.n > 0);
  return first === -1 ? [{ n: 0, u: 'd' }] : parts.slice(first);
}

/**
 * The README's power settings that need admin rights, as a checklist with the command for each. Only
 * what `pmset -g custom` reported; the Charge Limit and Optimized Charging can't be read, so Settings
 * links to their pane instead.
 */
export function powerChecklist(r) {
  const p = r?.power;
  if (!p) return [];
  const items = [
    { id: 'powernap', label: 'Power Nap off on battery', value: p.battery.powernap, want: 0, fix: 'sudo pmset -b powernap 0', why: 'No background wakes on battery.' },
    { id: 'lpm-battery', label: 'Low Power Mode on battery', value: p.battery.lowpowermode, want: 1, fix: 'sudo pmset -b lowpowermode 1', why: 'Gentler on the battery when unplugged.' },
    { id: 'lpm-ac', label: 'Full speed on the adapter', value: p.ac.lowpowermode, want: 0, fix: 'sudo pmset -c lowpowermode 0', why: 'Optional. Low Power Mode on the adapter only slows the Mac.' },
  ];
  return items.filter((i) => i.value !== null).map((i) => ({ ...i, ok: i.value === i.want }));
}
