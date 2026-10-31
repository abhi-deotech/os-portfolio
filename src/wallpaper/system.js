/**
 * The CPU and Memory widgets' data: this Mac's processor and memory, read from battery-guard's relay
 * (~/Projects/battery-optimization, `GET /v1/system`), and what each reading means.
 *
 * Same relay, certificate and opt-in as the battery widgets (see battery.js): the page asks only when
 * the URL says battery-guard runs on this Mac (`bat=1`). Unlike the battery, these numbers move by
 * the second, so the page asks every few seconds while it shows, and less often on battery
 * (`systemCadence`). The relay keeps the connection alive, so a poll costs it under a millisecond of CPU
 * (measured: 0.73 ms, against 9.3 ms when every poll paid for a TLS handshake).
 *
 * Pure apart from the fetch, so battery-check can drive the views directly.
 */

export const SYSTEM_RELAY = 'https://127.0.0.1:47380/v1/system';
const FETCH_TIMEOUT_MS = 4000;
const GB = 1024 ** 3;

const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null);
const frac = (v) => num(v, 0, 1);
const bytes = (v) => (isInt(v, 0, 2 ** 53) ? v : null);

/** The relay's JSON → a reading, every field checked. null without a usable CPU or memory block. */
export function parseSystem(body) {
  if (!body || typeof body !== 'object' || body.v !== 1) return null;
  const c = body.cpu && typeof body.cpu === 'object' ? body.cpu : null;
  const cores = c && Array.isArray(c.cores) && c.cores.length <= 256 && c.cores.every((x) => frac(x) !== null) ? c.cores : null;
  const cpu = cores && frac(c.total) !== null ? {
    total: c.total,
    cores,
    kinds: Array.isArray(c.kinds) && c.kinds.length === cores.length && c.kinds.every((k) => k === 'E' || k === 'P') ? c.kinds : cores.map(() => 'P'),
    load: Array.isArray(c.load) && c.load.length === 3 && c.load.every((x) => num(x, 0, 10_000) !== null) ? c.load : null,
  } : null;

  const m = body.memory && typeof body.memory === 'object' ? body.memory : null;
  const total = m && bytes(m.total);
  const memory = total && bytes(m.used) !== null && m.used <= total ? {
    total,
    used: m.used,
    app: bytes(m.app) ?? 0,
    wired: bytes(m.wired) ?? 0,
    compressed: bytes(m.compressed) ?? 0,
    pressure: ['normal', 'warning', 'critical'].includes(m.pressure) ? m.pressure : 'normal',
    swapUsed: bytes(m.swapUsed),
    swapoutsPerMin: isInt(m.swapoutsPerMin, 0, 10_000_000) ? m.swapoutsPerMin : null,
  } : null;
  if (!cpu && !memory) return null;

  const p = body.power && typeof body.power === 'object' ? body.power : {};
  return {
    at: typeof body.at === 'string' ? Date.parse(body.at) || null : null,
    cpu,
    memory,
    power: {
      ac: p.ac !== false,
      lowPower: p.lowPower === true,
      thermal: ['nominal', 'fair', 'serious', 'critical'].includes(p.thermal) ? p.thermal : 'nominal',
    },
  };
}

/** Never throws; same statuses as fetchBattery. */
export async function fetchSystem(url = SYSTEM_RELAY) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) return { status: 'error' };
    const reading = parseSystem(await res.json());
    return reading ? { status: 'ok', reading } : { status: 'error' };
  } catch (err) {
    return { status: err instanceof SyntaxError ? 'error' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/** The CPU and Memory widgets poll on the same beat; requests within a second share one answer. */
let shared = { at: 0, promise: null };
export function fetchSystemShared() {
  if (!shared.promise || Date.now() - shared.at > 1000) shared = { at: Date.now(), promise: fetchSystem() };
  return shared.promise;
}

/**
 * How often to ask: every 3 s on the adapter, 10 s on battery, 15 s in Low Power Mode. A poll is cheap,
 * but a wallpaper is on all day, and on battery nobody needs a CPU reading by the second.
 */
export function systemCadence(power) {
  if (!power) return 3000;
  if (power.lowPower) return 15_000;
  return power.ac ? 3000 : 10_000;
}

/**
 * Gigabytes as Activity Monitor counts them (1024³): "13.7", and "16" for a whole total. A part of the
 * total keeps its decimal ("5.0", not "5"), so a column of parts reads alike.
 */
export function gbText(b, { part = false } = {}) {
  const g = b / GB;
  if (g >= 100) return String(Math.round(g));
  const r = Math.round(g * 10) / 10;
  return Number.isInteger(r) && !part ? String(r) : r.toFixed(1);
}
const partGb = (b) => gbText(b, { part: true });

/** Busy for this long at or above this share counts as the Mac working hard. */
export const BUSY_AT = 0.7;
export const BUSY_FOR_MS = 30_000;

/** A longer gap between samples (the page was hidden) ends a busy run: nobody saw what happened in it. */
const MAX_GAP_MS = 20_000;

/**
 * How long the CPU has been at or above BUSY_AT without a break, from the widget's recent samples
 * (`[{ at, total }]`, oldest first). 0 when the latest sample is below it.
 */
export function busyFor(samples) {
  let since = null;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].total < BUSY_AT) break;
    if (since !== null && since - samples[i].at > MAX_GAP_MS) break;
    since = samples[i].at;
  }
  return since === null ? 0 : samples[samples.length - 1].at - since;
}

const minutes = (ms) => Math.max(1, Math.round(ms / 60_000));

/**
 * What the CPU widget says: the total, each core grouped by kind, and one line. Heat beats the rest:
 * a Mac that is throttling is the one thing worth acting on. law 10: no green for "fine".
 */
export function cpuView(r, samples = []) {
  const { cpu, power } = r;
  if (!cpu) return null;
  const pct = Math.round(cpu.total * 100);
  const busy = busyFor(samples);
  let line;
  let tone = 'normal';
  if (power.thermal === 'serious' || power.thermal === 'critical') {
    line = 'Hot · slowing down';
    tone = power.thermal === 'critical' ? 'alert' : 'warn';
  } else if (busy >= BUSY_FOR_MS) {
    line = `Busy for ${busy < 60_000 ? `${Math.round(busy / 1000)} s` : `${minutes(busy)} min`}`;
    tone = busy >= 5 * 60_000 ? 'warn' : 'normal';
  } else if (cpu.load) {
    line = `Load ${cpu.load[0].toFixed(1)} · ${cpu.cores.length} cores`;
  } else {
    line = `${cpu.cores.length} cores`;
  }
  const groups = [];
  cpu.cores.forEach((v, i) => {
    const kind = cpu.kinds[i];
    if (!groups.length || groups[groups.length - 1].kind !== kind) groups.push({ kind, cores: [] });
    groups[groups.length - 1].cores.push(v);
  });
  return { pct, groups, line, tone };
}

/**
 * What the Memory widget says: used of total, the Activity Monitor split, and pressure, which is the
 * number that matters (free memory sits near zero on purpose). Swap shows only once it matters: under
 * pressure, or while the Mac is swapping now. How much swap exists says little on its own. Every line
 * fits the small widget's 130 px in its worst case (measured: "App 12.8 · Wired 12.8" is 124 px).
 */
export function memoryView(r) {
  const m = r.memory;
  if (!m) return null;
  const tone = m.pressure === 'critical' ? 'alert' : m.pressure === 'warning' ? 'warn' : 'normal';
  const swapping = m.swapoutsPerMin !== null && m.swapoutsPerMin > 0;
  const swap = m.swapUsed ? `Swap ${partGb(m.swapUsed)} GB${swapping ? ', rising' : ''}` : 'No swap in use';
  return {
    used: gbText(m.used),
    total: gbText(m.total),
    pressure: m.pressure[0].toUpperCase() + m.pressure.slice(1),
    tone,
    parts: [
      { id: 'app', name: 'App', share: m.app / m.total },
      { id: 'wired', name: 'Wired', share: m.wired / m.total },
      { id: 'compressed', name: 'Compressed', share: m.compressed / m.total },
    ],
    split: `App ${partGb(m.app)} · Wired ${partGb(m.wired)}`,
    detail: tone === 'normal' && !swapping ? `Compressed ${partGb(m.compressed)}` : swap,
    swapping,
  };
}
