#!/usr/bin/env node
/**
 * capabilities-check — proves the capability registry tells the truth and words it consistently.
 *
 * Part 1 is plain Node over the pure modules (src/capabilities/{registry,positions,support,browser,notice}.js):
 * registry shape and tiers, vendor URLs, no browser names in prose, detection against stub
 * environments shaped like three engines, masking, browser naming, exact notice strings, and the
 * status / askable tables.
 *
 * Part 2 renders the real components through Vite's SSR loader (precedent: profile-check.mjs):
 * <CapabilityNotice> and Settings → <Compatibility>.
 *
 *   npm run cap:check
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CAPABILITIES as LEAN, GROUPS, applyMask, detect, getCapability, presetGlobals,
} from '../src/capabilities/registry.js';
import { POSITIONS, VERIFIED_ON, getPositions } from '../src/capabilities/positions.js';
import { deriveAskable, deriveStatus, isSupported, tierOf, _resetSupportMemo } from '../src/capabilities/support.js';
import { describeBrowser, setBrowserOverride, _resetBrowserMemo } from '../src/capabilities/browser.js';
import { buildNotice, worksInText } from '../src/capabilities/notice.js';

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
const noThrow = (label, f) => {
  try { return f(); } catch (e) { fail++; console.error(`  FAIL ${label} threw: ${e?.message ?? e}`); return undefined; }
};
const sorted = (set) => [...set].sort();

/* ---------------------------------------------------------------------------------------------
 * 1. Registry shape
 * ------------------------------------------------------------------------------------------- */
const MOZ_STANCES = new Set(['negative', 'positive', 'neutral', 'defer', 'none']);
const WK_STANCES = new Set(['oppose', 'support', 'neutral', 'blocked', 'concerns', 'not-implementing', 'none']);
const FALLBACKS = new Set(['complete', 'partial', 'none']);
const TIERS = new Set(['universal', 'two-engine', 'chromium']);
const GROUP_IDS = new Set(GROUPS.map((g) => g.id));
const USED_BY = new Set(['files', 'facts', 'music', 'media', 'benchmark', 'notepad', 'immersive', 'screensaver', 'popout']);
const VENDOR_URL_PREFIXES = [
  'https://github.com/mozilla/standards-positions/',
  'https://github.com/WebKit/standards-positions/',
  'https://bugzilla.mozilla.org/',
  'https://lists.webkit.org/',
  'https://webkit.org/tracking-prevention',
];
const BROWSER_NAMES = /\b(Chrome|Chromium|Edge|Firefox|Safari|Opera|Brave|Vivaldi|Mozilla|WebKit|Google|Apple|Microsoft)\b/;
const GLOBAL_PATH = /^(window\.[A-Za-z_$][\w$]*|[A-Z][\w$]*\.prototype\.[A-Za-z_$][\w$]*)$/;

// The registry is split for the first-paint budget: registry.js carries what detection needs, and
// positions.js the prose. Every shape assertion below runs on the two recombined, per id.
const PROSE_KEYS = ['vendor', 'links', 'instead', 'caveat', 'nonStandard', 'verifiedOn'];
const CAPABILITIES = LEAN.map((c) => ({ ...c, ...getPositions(c.id) }));
eq('positions cover exactly the registry ids', Object.keys(POSITIONS).sort(), LEAN.map((c) => c.id).sort());
for (const c of LEAN) {
  ok(`[${c.id}] lean registry entry carries no prose`, PROSE_KEYS.every((k) => !(k in c)), Object.keys(c).join(','));
  ok(`[${c.id}] positions entry carries only prose`, Object.keys(getPositions(c.id) ?? {}).every((k) => PROSE_KEYS.includes(k)));
}
eq('getPositions for an unknown id', getPositions('nope'), undefined);
eq('getPositions ignores inherited keys', getPositions('toString'), undefined);

eq('19 entries', CAPABILITIES.length, 19);
eq('ids are unique', new Set(CAPABILITIES.map((c) => c.id)).size, CAPABILITIES.length);
eq('four groups', GROUPS.map((g) => g.id), ['files', 'facts', 'media', 'windows']);
eq('verifiedOn constant', VERIFIED_ON, '2026-09-17');

for (const c of CAPABILITIES) {
  const at = `[${c.id}]`;
  ok(`${at} label`, typeof c.label === 'string' && c.label.length > 0);
  ok(`${at} group is known`, GROUP_IDS.has(c.group), `group=${c.group}`);
  ok(`${at} detect is a function`, typeof c.detect === 'function');
  ok(`${at} globals is a non-empty array`, Array.isArray(c.globals) && c.globals.length > 0);
  ok(`${at} engines has chromium/firefox/safari keys`,
    c.engines && ['chromium', 'firefox', 'safari'].every((k) => k in c.engines));
  ok(`${at} edge only when it differs`, c.engines?.edge == null || c.engines.edge !== c.engines.chromium);
  ok(`${at} tier is known`, TIERS.has(c.tier));
  eq(`${at} tier === tierOf(engines)`, c.tier, tierOf(c.engines));
  ok(`${at} fallback is known`, FALLBACKS.has(c.fallback));
  ok(`${at} vendor object`, c.vendor && typeof c.vendor === 'object');
  ok(`${at} links.mdn is MDN`, typeof c.links?.mdn === 'string' && c.links.mdn.startsWith('https://developer.mozilla.org/en-US/docs/Web/API/'));
  ok(`${at} instead is one sentence`, typeof c.instead === 'string' && c.instead.length > 0);
  ok(`${at} usedBy is non-empty and known`, Array.isArray(c.usedBy) && c.usedBy.length > 0 && c.usedBy.every((u) => USED_BY.has(u)));
  eq(`${at} verifiedOn`, c.verifiedOn, '2026-09-17');
  if (c.request !== undefined) ok(`${at} request is a function`, typeof c.request === 'function');

  const vendorUrls = [];
  for (const [key, v] of Object.entries(c.vendor ?? {})) {
    ok(`${at} vendor key ${key} is mozilla|webkit`, key === 'mozilla' || key === 'webkit');
    const stances = key === 'mozilla' ? MOZ_STANCES : WK_STANCES;
    ok(`${at} ${key} stance "${v.stance}" is in vocabulary`, stances.has(v.stance));
    ok(`${at} ${key} reason present`, typeof v.reason === 'string' && v.reason.length > 0);
    ok(`${at} ${key} reason has no browser names`, !BROWSER_NAMES.test(v.reason ?? ''), v.reason);
    if (v.url !== undefined) {
      vendorUrls.push(v.url);
      ok(`${at} ${key} url is https on an allowed host`,
        typeof v.url === 'string' && VENDOR_URL_PREFIXES.some((p) => v.url.startsWith(p)), v.url);
    }
  }

  // Non-standard entries have no standards position anywhere to cite.
  if (c.fallback !== 'complete' && c.tier !== 'universal' && !c.nonStandard) {
    ok(`${at} needs a vendor URL (non-complete fallback, non-universal)`, vendorUrls.length > 0);
  }
  if (c.fallback !== 'complete' && c.tier !== 'universal') {
    ok(`${at} needs instead + globals`, !!c.instead && c.globals.length > 0);
  }

  ok(`${at} instead has no browser names`, !BROWSER_NAMES.test(c.instead ?? ''), c.instead);
  ok(`${at} caveat has no browser names`, !BROWSER_NAMES.test(c.caveat ?? ''), c.caveat);
  for (const p of c.globals ?? []) {
    ok(`${at} globals path "${p}" has an allowed root`, GLOBAL_PATH.test(p) && !p.startsWith('Window.prototype'));
  }

  const r = noThrow(`${at} detect({})`, () => c.detect({}));
  eq(`${at} detect({}) is false`, r, false);
  eq(`${at} isSupported with an empty env`, isSupported(c.id, {}), false);
}
eq('detect({}) is the empty set', sorted(detect({})), []);
eq('detect(undefined) is the empty set', sorted(noThrow('detect(undefined)', () => detect(undefined)) ?? new Set(['x'])), []);
eq('unknown id is unsupported', isSupported('nope', {}), false);
eq('idleDetection opens the system tab', getCapability('idleDetection').settingsTab, 'system');
eq('idleDetection is used by the screensaver', getCapability('idleDetection').usedBy, ['screensaver']);

/* ---------------------------------------------------------------------------------------------
 * 2. Stub environments
 * ------------------------------------------------------------------------------------------- */
const noop = () => {};
const VALUES = {
  'window.showDirectoryPicker': noop,
  'window.showOpenFilePicker': noop,
  'window.showSaveFilePicker': noop,
  'StorageManager.prototype.estimate': noop,
  'StorageManager.prototype.persist': noop,
  'StorageManager.prototype.persisted': noop,
  'window.PressureObserver': class PressureObserver {},
  'Navigator.prototype.getBattery': noop,
  'Performance.prototype.memory': { usedJSHeapSize: 1, jsHeapSizeLimit: 2 },
  'Navigator.prototype.deviceMemory': 8,
  'Navigator.prototype.userAgentData': { brands: [], getHighEntropyValues: noop },
  'Navigator.prototype.connection': { effectiveType: '4g' },
  'Navigator.prototype.gpu': { requestAdapter: noop },
  'Navigator.prototype.mediaSession': {},
  'Navigator.prototype.wakeLock': { request: noop },
  'Navigator.prototype.share': noop,
  'Navigator.prototype.canShare': noop,
  'Document.prototype.fullscreenEnabled': true,
  'Element.prototype.requestFullscreen': noop,
  'window.IdleDetector': class IdleDetector {},
  'Keyboard.prototype.lock': noop,
  'window.documentPictureInPicture': {},
  'window.getScreenDetails': noop,
  'Screen.prototype.isExtended': false,
};
for (const c of CAPABILITIES) {
  for (const p of c.globals) ok(`stub table covers ${p}`, p in VALUES);
}

function makeEnv(paths) {
  class Navigator {}
  class StorageManager {}
  class Performance {}
  class Document {}
  class Element {}
  class Keyboard {}
  class Screen {}
  class GPUAdapter {}
  Object.defineProperty(GPUAdapter.prototype, 'info', { get: () => ({}), configurable: true });
  const win = { Navigator, StorageManager, Performance, Document, Element, Keyboard, Screen, GPUAdapter };
  for (const path of paths) {
    const parts = path.split('.');
    const target = parts[0] === 'window' ? win : win[parts[0]].prototype;
    Object.defineProperty(target, parts.at(-1), { value: VALUES[path], configurable: true, writable: true, enumerable: true });
  }
  const nav = new Navigator();
  nav.storage = new StorageManager();
  nav.keyboard = new Keyboard();
  win.performance = new Performance();
  win.screen = new Screen();
  win.navigator = nav;
  const doc = new Document();
  doc.documentElement = new Element();
  win.document = doc;
  return { win, nav, doc };
}

const ALL_PATHS = Object.keys(VALUES);
const CHROMIUM_SET = CAPABILITIES.map((c) => c.id).sort();
const FIREFOX_PATHS = [
  'StorageManager.prototype.estimate', 'StorageManager.prototype.persist', 'StorageManager.prototype.persisted',
  'Navigator.prototype.gpu', 'Navigator.prototype.mediaSession', 'Navigator.prototype.wakeLock',
  'Document.prototype.fullscreenEnabled', 'Element.prototype.requestFullscreen', 'window.documentPictureInPicture',
];
const FIREFOX_SET = ['documentPip', 'fullscreen', 'mediaSession', 'persistentStorage', 'storageEstimate', 'wakeLock', 'webgpu'];
const SAFARI_PATHS = [
  'StorageManager.prototype.estimate', 'StorageManager.prototype.persist', 'StorageManager.prototype.persisted',
  'Navigator.prototype.gpu', 'Navigator.prototype.mediaSession', 'Navigator.prototype.wakeLock',
  'Navigator.prototype.share', 'Navigator.prototype.canShare',
  'Document.prototype.fullscreenEnabled', 'Element.prototype.requestFullscreen',
];
const SAFARI_SET = ['fullscreen', 'mediaSession', 'persistentStorage', 'storageEstimate', 'wakeLock', 'webShare', 'webShareFiles', 'webgpu'];

eq('chromium-like stub supports exactly every id', sorted(detect(makeEnv(ALL_PATHS))), CHROMIUM_SET);
eq('firefox-like stub supports exactly its set', sorted(detect(makeEnv(FIREFOX_PATHS))), FIREFOX_SET);
eq('safari-like stub supports exactly its set', sorted(detect(makeEnv(SAFARI_PATHS))), SAFARI_SET);
eq('isSupported(id, env) agrees with detect', CAPABILITIES.filter((c) => isSupported(c.id, makeEnv(FIREFOX_PATHS))).map((c) => c.id).sort(), FIREFOX_SET);

/* --- masking --------------------------------------------------------------------------------- */
for (const c of CAPABILITIES) {
  const env = makeEnv(ALL_PATHS);
  ok(`[${c.id}] detects in the full stub`, c.detect(env) === true);
  const removed = noThrow(`applyMask ${c.id}`, () => applyMask(env, c.globals));
  eq(`[${c.id}] applyMask removed every path`, removed, c.globals);
  eq(`[${c.id}] masked detect is false`, c.detect(env), false);
}
{
  const env = makeEnv(ALL_PATHS);
  applyMask(env, presetGlobals('firefox'));
  eq('firefox preset mask on a chromium stub = firefox set', sorted(detect(env)), FIREFOX_SET);
}
{
  const env = makeEnv(ALL_PATHS);
  applyMask(env, presetGlobals('safari'));
  eq('safari preset mask on a chromium stub = safari set', sorted(detect(env)), SAFARI_SET);
}
eq('presetGlobals unknown browser', presetGlobals('opera'), []);
ok('presetGlobals never includes a universal entry',
  CAPABILITIES.filter((c) => c.tier === 'universal').every((c) => c.globals.every((p) => !presetGlobals('firefox').includes(p) && !presetGlobals('safari').includes(p))));
eq('applyMask(null) never throws', noThrow('applyMask null', () => applyMask(null, ['window.x'])), []);
eq('applyMask with garbage paths', noThrow('applyMask garbage', () => applyMask({ win: {} }, ['Nope.prototype.x', 'garbage', 'Window.prototype.x', 42])), []);
{
  const frozen = Object.freeze({ showDirectoryPicker: noop });
  eq('applyMask on a non-configurable property never throws', noThrow('applyMask frozen', () => applyMask({ win: frozen }, ['window.showDirectoryPicker'])), []);
}

/* --- memo ------------------------------------------------------------------------------------ */
_resetSupportMemo();
ok('default-env isSupported works in plain Node', typeof isSupported('fileSystemAccess') === 'boolean');

/* ---------------------------------------------------------------------------------------------
 * 3. describeBrowser
 * ------------------------------------------------------------------------------------------- */
const brands = (...list) => ({ userAgentData: { brands: list.map(([brand, version]) => ({ brand, version })) } });
const UA = {
  firefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:155.0) Gecko/20100101 Firefox/155.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15',
  crios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/152.0.7390.40 Mobile/15E148 Safari/604.1',
  edgeUa: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36 Edg/152.0.0.0',
  chromeUa: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
};
const B = (name, version, engine) => ({ name, version, engine });
eq('Chrome brands', describeBrowser(brands(['Not)A;Brand', '8'], ['Chromium', '152'], ['Google Chrome', '152'])), B('Chrome', '152', 'chromium'));
eq('Edge brands', describeBrowser(brands(['Microsoft Edge', '152'], ['Not.A/Brand', '99'], ['Chromium', '152'])), B('Edge', '152', 'chromium'));
eq('Brave brands', describeBrowser(brands(['Brave', '152'], ['Chromium', '152'], ['Not_A Brand', '24'])), B('Brave', '152', 'chromium'));
eq('bare Chromium brands', describeBrowser(brands(['Chromium', '152'], ['Not A(Brand', '99'])), B('Chromium', '152', 'chromium'));
eq('Firefox 155 UA', describeBrowser({ userAgent: UA.firefox }), B('Firefox', '155', 'gecko'));
eq('Safari 27 UA', describeBrowser({ userAgent: UA.safari }), B('Safari', '27', 'webkit'));
eq('CriOS is WebKit', describeBrowser({ userAgent: UA.crios }), B('Chrome', '152', 'webkit'));
eq('Edge UA (no client hints)', describeBrowser({ userAgent: UA.edgeUa }), B('Edge', '152', 'chromium'));
eq('Chrome UA (no client hints)', describeBrowser({ userAgent: UA.chromeUa }), B('Chrome', '152', 'chromium'));
for (const [label, nav] of [['null', null], ['empty', {}], ['number UA', { userAgent: 42 }], ['nonsense UA', { userAgent: 'xyz/1' }], ['only GREASE brand', brands(['Not A Brand', '99'])], ['brands not an array', { userAgentData: { brands: 'x' } }]]) {
  eq(`garbage (${label}) → this browser`, noThrow(`describeBrowser ${label}`, () => describeBrowser(nav))?.name, 'this browser');
}
{
  const hostile = {};
  Object.defineProperty(hostile, 'userAgentData', { get() { throw new Error('boom'); } });
  eq('a throwing navigator → this browser', noThrow('describeBrowser hostile', () => describeBrowser(hostile))?.name, 'this browser');
}
setBrowserOverride({ name: 'Firefox', version: '155', engine: 'gecko' });
eq('override applies to the default call', describeBrowser(), B('Firefox', '155', 'gecko'));
eq('override ignores an explicit nav', describeBrowser({ userAgent: UA.safari }).name, 'Safari');
_resetBrowserMemo();
eq('reset clears the override (Node reads as an unknown browser)', describeBrowser().name, 'this browser');

/* ---------------------------------------------------------------------------------------------
 * 4. Notices — exact strings
 * ------------------------------------------------------------------------------------------- */
const FIREFOX = B('Firefox', '155', 'gecko');
const SAFARI = B('Safari', '27', 'webkit');
const MDN = (p) => `https://developer.mozilla.org/en-US/docs/Web/API/${p}`;

eq('fileSystemAccess in Firefox', buildNotice('fileSystemAccess', FIREFOX), {
  kicker: 'Compatibility', tone: 'warn', icon: 'alert', confirmLabel: 'Got it',
  worksIn: 'Chrome/Edge 86+',
  title: 'Local folder and file access isn’t available in Firefox 155.',
  why: 'Mozilla has declined to implement it, citing the security risk of giving sites write access to local files.',
  message: 'Mozilla has declined to implement it, citing the security risk of giving sites write access to local files. '
    + 'Lumina Cloud keeps your files in site storage instead. Works in: Chrome/Edge 86+',
  links: [
    { label: 'Why', href: 'https://github.com/mozilla/standards-positions/issues/154' },
    { label: 'Support table', href: MDN('Window/showDirectoryPicker') },
  ],
});
eq('fileSystemAccess in Safari', buildNotice('fileSystemAccess', SAFARI), {
  kicker: 'Compatibility', tone: 'warn', icon: 'alert', confirmLabel: 'Got it',
  worksIn: 'Chrome/Edge 86+',
  title: 'Local folder and file access isn’t available in Safari 27.',
  why: 'WebKit has declined to implement it, citing security concerns about sites reading and writing local files.',
  message: 'WebKit has declined to implement it, citing security concerns about sites reading and writing local files. '
    + 'Lumina Cloud keeps your files in site storage instead. Works in: Chrome/Edge 86+',
  links: [
    { label: 'Why', href: 'https://github.com/WebKit/standards-positions/issues/28' },
    { label: 'Support table', href: MDN('Window/showDirectoryPicker') },
  ],
});
{
  const n = buildNotice('idleDetection', FIREFOX);
  eq('idleDetection title', n.title, 'System idle detection isn’t available in Firefox 155.');
  eq('idleDetection message (Chrome and Edge minimums)', n.message,
    'Mozilla has declined to implement it, citing the surveillance risk of revealing when people are away. '
    + 'The screensaver starts after 2 minutes without activity in this page. Works in: Chrome 94+ · Edge 114+');
  eq('idleDetection worksIn', n.worksIn, 'Chrome 94+ · Edge 114+');
  eq('idleDetection in Safari cites the tracking-prevention page', buildNotice('idleDetection', SAFARI).links[0],
    { label: 'Why', href: 'https://webkit.org/tracking-prevention/#anti-fingerprinting' });
}
eq('webgpu in a Chromium stub with no vendor entry', buildNotice('webgpu', B('Chrome', '120', 'chromium')), {
  kicker: 'Compatibility', tone: 'warn', icon: 'alert', confirmLabel: 'Got it',
  worksIn: 'Chrome/Edge 127+ · Firefox 141+ · Safari 26+',
  title: 'GPU adapter information isn’t available in Chrome 120.',
  why: 'Chrome 120 doesn’t expose it on this device or version.',
  message: 'Chrome 120 doesn’t expose it on this device or version. The GPU is described from WebGL where that is available. '
    + 'Works in: Chrome/Edge 127+ · Firefox 141+ · Safari 26+',
  links: [{ label: 'Support table', href: MDN('GPUAdapter/info') }],
});
eq('kind: denied', buildNotice('idleDetection', B('Chrome', '152', 'chromium'), 'denied'), {
  kicker: 'Compatibility', tone: 'warn', icon: 'alert', confirmLabel: 'Got it',
  worksIn: 'Chrome 94+ · Edge 114+',
  title: 'System idle detection is blocked for this site.',
  why: 'This permission is turned off for this site in Chrome.',
  message: 'This permission is turned off for this site in Chrome. To allow it, open this site’s settings from the address bar, '
    + 'then try again. The screensaver starts after 2 minutes without activity in this page.',
  links: [{ label: 'Support table', href: MDN('Idle_Detection_API') }],
});
eq('kind: refused, with the error name', buildNotice('fullscreen', B('Chrome', '152', 'chromium'), 'refused', { errName: 'NotAllowedError' }), {
  kicker: 'Compatibility', tone: 'warn', icon: 'alert', confirmLabel: 'Got it',
  worksIn: 'Chrome/Edge 71+ · Firefox 64+ · Safari 16.4+',
  title: 'Fullscreen didn’t start.',
  why: 'Chrome refused the request (NotAllowedError).',
  message: 'Chrome refused the request (NotAllowedError). Lumina stays inside the browser window.',
  links: [{ label: 'Support table', href: MDN('Fullscreen_API') }],
});
{
  const n = buildNotice('fullscreen', B('this browser', '', 'unknown'), 'refused');
  eq('kind: refused, no error name → title', n.title, 'Fullscreen didn’t start.');
  eq('kind: refused, no error name → why', n.why, 'This browser refused the request.');
  eq('kind: refused, no error name → message', n.message, 'This browser refused the request. Lumina stays inside the browser window.');
  eq('kind: refused → Support table only', n.links, [{ label: 'Support table', href: MDN('Fullscreen_API') }]);
  ok('kind: refused gives no site-settings advice', !/settings|permission/i.test(n.message), n.message);
  eq('kind: refused, empty options object', buildNotice('fullscreen', SAFARI, 'refused', {}).why, 'Safari refused the request.');
}
eq('decimal versions render as-is', worksInText(getCapability('persistentStorage').engines), 'Chrome/Edge 55+ · Firefox 57+ · Safari 15.2+');
eq('edge override renders separately', worksInText({ chromium: 89, edge: 93, firefox: null, safari: 12.1 }), 'Chrome 89+ · Edge 93+ · Safari 12.1+');
eq('unknown browser wording', buildNotice('battery', B('this browser', '', 'unknown')).title, 'Battery status isn’t available in this browser.');
eq('unknown browser message', buildNotice('battery', B('this browser', '', 'unknown')).why, 'This browser doesn’t expose it on this device or version.');
eq('engine that ships it in some version → device/version wording, not the position',
  buildNotice('documentPip', B('Firefox', '140', 'gecko')).why, 'Firefox 140 doesn’t expose it on this device or version.');
eq('concerns verb', buildNotice('keyboardLock', SAFARI).why, 'WebKit hasn’t implemented it and has recorded concerns (security, accessibility and API design).');
eq('blocked verb', buildNotice('uaClientHints', SAFARI).why, 'WebKit hasn’t implemented it; its review is blocked (interoperability and privacy concerns).');
eq('neutral verb', buildNotice('uaClientHints', FIREFOX).why, 'Mozilla hasn’t implemented it (neutral position; mixed benefits against fingerprinting).');
eq('none verb', buildNotice('computePressure', FIREFOX).why, 'Mozilla hasn’t implemented it (no position recorded yet).');
eq('vendor entry without url → Support table only', buildNotice('deviceMemory', FIREFOX).links.map((l) => l.label), ['Support table']);
for (const c of CAPABILITIES) {
  for (const b of [FIREFOX, SAFARI, B('Chrome', '152', 'chromium'), B('this browser', '', 'unknown')]) {
    for (const kind of ['unsupported', 'denied', 'refused']) {
      const n = buildNotice(c.id, b, kind);
      ok(`[${c.id}/${b.engine}/${kind}] no "undefined" in notice`, !JSON.stringify(n).includes('undefined'), JSON.stringify(n));
    }
  }
}

/* ---------------------------------------------------------------------------------------------
 * 5. Status and askable tables
 * ------------------------------------------------------------------------------------------- */
eq('status: unsupported wins', deriveStatus({ supported: false, permission: 'granted' }), 'unsupported');
eq('status: denied', deriveStatus({ supported: true, permission: 'denied' }), 'denied');
eq('status: granted', deriveStatus({ supported: true, permission: 'granted' }), 'granted');
eq('status: prompt', deriveStatus({ supported: true, permission: 'prompt' }), 'prompt');
eq('status: unknown → available', deriveStatus({ supported: true, permission: 'unknown' }), 'available');
eq('status: absent → available', deriveStatus({ supported: true }), 'available');
eq('status: no args', deriveStatus(), 'unsupported');

const req = () => {};
eq('askable: prompt + request', deriveAskable({ request: req, permission: 'prompt' }), true);
eq('askable: unknown + request', deriveAskable({ request: req, permission: 'unknown' }), true);
eq('askable: granted', deriveAskable({ request: req, permission: 'granted' }), false);
eq('askable: denied', deriveAskable({ request: req, permission: 'denied' }), false);
eq('askable: absent permission', deriveAskable({ request: req }), false);
eq('askable: no request', deriveAskable({ permission: 'prompt' }), false);
eq('askable: settingsTab owns it', deriveAskable({ request: req, settingsTab: 'system', permission: 'prompt' }), false);
eq('askable: idleDetection entry is never askable in place',
  deriveAskable({ ...getCapability('idleDetection'), permission: 'prompt' }), false);
eq('askable: persistentStorage entry with unknown permission',
  deriveAskable({ ...getCapability('persistentStorage'), permission: 'unknown' }), true);

/* ---------------------------------------------------------------------------------------------
 * 6. SSR: the real components
 * ------------------------------------------------------------------------------------------- */
const { createServer } = await import('vite');
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');

const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const browserMod = await vite.ssrLoadModule('/src/capabilities/browser.js');
  const gate = await vite.ssrLoadModule('/src/capabilities/CapabilityGate.jsx');
  const compat = await vite.ssrLoadModule('/src/components/settings/Compatibility.jsx');
  const unescape = (h) => h.replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');

  browserMod.setBrowserOverride({ name: 'Firefox', version: '155', engine: 'gecko' });
  const expected = buildNotice('fileSystemAccess', FIREFOX);

  const noticeHtml = unescape(renderToStaticMarkup(createElement(gate.CapabilityNotice, { id: 'fileSystemAccess' })));
  ok('CapabilityNotice renders its title', noticeHtml.includes(expected.title), noticeHtml);
  ok('CapabilityNotice renders the Why href', noticeHtml.includes(`href="${expected.links[0].href}"`));
  ok('CapabilityNotice renders the Support table href', noticeHtml.includes(`href="${expected.links[1].href}"`));
  ok('CapabilityNotice is a labelled section with no live role', /<section aria-labelledby=/.test(noticeHtml) && !/role="status"/.test(noticeHtml));
  ok('CapabilityNotice chip names the browser', noticeHtml.includes('Not in Firefox 155'));
  ok('CapabilityNotice never renders "undefined"', !noticeHtml.includes('undefined'));

  const gateHtml = renderToStaticMarkup(createElement(gate.CapabilityGate, { id: 'fileSystemAccess' }, createElement('button', null, 'MOUNT')));
  ok('CapabilityGate replaces the control with the notice', !gateHtml.includes('MOUNT') && gateHtml.includes('<section'));

  const compatHtml = unescape(renderToStaticMarkup(createElement(compat.default, { onOpenTab: () => {} })));
  ok('Compatibility heading names the browser', compatHtml.includes('What Firefox 155 can do here'));
  for (const c of CAPABILITIES) {
    const count = compatHtml.split(`>${c.label}<`).length - 1;
    eq(`Compatibility renders "${c.label}" once`, count, 1);
  }
  for (const g of GROUPS) ok(`Compatibility renders group "${g.label}"`, compatHtml.includes(g.label));
  ok('Compatibility never renders "undefined"', !compatHtml.includes('undefined'));
  ok('Compatibility footer carries the check date', compatHtml.includes('Support data checked 2026-09-17'));
  ok('Compatibility links both positions repos',
    compatHtml.includes('href="https://github.com/mozilla/standards-positions"') && compatHtml.includes('href="https://github.com/WebKit/standards-positions"'));
  browserMod._resetBrowserMemo();
} finally {
  await vite.close();
}

console.log(`\ncapabilities-check: ${pass} passed, ${fail} failed — ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
