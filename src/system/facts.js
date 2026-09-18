/**
 * Truthful system facts — every hardware number Lumina shows comes from here.
 *
 * PURE: no React, no store, no `import.meta.env`. Plain Node imports this (scripts/facts-check.mjs),
 * so relative imports carry explicit `.js` extensions and reach only other pure modules. NOTHING runs
 * at import: the first getSnapshot()/subscribe() builds the facts.
 *
 * A fact is either REPORTED by the browser, UNAVAILABLE with a reason, or PENDING. There is no third
 * way: never `navigator.platform`, never a default number standing in for one the browser withheld.
 *
 *   { id, label, capabilityId?, source: 'reported' | 'unavailable' | 'pending',
 *     reason?: 'unsupported' | 'denied' | 'masked' | 'insecure-context' | 'awaiting-sample' | 'error',
 *     value, unit?, text, detail?, sampledAt? }
 *
 * Lifecycle
 *   subscribe(listener, ids)  observers are ref-counted PER FACT ID, so subscribing to `battery` alone
 *                             never builds a PressureObserver.
 *   ensure(ids)               one-shot probes (storage estimate, UA Client Hints, GPU) and a heap sample.
 *   retainPolling()           a 2 s heap poll (storage every 30th tick) while anyone retains it → release.
 *   probeAll({ timeoutMs })   a temporary subscription for callers outside React (the terminal).
 *
 * A `gen` counter makes late async results stale-safe: _resetForTest bumps it, and each observer start
 * carries its own token, so StrictMode's setup → cleanup → setup never lets a first-run promise land.
 * Refresh rate is deliberately absent: rAF never fires in a hidden tab, and the value depends on load.
 */
import { defaultEnv, isSupported, _resetSupportMemo } from '../capabilities/support.js';
import { describeBrowser, _resetBrowserMemo } from '../capabilities/browser.js';

export const FACT_IDS = Object.freeze([
  'cores', 'deviceMemory', 'jsHeap', 'storage', 'battery', 'pressure', 'os', 'arch', 'gpu', 'display', 'locale',
]);

/** Facts that go stale and are refreshed by retainPolling(). */
export const POLLED_IDS = Object.freeze(['jsHeap', 'storage']);

const LABELS = {
  cores: 'Logical cores',
  deviceMemory: 'Device memory class',
  jsHeap: 'JavaScript heap',
  storage: 'Site storage',
  battery: 'Battery',
  pressure: 'CPU pressure',
  os: 'Operating system',
  arch: 'Architecture',
  gpu: 'GPU',
  display: 'Display',
  locale: 'Locale',
};

const CAPABILITY_OF = {
  deviceMemory: 'deviceMemory',
  jsHeap: 'performanceMemory',
  storage: 'storageEstimate',
  battery: 'battery',
  pressure: 'computePressure',
  os: 'uaClientHints',
  arch: 'uaClientHints',
  gpu: 'webgpu',
};

const POLL_MS = 2000;
const STORAGE_EVERY = 30;
const HISTORY_MAX = 30;
const PRESSURE_STATES = ['nominal', 'fair', 'serious', 'critical'];
const BATTERY_EVENTS = ['chargingchange', 'levelchange', 'chargingtimechange', 'dischargingtimechange'];

/* ── Formatters ────────────────────────────────────────────────────────────────────────────────── */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

function bytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return '';
  let v = n;
  let u = 0;
  while (v >= 1024 && u < UNITS.length - 1) { v /= 1024; u += 1; }
  if (u === 0) return `${Math.round(v)} B`;
  const shown = v < 100 ? Math.round(v * 10) / 10 : Math.round(v);
  return `${shown} ${UNITS[u]}`;
}

/** "under a minute", "12 min", "2 h 10 min", "3 d 4 h". Empty for anything that is not a duration. */
function duration(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '';
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return 'under a minute';
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24);
  const hr = h % 24;
  return hr ? `${d} d ${hr} h` : `${d} d`;
}

/** nominal 1 · fair 2 · serious 3 · critical 4 · anything else 0. */
const pressureSegments = (state) => PRESSURE_STATES.indexOf(state) + 1;

/** The OS FAMILY from a user-agent string, or null. Only a family: the UA's version numbers are frozen. */
function uaFamily(ua) {
  if (typeof ua !== 'string' || !ua) return null;
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return null;
}

/** "84% · discharging · 2 h 10 min left" / "100% · plugged in" / "62% · charging · 40 min to full". */
function batteryText({ level, charging, chargingTime, dischargingTime } = {}) {
  if (typeof level !== 'number' || !Number.isFinite(level)) return '';
  const pct = `${Math.round(level * 100)}%`;
  if (charging) {
    if (level >= 1) return `${pct} · plugged in`;
    return Number.isFinite(chargingTime) && chargingTime > 0
      ? `${pct} · charging · ${duration(chargingTime * 1000)} to full`
      : `${pct} · charging`;
  }
  return Number.isFinite(dischargingTime) && dischargingTime > 0
    ? `${pct} · discharging · ${duration(dischargingTime * 1000)} left`
    : `${pct} · discharging`;
}

/** "Offline" · "Online · 4g" · "Online". */
function networkText(net) {
  if (!net?.isOnline) return 'Offline';
  return net.effectiveType && net.effectiveType !== 'unknown' ? `Online · ${net.effectiveType}` : 'Online';
}

export const fmt = Object.freeze({ bytes, duration, pressureSegments, uaFamily, batteryText, networkText });

/**
 * The single network reader (useNetworkInfo and the terminal both call it). The connection fields
 * are coarse estimates where the Network Information API exists, and 'unknown' / 0 where it doesn't.
 */
export function readNetwork(nav) {
  const connection = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
  return {
    isOnline: nav?.onLine !== false,
    connectionType: connection?.type || 'unknown',
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || 0,
    downlinkMax: connection?.downlinkMax || 0,
    rtt: connection?.rtt || 0,
    saveData: connection?.saveData || false,
  };
}

/** The words for a fact that has no value: "Not exposed by Firefox", "Probing…", … */
export function unavailableText(fact, browserName) {
  const who = browserName || 'this browser';
  if (fact?.source === 'pending') return fact.reason === 'awaiting-sample' ? 'Waiting for first sample' : 'Probing…';
  switch (fact?.reason) {
    case 'unsupported': return `Not exposed by ${who}`;
    case 'masked': return `Masked by ${who}`;
    case 'denied': return `Blocked by ${who} for this site`;
    case 'insecure-context': return 'Needs HTTPS';
    case 'awaiting-sample': return 'Waiting for first sample';
    case 'error':
    default:
      return 'Couldn’t read';
  }
}

/* ── Module state ──────────────────────────────────────────────────────────────────────────────── */

let testEnv = null;
let gen = 0;
let facts = null;
let snapshot = null;
const listeners = new Set();
const refs = {};
const observers = {};
const once = {};
let pollRetain = 0;
let pollTimer = null;
let pollTick = 0;

const env = () => testEnv ?? defaultEnv();
const supported = (capId) => (testEnv ? isSupported(capId, testEnv) : isSupported(capId));
const browserName = () => (testEnv ? describeBrowser(testEnv.nav) : describeBrowser()).name;

const make = (id, fields) => Object.freeze({ id, label: LABELS[id], capabilityId: CAPABILITY_OF[id], ...fields });
const reported = (id, value, text, extra = {}) => make(id, { source: 'reported', value, text, ...extra });
const pending = (id, reason) => make(id, { source: 'pending', reason, value: null, text: reason === 'awaiting-sample' ? 'Waiting for first sample' : 'Probing…' });
function unavailable(id, reason) {
  const f = { id, source: 'unavailable', reason };
  return make(id, { source: 'unavailable', reason, value: null, text: unavailableText(f, browserName()) });
}

function setFact(id, fact) {
  if (!facts) init();
  facts = { ...facts, [id]: fact };
  snapshot = Object.freeze(facts);
  for (const entry of [...listeners]) {
    if (entry.ids.has(id)) entry.listener();
  }
}

/* ── Synchronous readers ───────────────────────────────────────────────────────────────────────── */

function readCores({ nav }) {
  const n = nav?.hardwareConcurrency;
  if (typeof n !== 'number' || !(n > 0)) return unavailable('cores', 'unsupported');
  return reported('cores', n, `${n} logical ${n === 1 ? 'core' : 'cores'} reported`);
}

function readDeviceMemory({ nav }) {
  if (!supported('deviceMemory')) return unavailable('deviceMemory', 'unsupported');
  const gb = nav.deviceMemory;
  return reported('deviceMemory', gb, `${gb} GB class (bucketed)`, { unit: 'GB' });
}

function sampleHeap(prev) {
  if (!supported('performanceMemory')) return unavailable('jsHeap', 'unsupported');
  try {
    const { win } = env();
    const m = win.performance.memory;
    const used = m.usedJSHeapSize;
    const limit = m.jsHeapSizeLimit;
    if (!(limit > 0)) return unavailable('jsHeap', 'error');
    const history = [...(prev?.detail?.history ?? []), used].slice(-HISTORY_MAX);
    return reported('jsHeap', { used, total: m.totalJSHeapSize, limit }, `${bytes(used)} of ${bytes(limit)} heap limit`, {
      unit: 'bytes',
      detail: Object.freeze({ percent: Math.round((used / limit) * 100), history: Object.freeze(history) }),
      sampledAt: win.performance.now?.(),
    });
  } catch {
    return unavailable('jsHeap', 'error');
  }
}

function readOsFromUa({ nav }) {
  const family = uaFamily(nav?.userAgent);
  if (!family) return supported('uaClientHints') ? pending('os') : unavailable('os', 'unsupported');
  return reported('os', family, `${family} (from user agent)`, { detail: Object.freeze({ from: 'user-agent' }) });
}

function readDisplay({ win }) {
  const s = win?.screen;
  if (!s || !(s.width > 0)) return unavailable('display', 'unsupported');
  const mq = (q) => { try { return !!win.matchMedia?.(q)?.matches; } catch { return false; } };
  const value = {
    width: s.width,
    height: s.height,
    dpr: win.devicePixelRatio || 1,
    colorDepth: s.colorDepth,
    isExtended: s.isExtended === true,
    hdr: mq('(dynamic-range: high)'),
    p3: mq('(color-gamut: p3)'),
  };
  const parts = [`${value.width} × ${value.height}`, `${Math.round(value.dpr * 100) / 100}x`];
  if (value.colorDepth) parts.push(`${value.colorDepth}-bit`);
  if (value.hdr) parts.push('HDR');
  if (value.p3) parts.push('P3');
  if (value.isExtended) parts.push('extended desktop');
  return reported('display', Object.freeze(value), parts.join(' · '));
}

function readLocale({ nav }) {
  try {
    const o = Intl.DateTimeFormat().resolvedOptions();
    const languages = Array.isArray(nav?.languages) ? [...nav.languages] : [];
    const text = [o.locale, o.timeZone].filter(Boolean).join(' · ');
    if (!text) return unavailable('locale', 'error');
    return reported('locale', o.locale, text, { detail: Object.freeze({ timeZone: o.timeZone, languages: Object.freeze(languages) }) });
  } catch {
    return unavailable('locale', 'error');
  }
}

function init() {
  const e = env();
  const insecure = e.win && e.win.isSecureContext === false;
  facts = {
    cores: readCores(e),
    deviceMemory: readDeviceMemory(e),
    jsHeap: sampleHeap(null),
    storage: supported('storageEstimate') ? pending('storage') : unavailable('storage', insecure ? 'insecure-context' : 'unsupported'),
    battery: supported('battery') ? pending('battery') : unavailable('battery', 'unsupported'),
    pressure: supported('computePressure') ? pending('pressure') : unavailable('pressure', 'unsupported'),
    os: readOsFromUa(e),
    arch: supported('uaClientHints') ? pending('arch') : unavailable('arch', 'unsupported'),
    gpu: pending('gpu'),
    display: readDisplay(e),
    locale: readLocale(e),
  };
  snapshot = Object.freeze(facts);
}

/** Frozen; the same reference until a fact changes. */
export function getSnapshot() {
  if (!snapshot) init();
  return snapshot;
}

/* ── One-shot probes ───────────────────────────────────────────────────────────────────────────── */

function readStorage() {
  if (!supported('storageEstimate')) return Promise.resolve();
  const myGen = gen;
  const { nav } = env();
  return Promise.resolve()
    .then(() => nav.storage.estimate())
    .then((est) => {
      if (myGen !== gen) return;
      const usage = est?.usage;
      const quota = est?.quota;
      if (typeof usage !== 'number' || !(quota > 0)) { setFact('storage', unavailable('storage', 'error')); return; }
      setFact('storage', reported('storage', { usage, quota }, `${bytes(usage)} site storage used of ${bytes(quota)} quota`, {
        unit: 'bytes',
        detail: Object.freeze({
          percent: (usage / quota) * 100,
          usageDetails: est.usageDetails ? Object.freeze({ ...est.usageDetails }) : undefined,
        }),
      }));
    }, () => {
      if (myGen === gen) setFact('storage', unavailable('storage', 'error'));
    });
}

/**
 * On Windows, UA-CH `platformVersion` is the UniversalApiContract version, not the OS version
 * (13+ is Windows 11, 1–10 is Windows 10, 0 is older), so it is mapped or labelled, never printed
 * as if it were a Windows release. The raw value stays in `detail.platformVersion`.
 */
function osText(platform, version) {
  if (!version) return platform;
  if (platform !== 'Windows') return `${platform} ${version}`;
  const major = Number.parseInt(version, 10);
  if (major >= 13) return 'Windows 11';
  if (major >= 1 && major <= 10) return 'Windows 10';
  return `Windows (platform version ${version})`;
}

function probeUaHints() {
  if (!supported('uaClientHints')) return Promise.resolve();
  const myGen = gen;
  const { nav } = env();
  return Promise.resolve()
    .then(() => nav.userAgentData.getHighEntropyValues(['platformVersion', 'architecture', 'bitness']))
    .then((v) => {
      if (myGen !== gen) return;
      const platform = v?.platform || nav.userAgentData.platform;
      if (platform) {
        const text = osText(platform, v?.platformVersion);
        setFact('os', reported('os', platform, text, { detail: Object.freeze({ from: 'client-hints', platformVersion: v?.platformVersion }) }));
      } else if (facts.os.source === 'pending') {
        setFact('os', unavailable('os', 'masked'));
      }
      if (v?.architecture) {
        const text = v.bitness ? `${v.architecture} · ${v.bitness}-bit` : v.architecture;
        setFact('arch', reported('arch', v.architecture, text, { detail: Object.freeze({ bitness: v.bitness }) }));
      } else {
        setFact('arch', unavailable('arch', 'masked'));
      }
    }, () => {
      if (myGen !== gen) return;
      setFact('arch', unavailable('arch', 'error'));
      if (facts.os.source === 'pending') setFact('os', unavailable('os', 'error'));
    });
}

function probeGpuFact() {
  const myGen = gen;
  const e = env();
  return import('./gpu.js')
    .then(({ probeGpu }) => probeGpu(e))
    .then((r) => {
      if (myGen !== gen) return;
      if (r.source === 'reported') setFact('gpu', reported('gpu', r.text, r.text, { detail: r.detail }));
      else if (r.source === 'masked') setFact('gpu', unavailable('gpu', 'masked'));
      else setFact('gpu', unavailable('gpu', 'unsupported'));
    }, () => {
      if (myGen === gen) setFact('gpu', unavailable('gpu', 'error'));
    });
}

/**
 * Run the one-shot probes for `ids`. The storage estimate and heap sample refresh on every call;
 * client hints and the GPU are read once per module generation. Resolves when they settle.
 */
export function ensure(ids = FACT_IDS) {
  if (!facts) init();
  const want = new Set(ids);
  const work = [];
  if (want.has('jsHeap') && supported('performanceMemory')) setFact('jsHeap', sampleHeap(facts.jsHeap));
  if (want.has('storage')) work.push(readStorage());
  if (want.has('os') || want.has('arch')) {
    once.ua ??= probeUaHints();
    work.push(once.ua);
  }
  if (want.has('gpu')) {
    once.gpu ??= probeGpuFact();
    work.push(once.gpu);
  }
  return Promise.all(work).then(() => undefined);
}

/* ── Observers (ref-counted per fact id) ───────────────────────────────────────────────────────── */

function startBattery() {
  const token = { stopped: false, battery: null, onChange: null };
  const myGen = gen;
  const { nav } = env();
  Promise.resolve()
    .then(() => nav.getBattery())
    .then((b) => {
      if (token.stopped || myGen !== gen) return;
      const onChange = () => {
        if (token.stopped || myGen !== gen) return;
        const value = { level: b.level, charging: b.charging, chargingTime: b.chargingTime, dischargingTime: b.dischargingTime };
        setFact('battery', reported('battery', Object.freeze(value), batteryText(value)));
      };
      token.battery = b;
      token.onChange = onChange;
      for (const ev of BATTERY_EVENTS) b.addEventListener?.(ev, onChange);
      onChange();
    }, (err) => {
      if (token.stopped || myGen !== gen) return;
      setFact('battery', unavailable('battery', err?.name === 'NotAllowedError' ? 'denied' : 'error'));
    });
  return () => {
    token.stopped = true;
    if (token.battery) for (const ev of BATTERY_EVENTS) token.battery.removeEventListener?.(ev, token.onChange);
  };
}

function startPressure() {
  const token = { stopped: false };
  const myGen = gen;
  const { win } = env();
  let observer;
  try {
    observer = new win.PressureObserver((records) => {
      if (token.stopped || myGen !== gen) return;
      const last = records?.[records.length - 1];
      if (!last || !PRESSURE_STATES.includes(last.state)) return;
      const word = `${last.state.charAt(0).toUpperCase()}${last.state.slice(1)}`;
      setFact('pressure', reported('pressure', last.state, word, {
        detail: Object.freeze({ segments: pressureSegments(last.state) }),
        sampledAt: last.time,
      }));
    });
  } catch {
    setFact('pressure', unavailable('pressure', 'unsupported'));
    return () => {};
  }
  setFact('pressure', pending('pressure', 'awaiting-sample'));
  Promise.resolve()
    .then(() => {
      // StrictMode can unsubscribe before this microtask runs; observing after disconnect() would
      // start an observer nothing ever stops.
      if (token.stopped || myGen !== gen) return undefined;
      return observer.observe('cpu', { sampleInterval: POLL_MS });
    })
    .catch((err) => {
      if (token.stopped || myGen !== gen) return;
      setFact('pressure', unavailable('pressure', err?.name === 'NotAllowedError' ? 'denied' : 'unsupported'));
    });
  return () => {
    token.stopped = true;
    try { observer.disconnect(); } catch { /* already gone */ }
    // Nobody is watching any more, so the last state would only go stale: say so next time instead.
    if (myGen === gen && facts?.pressure?.source !== 'unavailable') setFact('pressure', pending('pressure'));
  };
}

function startDisplay() {
  const { win } = env();
  if (typeof win?.addEventListener !== 'function') return () => {};
  const onResize = () => setFact('display', readDisplay(env()));
  win.addEventListener('resize', onResize);
  return () => win.removeEventListener('resize', onResize);
}

function startObserver(id) {
  if (id === 'battery' && supported('battery')) observers.battery = startBattery();
  else if (id === 'pressure' && supported('computePressure')) observers.pressure = startPressure();
  else if (id === 'display') observers.display = startDisplay();
}

function stopObserver(id) {
  const stop = observers[id];
  delete observers[id];
  stop?.();
}

/**
 * Listen for changes to `ids` (default: all). Returns the unsubscribe. The first subscriber to an
 * observed fact starts its observer; the last one to leave stops it.
 */
export function subscribe(listener, ids = FACT_IDS) {
  if (!facts) init();
  const entry = { listener, ids: new Set(ids) };
  listeners.add(entry);
  for (const id of entry.ids) {
    refs[id] = (refs[id] ?? 0) + 1;
    if (refs[id] === 1) startObserver(id);
  }
  let done = false;
  return () => {
    if (done) return;
    done = true;
    listeners.delete(entry);
    for (const id of entry.ids) {
      refs[id] -= 1;
      if (refs[id] === 0) stopObserver(id);
    }
  };
}

/* ── Polling ───────────────────────────────────────────────────────────────────────────────────── */

function pollOnce() {
  pollTick += 1;
  if (supported('performanceMemory')) setFact('jsHeap', sampleHeap(facts?.jsHeap));
  if (pollTick % STORAGE_EVERY === 0) readStorage();
}

/** Keep the heap (and, every 30th tick, storage) fresh while retained. Returns the release. */
export function retainPolling() {
  if (!facts) init();
  pollRetain += 1;
  if (pollRetain === 1) pollTimer = setInterval(pollOnce, POLL_MS);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    pollRetain -= 1;
    if (pollRetain === 0) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}

/* ── For callers outside React ─────────────────────────────────────────────────────────────────── */

const settled = (f) => f && f.source !== 'pending';

/**
 * Take a temporary subscription, run the one-shot probes, and resolve with the snapshot once they
 * and the observed facts have settled — or when `timeoutMs` passes. Then release everything.
 */
export function probeAll({ timeoutMs = 1500, ids = FACT_IDS } = {}) {
  return new Promise((resolve) => {
    let finished = false;
    let probesDone = false;
    let timer = null;
    let unsubscribe = () => {};
    const observed = ids.filter((id) => id === 'battery' || id === 'pressure');

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const snap = getSnapshot();
      unsubscribe();
      resolve(snap);
    };
    const check = () => {
      if (probesDone && observed.every((id) => settled(getSnapshot()[id]))) finish();
    };

    unsubscribe = subscribe(check, ids);
    timer = setTimeout(finish, timeoutMs);
    ensure(ids).then(() => { probesDone = true; check(); }, () => { probesDone = true; check(); });
  });
}

/* ── Test hook ─────────────────────────────────────────────────────────────────────────────────── */

/**
 * Point the module at a stub `{ win, nav, doc }` (or null for the real one) and forget everything:
 * facts, subscriptions, observers, polling, the support memo and the browser override.
 */
export function _resetForTest(nextEnv = null) {
  gen += 1;
  for (const id of Object.keys(observers)) stopObserver(id);
  listeners.clear();
  for (const id of Object.keys(refs)) delete refs[id];
  for (const k of Object.keys(once)) delete once[k];
  clearInterval(pollTimer);
  pollTimer = null;
  pollRetain = 0;
  pollTick = 0;
  facts = null;
  snapshot = null;
  testEnv = nextEnv;
  _resetSupportMemo();
  _resetBrowserMemo();
}
