#!/usr/bin/env node
/**
 * facts-check — proves every system fact is either reported by the browser or labelled as missing.
 *
 * Part 1 is plain Node over the pure module src/system/facts.js (+ gpu.js), driven by stub
 * environments shaped like a Chromium and a Gecko browser: exact fact strings, the neofetch output,
 * the observer lifecycle (per-id ref counts, probeAll with no subscribers, denied pressure, polling),
 * and the formatters.
 *
 * Part 2 loads the real store through Vite's SSR loader (precedent: profile-check.mjs) and runs its
 * persist `migrate` over old terminal histories.
 *
 *   npm run facts:check
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FACT_IDS, POLLED_IDS, fmt, getSnapshot, subscribe, ensure, retainPolling, probeAll, readNetwork,
  unavailableText, _resetForTest,
} from '../src/system/facts.js';
import { renderNeofetch } from '../src/system/neofetch.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

let unhandled = 0;
process.on('unhandledRejection', (e) => { unhandled++; console.error('  unhandled rejection:', e); });

const flush = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const noop = () => {};
const MB = 1024 ** 2;
const GB = 1024 ** 3;

const UA = {
  chromeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
  chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:155.0) Gecko/20100101 Firefox/155.0',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1',
  chromeOs: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
};

/* ---------------------------------------------------------------------------------------------
 * Stub environments
 * ------------------------------------------------------------------------------------------- */
function chromiumEnv({ observeImpl } = {}) {
  const log = { constructed: 0, disconnected: 0, instances: [], batteryListeners: 0, active: new Set() };
  class PressureObserver {
    constructor(cb) { this.cb = cb; log.constructed++; log.instances.push(this); }
    observe() { log.active.add(this); return observeImpl ? observeImpl() : Promise.resolve(); }
    disconnect() { log.disconnected++; log.active.delete(this); }
  }
  class GPUAdapter {}
  Object.defineProperty(GPUAdapter.prototype, 'info', { get() { return undefined; }, configurable: true });
  const memory = { usedJSHeapSize: 41 * MB, totalJSHeapSize: 60 * MB, jsHeapSizeLimit: 4.1 * GB };
  const battery = {
    level: 0.84, charging: false, chargingTime: Infinity, dischargingTime: 7800,
    addEventListener() { log.batteryListeners++; },
    removeEventListener() { log.batteryListeners--; },
  };
  const win = {
    PressureObserver,
    GPUAdapter,
    performance: { memory, now: () => 1 },
    isSecureContext: true,
    screen: { width: 2560, height: 1440, colorDepth: 24, isExtended: false },
    devicePixelRatio: 2,
    matchMedia: (q) => ({ matches: q === '(color-gamut: p3)' }),
    addEventListener() {},
    removeEventListener() {},
  };
  const nav = {
    userAgent: UA.chromeWin,
    userAgentData: {
      brands: [{ brand: 'Not.A/Brand', version: '99' }, { brand: 'Google Chrome', version: '152' }],
      platform: 'Windows',
      getHighEntropyValues: async () => ({ platform: 'Windows', platformVersion: '15.0.0', architecture: 'x86', bitness: '64' }),
    },
    hardwareConcurrency: 16,
    deviceMemory: 8,
    storage: { estimate: async () => ({ usage: 3.2 * MB, quota: 12.4 * GB }) },
    getBattery: async () => battery,
    gpu: { requestAdapter: async () => ({ info: { vendor: 'nvidia', architecture: 'ampere', description: '' }, limits: { maxTextureDimension2D: 16384, maxBufferSize: 4 * GB } }) },
    onLine: true,
    languages: ['en-US', 'en'],
    connection: { effectiveType: '4g', downlink: 10, rtt: 50, type: 'wifi' },
  };
  return { env: { win, nav, doc: undefined }, log, memory };
}

function geckoEnv() {
  const gl = {
    RENDERER: 0x1f01,
    getExtension: () => null,
    getParameter: (p) => (p === 0x1f01 ? 'Mozilla' : ''),
  };
  const doc = { createElement: () => ({ getContext: () => gl }) };
  const win = {
    performance: { now: () => 1 },
    isSecureContext: true,
    screen: { width: 1920, height: 1080, colorDepth: 24 },
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    removeEventListener() {},
  };
  const nav = {
    userAgent: UA.firefoxLinux,
    hardwareConcurrency: 8,
    storage: { estimate: async () => ({ usage: 512 * 1024, quota: 2 * GB }) },
    onLine: true,
    languages: ['en-US'],
  };
  return { win, nav, doc };
}

const intl = Intl.DateTimeFormat().resolvedOptions();
const localeText = [intl.locale, intl.timeZone].filter(Boolean).join(' · ');

/* ---------------------------------------------------------------------------------------------
 * 1. Chromium stub: every fact reported, exact strings
 * ------------------------------------------------------------------------------------------- */
{
  const { env, log } = chromiumEnv();
  _resetForTest(env);
  eq('FACT_IDS', [...FACT_IDS], ['cores', 'deviceMemory', 'jsHeap', 'storage', 'battery', 'pressure', 'os', 'arch', 'gpu', 'display', 'locale']);
  eq('POLLED_IDS', [...POLLED_IDS], ['jsHeap', 'storage']);
  ok('nothing ran at import or reset', log.constructed === 0);

  const first = getSnapshot();
  ok('snapshot is frozen', Object.isFrozen(first));
  ok('same reference until a fact changes', getSnapshot() === first);
  eq('storage starts pending', first.storage.source, 'pending');
  eq('pending text', first.storage.text, 'Probing…');

  const unsub = subscribe(noop);
  eq('pressure is pending while awaiting its first sample', [getSnapshot().pressure.source, getSnapshot().pressure.text], ['pending', 'Waiting for first sample']);
  await ensure();
  await flush();
  log.instances[0].cb([{ state: 'fair', time: 123 }]);
  const s = getSnapshot();
  ok('snapshot reference changed after facts arrived', s !== first);

  const want = {
    cores: '16 logical cores reported',
    deviceMemory: '8 GB class (bucketed)',
    jsHeap: '41 MB of 4.1 GB heap limit',
    storage: '3.2 MB site storage used of 12.4 GB quota',
    battery: '84% · discharging · 2 h 10 min left',
    pressure: 'Fair',
    os: 'Windows 11',
    arch: 'x86 · 64-bit',
    gpu: 'nvidia · ampere',
    display: '2560 × 1440 · 2x · 24-bit · P3',
    locale: localeText,
  };
  for (const id of FACT_IDS) {
    eq(`chromium: ${id} reported`, s[id].source, 'reported');
    eq(`chromium: ${id} text`, s[id].text, want[id]);
    ok(`chromium: ${id} fact is frozen`, Object.isFrozen(s[id]));
  }
  eq('pressure segments in detail', s.pressure.detail.segments, 2);
  eq('heap percent is reported', s.jsHeap.detail.percent, 1);
  eq('jsHeap names its capability', s.jsHeap.capabilityId, 'performanceMemory');
  ok('storage percent computed from usage/quota', Math.abs(s.storage.detail.percent - (3.2 * MB) / (12.4 * GB) * 100) < 1e-9);

  const nf = renderNeofetch(s, { browser: { name: 'Chrome', version: '152', engine: 'chromium' }, openWindows: ['notepad', 'terminal'], uptimeMs: 3_900_000, network: readNetwork(env.nav) });
  ok('chromium neofetch has the GPU line', nf.includes('GPU: nvidia · ampere'), nf);
  ok('chromium neofetch has session uptime', nf.includes('Uptime: 1 h 5 min (this session)'), nf);
  ok('chromium neofetch has the network line', nf.includes('Network: Online · 4g'), nf);
  ok('chromium neofetch counts windows', nf.includes('Windows: 2 open'), nf);
  unsub();
  eq('battery listeners removed on unsubscribe', log.batteryListeners, 0);
}

/* ---------------------------------------------------------------------------------------------
 * 2. Gecko stub: Chromium-only facts say so, universal ones still report
 * ------------------------------------------------------------------------------------------- */
{
  _resetForTest(geckoEnv());
  const unsub = subscribe(noop);
  await ensure();
  await flush();
  const s = getSnapshot();
  for (const id of ['deviceMemory', 'jsHeap', 'battery', 'pressure', 'arch']) {
    eq(`gecko: ${id} unavailable/unsupported`, [s[id].source, s[id].reason], ['unavailable', 'unsupported']);
    eq(`gecko: ${id} text`, s[id].text, 'Not exposed by Firefox');
  }
  eq('gecko: os from user agent', [s.os.source, s.os.text], ['reported', 'Linux (from user agent)']);
  for (const id of ['storage', 'cores', 'display', 'locale']) eq(`gecko: ${id} still reported`, s[id].source, 'reported');
  eq('gecko: storage text', s.storage.text, '512 KB site storage used of 2 GB quota');
  eq('gecko: masked WebGL renderer reads as masked', [s.gpu.source, s.gpu.reason, s.gpu.text], ['unavailable', 'masked', 'Masked by Firefox']);

  const nf = renderNeofetch(s, { browser: { name: 'Firefox', version: '155', engine: 'gecko' }, openWindows: [], uptimeMs: 1000, network: readNetwork({ onLine: true }) });
  for (const bad of ['M3 Max', '64GB', '%CPU', 'PID']) ok(`gecko neofetch has no "${bad}"`, !nf.includes(bad), nf);
  const unavailableLines = nf.split('\n').filter((l) => /not exposed|masked by|probing|waiting for|couldn’t read/i.test(l));
  ok('gecko neofetch has unavailable lines', unavailableLines.length >= 5, nf);
  for (const l of unavailableLines) ok(`no digits on unavailable line "${l}"`, !/\d/.test(l));
  ok('gecko neofetch words the heap line', nf.includes('Memory (JS heap): not exposed by Firefox'), nf);
  unsub();
}

/* ---------------------------------------------------------------------------------------------
 * 3. Lifecycle
 * ------------------------------------------------------------------------------------------- */
{
  const { env, log } = chromiumEnv();
  _resetForTest(env);
  const a = subscribe(noop, ['pressure']);
  const b = subscribe(noop, ['pressure', 'cores']);
  eq('two subscribers share one PressureObserver', log.constructed, 1);
  a();
  eq('still observing while one subscriber remains', log.disconnected, 0);
  a();
  eq('a double unsubscribe is a no-op', log.disconnected, 0);
  b();
  eq('last unsubscribe disconnects exactly once', log.disconnected, 1);
  eq('pressure goes back to pending once nobody watches', getSnapshot().pressure.source, 'pending');
}
{
  // StrictMode: subscribe → unsubscribe → subscribe in one tick must not leave an observer running.
  const { env, log } = chromiumEnv();
  _resetForTest(env);
  let u = subscribe(noop, ['pressure']);
  u();
  u = subscribe(noop, ['pressure']);
  await flush();
  eq('strict-mode remount leaves one active PressureObserver', log.active.size, 1);
  u();
  await flush();
  eq('strict-mode remount leaves no active PressureObserver after the last unsubscribe', log.active.size, 0);
}
{
  // Windows platformVersion is an API-contract number, not the OS release.
  const cases = [['15.0.0', 'Windows 11'], ['13.0.0', 'Windows 11'], ['10.0.0', 'Windows 10'], ['1.0.0', 'Windows 10'], ['0.3.0', 'Windows (platform version 0.3.0)']];
  for (const [platformVersion, text] of cases) {
    const { env } = chromiumEnv();
    env.nav.userAgentData.getHighEntropyValues = async () => ({ platform: 'Windows', platformVersion, architecture: 'x86', bitness: '64' });
    _resetForTest(env);
    await ensure(['os']);
    const os = getSnapshot().os;
    eq(`windows platformVersion ${platformVersion}`, [os.text, os.detail?.platformVersion], [text, platformVersion]);
  }
}
{
  const { env, log } = chromiumEnv();
  _resetForTest(env);
  const u = subscribe(noop, ['battery']);
  await flush();
  eq('subscribing to battery alone builds no PressureObserver', log.constructed, 0);
  eq('battery alone attaches its four listeners', log.batteryListeners, 4);
  u();
}
{
  const denied = Object.assign(new Error('not allowed'), { name: 'NotAllowedError' });
  const { env } = chromiumEnv({ observeImpl: () => Promise.reject(denied) });
  _resetForTest(env);
  const before = unhandled;
  const u = subscribe(noop, ['pressure']);
  await flush(20);
  const p = getSnapshot().pressure;
  eq('NotAllowedError → denied', [p.source, p.reason, p.text], ['unavailable', 'denied', 'Blocked by Chrome for this site']);
  eq('denied pressure raises no unhandled rejection', unhandled, before);
  u();
}
{
  const other = Object.assign(new Error('nope'), { name: 'NotSupportedError' });
  const { env } = chromiumEnv({ observeImpl: () => Promise.reject(other) });
  _resetForTest(env);
  const u = subscribe(noop, ['pressure']);
  await flush(20);
  eq('any other observe() rejection → unsupported', getSnapshot().pressure.reason, 'unsupported');
  u();
}
{
  const { env, log } = chromiumEnv();
  _resetForTest(env);
  const t0 = Date.now();
  const snap = await probeAll({ timeoutMs: 80 });
  const took = Date.now() - t0;
  eq('probeAll with zero subscribers builds one PressureObserver', log.constructed, 1);
  eq('probeAll disconnects it', log.disconnected, 1);
  ok('probeAll resolves by its timeout', took < 1000, `took ${took} ms`);
  eq('a still-pending pressure reads "Waiting for first sample"', snap.pressure.text, 'Waiting for first sample');
  eq('probeAll ran the one-shot probes', snap.storage.source, 'reported');
  eq('probeAll left no battery listeners', log.batteryListeners, 0);
}
{
  const { env, log } = chromiumEnv();
  _resetForTest(env);
  const pr = probeAll({ timeoutMs: 1000 });
  await flush();
  log.instances[0].cb([{ state: 'serious', time: 1 }]);
  const snap = await pr;
  eq('probeAll resolves early once pressure samples', snap.pressure.text, 'Serious');
}
{
  const { env, memory } = chromiumEnv();
  _resetForTest(env);
  const realSet = globalThis.setInterval;
  const realClear = globalThis.clearInterval;
  const timers = [];
  const cleared = [];
  globalThis.setInterval = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
  globalThis.clearInterval = (id) => { cleared.push(id); };
  try {
    const r1 = retainPolling();
    const r2 = retainPolling();
    eq('one interval for two retainers', timers.length, 1);
    eq('poll interval is 2 s', timers[0].ms, 2000);
    for (let i = 0; i < 40; i++) {
      memory.usedJSHeapSize = (50 + i) * MB;
      timers[0].fn();
    }
    const h = getSnapshot().jsHeap.detail.history;
    eq('history is capped at 30', h.length, 30);
    eq('history holds the latest real samples', h[29], 89 * MB);
    r1();
    ok('interval kept while one retainer remains', !cleared.includes(1));
    r2();
    ok('releasing polling clears the interval', cleared.includes(1));
  } finally {
    globalThis.setInterval = realSet;
    globalThis.clearInterval = realClear;
  }
}
{
  // Stale-safety: a result that lands after a reset never reaches the new generation.
  let resolveEstimate;
  const { env } = chromiumEnv();
  env.nav.storage.estimate = () => new Promise((r) => { resolveEstimate = r; });
  _resetForTest(env);
  const p = ensure(['storage']);
  await flush();
  _resetForTest(geckoEnv());
  resolveEstimate({ usage: 1, quota: 2 });
  await p;
  ok('a late estimate from an old generation is dropped', !getSnapshot().storage.text.startsWith('1 B'), getSnapshot().storage.text);
  eq('the new generation starts pending', getSnapshot().storage.source, 'pending');
}

/* ---------------------------------------------------------------------------------------------
 * 4. Formatters
 * ------------------------------------------------------------------------------------------- */
eq('bytes 0', fmt.bytes(0), '0 B');
eq('bytes 512', fmt.bytes(512), '512 B');
eq('bytes 1.5 KB', fmt.bytes(1536), '1.5 KB');
eq('bytes 41 MB', fmt.bytes(41 * MB), '41 MB');
eq('bytes 12.4 GB', fmt.bytes(12.4 * GB), '12.4 GB');
eq('bytes invalid', [fmt.bytes(-1), fmt.bytes(NaN), fmt.bytes(undefined)], ['', '', '']);
eq('duration < 1 min', fmt.duration(59_000), 'under a minute');
eq('duration minutes', fmt.duration(12 * 60_000), '12 min');
eq('duration hours', fmt.duration(2 * 3_600_000), '2 h');
eq('duration hours + minutes', fmt.duration(130 * 60_000), '2 h 10 min');
eq('duration days', fmt.duration(76 * 3_600_000), '3 d 4 h');
eq('duration invalid', [fmt.duration(-1), fmt.duration(Infinity)], ['', '']);
eq('pressureSegments', ['nominal', 'fair', 'serious', 'critical', 'bogus', undefined].map(fmt.pressureSegments), [1, 2, 3, 4, 0, 0]);
eq('uaFamily for 6 UAs',
  [UA.chromeWin, UA.chromeMac, UA.firefoxLinux, UA.chromeAndroid, UA.safariIphone, UA.chromeOs].map(fmt.uaFamily),
  ['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'ChromeOS']);
eq('uaFamily garbage', [fmt.uaFamily(''), fmt.uaFamily(undefined), fmt.uaFamily('curl/8')], [null, null, null]);
eq('batteryText plugged in', fmt.batteryText({ level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity }), '100% · plugged in');
eq('batteryText charging', fmt.batteryText({ level: 0.62, charging: true, chargingTime: 2400, dischargingTime: Infinity }), '62% · charging · 40 min to full');
eq('batteryText unknown time', fmt.batteryText({ level: 0.5, charging: false, chargingTime: Infinity, dischargingTime: Infinity }), '50% · discharging');
eq('readNetwork with no Network Information API',
  readNetwork({ onLine: true }),
  { isOnline: true, connectionType: 'unknown', effectiveType: 'unknown', downlink: 0, downlinkMax: 0, rtt: 0, saveData: false });
eq('readNetwork with no navigator', readNetwork(undefined).effectiveType, 'unknown');
eq('readNetwork offline', readNetwork({ onLine: false }).isOnline, false);
eq('readNetwork downlink 0 stays 0', readNetwork({ onLine: true, connection: { effectiveType: '4g', downlink: 0 } }).downlink, 0);
eq('networkText', [fmt.networkText({ isOnline: false }), fmt.networkText({ isOnline: true, effectiveType: 'unknown' }), fmt.networkText({ isOnline: true, effectiveType: '3g' })], ['Offline', 'Online', 'Online · 3g']);
eq('unavailableText table',
  [
    unavailableText({ source: 'unavailable', reason: 'unsupported' }, 'Firefox'),
    unavailableText({ source: 'unavailable', reason: 'masked' }, 'Safari'),
    unavailableText({ source: 'unavailable', reason: 'denied' }, 'Chrome'),
    unavailableText({ source: 'unavailable', reason: 'insecure-context' }, 'Chrome'),
    unavailableText({ source: 'pending', reason: 'awaiting-sample' }, 'Chrome'),
    unavailableText({ source: 'pending' }, 'Chrome'),
    unavailableText({ source: 'unavailable', reason: 'error' }, 'Chrome'),
    unavailableText({ source: 'unavailable', reason: 'unsupported' }),
  ],
  ['Not exposed by Firefox', 'Masked by Safari', 'Blocked by Chrome for this site', 'Needs HTTPS', 'Waiting for first sample', 'Probing…', 'Couldn’t read', 'Not exposed by this browser']);
{
  const { probeGpu } = await import('../src/system/gpu.js');
  const glDoc = (renderer, unmasked) => ({
    createElement: () => ({
      getContext: () => ({
        RENDERER: 1,
        getExtension: (n) => (n === 'WEBGL_debug_renderer_info' && unmasked ? { UNMASKED_RENDERER_WEBGL: 2 } : null),
        getParameter: (p) => (p === 2 ? unmasked : renderer),
      }),
    }),
  });
  eq('gpu: unmasked WebGL renderer', (await probeGpu({ doc: glDoc('WebKit WebGL', 'ANGLE (NVIDIA RTX 4070)') })).text, 'ANGLE (NVIDIA RTX 4070)');
  eq('gpu: "Apple GPU" is masked', (await probeGpu({ doc: glDoc('Apple GPU', null) })).source, 'masked');
  eq('gpu: "Generic Renderer" is masked', (await probeGpu({ doc: glDoc('Generic Renderer', null) })).source, 'masked');
  eq('gpu: nothing at all', (await probeGpu({})).source, 'none');
}
{
  // insecure context: storage says why.
  const e = geckoEnv();
  e.win.isSecureContext = false;
  delete e.nav.storage;
  _resetForTest(e);
  eq('insecure context storage', getSnapshot().storage.text, 'Needs HTTPS');
}
_resetForTest(null);

/* ---------------------------------------------------------------------------------------------
 * 5. Migration (the real store, through Vite's SSR loader)
 * ------------------------------------------------------------------------------------------- */
{
  const { createServer } = await import('vite');
  const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  try {
    const store = await vite.ssrLoadModule('/src/store/osStore.js');
    const { TERMINAL_SEED } = await vite.ssrLoadModule('/src/store/slices/systemSlice.js');
    const opts = store.default.persist.getOptions();
    const migrate = opts.migrate;
    eq('store version is 5', opts.version, 5);

    const OLD = 'OS: Lumina Desktop v1.0.0\nKernel: 6.8.0-lumina-os\nUptime: 3 years, 2 months\nCPU: M3 Max (8) @ 4.06GHz\nMemory: 64GB';
    const NOTE = '(neofetch output from an older Lumina was removed: it showed invented hardware)';

    eq('TERMINAL_SEED is one banner line',
      TERMINAL_SEED,
      [{ type: 'output', text: 'Lumina Desktop 1.0.0 · type `neofetch` to see what this browser reports about your device, or `help`.' }]);

    const seeded = migrate({ terminalHistory: [{ type: 'input', text: 'neofetch' }, { type: 'output', text: OLD }] }, 4);
    eq('v5: the old two-entry seed becomes TERMINAL_SEED', seeded.terminalHistory, TERMINAL_SEED);

    const later = migrate({
      terminalHistory: [
        { type: 'input', text: 'neofetch' }, { type: 'output', text: OLD },
        { type: 'input', text: 'ls' }, { type: 'output', text: 'Documents/' },
        { type: 'input', text: 'neofetch' }, { type: 'output', text: OLD },
      ],
    }, 4);
    eq('v5: a later old-neofetch entry becomes the note', later.terminalHistory, [
      ...TERMINAL_SEED,
      { type: 'input', text: 'ls' }, { type: 'output', text: 'Documents/' },
      { type: 'input', text: 'neofetch' }, { type: 'output', text: NOTE },
    ]);

    const unrelated = [{ type: 'input', text: 'help' }, { type: 'output', text: 'Available commands' }];
    eq('v5: an unrelated history is untouched', migrate({ terminalHistory: unrelated }, 4).terminalHistory, unrelated);
    eq('v5: a v5 payload is not migrated again',
      migrate({ terminalHistory: [{ type: 'output', text: OLD }] }, 5).terminalHistory, [{ type: 'output', text: OLD }]);
    eq('v5: a payload without history passes through', migrate({ colorway: 'rose-dusk' }, 4).terminalHistory, undefined);
  } finally {
    await vite.close();
  }
}

eq('no unhandled rejections anywhere', unhandled, 0);
console.log(`\nfacts-check: ${pass} passed, ${fail} failed — ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
