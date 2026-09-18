#!/usr/bin/env node
/**
 * interaction-check — the pure cores behind the browser integrations (Phase 3), in plain Node.
 *
 *   mediaSessionCore  src/utils/mediaSessionCore.js — registrations, the owner stack, position state
 *   idle              src/utils/idle.js — truth tables
 *   popoutDom         src/utils/popoutDom.js — theme copy, sheet sync, bootstrapDocument (fake DOM),
 *                     plus a drift guard against the real applyTheme (Vite ssrLoadModule)
 *   popout policy     src/config/popout.js — curated apps allowed, the rest docked with a reason (Vite)
 *   noteExport        src/utils/noteExport.js — download names, share payload fallbacks (fake navigators)
 *
 *   npm run interaction:check
 */
import {
  MEDIA_ACTIONS, ownersOf, registerOwner, safePositionState, trackMetadata,
} from '../src/utils/mediaSessionCore.js';
import { IDLE_MS, idleTransition, isSystemIdle } from '../src/utils/idle.js';
import {
  BASE_CSS, POPOUT_BODY_CLASS, THEME_ATTRS, bootstrapDocument, copyThemeState, sheetKey, syncSheets,
} from '../src/utils/popoutDom.js';
import { buildSharePayload, downloadFileName, noteMime } from '../src/utils/noteExport.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/* ---------------------------------------------------------------------------------------------
 * 1. mediaSessionCore
 * ------------------------------------------------------------------------------------------- */

/** A navigator.mediaSession stand-in. `throwOn` actions throw like an engine that lacks them. */
function fakeSession({ throwOn = [] } = {}) {
  const handlers = new Map();
  const log = { registered: 0, positionCalls: [] };
  return {
    metadata: null,
    playbackState: 'none',
    handlers,
    log,
    setActionHandler(action, fn) {
      if (throwOn.includes(action)) throw new TypeError(`"${action}" is not a valid MediaSessionAction`);
      if (fn) { handlers.set(action, fn); log.registered++; } else handlers.delete(action);
    },
    setPositionState(state) {
      log.positionCalls.push(state === undefined ? null : state);
    },
  };
}
class FakeMetadata {
  constructor(init) { Object.assign(this, init); }
}
const allHandlers = (tag) => Object.fromEntries(MEDIA_ACTIONS.map((a) => [a, () => `${tag}:${a}`]));

eq('MEDIA_ACTIONS', [...MEDIA_ACTIONS], ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto', 'seekbackward', 'seekforward']);

{
  const s = fakeSession();
  const release = registerOwner(s, 'Music', { handlers: allHandlers('m') }, { MediaMetadata: FakeMetadata });
  eq('7 registrations for a full handler set', s.log.registered, 7);
  eq('every action has a handler', [...s.handlers.keys()].sort(), [...MEDIA_ACTIONS].sort());
  release();
  eq('release of the only owner clears handlers', s.handlers.size, 0);
}

{
  const s = fakeSession({ throwOn: ['seekto'] });
  const release = noThrow('a throwing action is swallowed', () =>
    registerOwner(s, 'Music', { handlers: allHandlers('m') }, { MediaMetadata: FakeMetadata }));
  eq('the other 6 still register', s.log.registered, 6);
  ok('seekto absent, seekforward present', !s.handlers.has('seekto') && s.handlers.has('seekforward'));
  noThrow('release with a throwing action', () => release?.());
}

{
  const s = fakeSession();
  const meta = (title) => trackMetadata({ title, artist: 'A', album: 'B', cover: `https://x/${title}.jpg` });
  const releaseMusic = registerOwner(s, 'Music', {
    metadata: meta('Song'), playbackState: 'playing', handlers: { play: () => 'music-play', pause: () => 'music-pause' },
  }, { MediaMetadata: FakeMetadata });
  eq('Music applied', s.metadata?.title, 'Song');
  ok('metadata built through the MediaMetadata constructor', s.metadata instanceof FakeMetadata);

  const releaseMedia = registerOwner(s, 'Media', {
    metadata: meta('Clip'), playbackState: 'paused', handlers: { play: () => 'media-play' },
  }, { MediaMetadata: FakeMetadata });
  eq('Media on top', s.metadata?.title, 'Clip');
  eq('Media playbackState', s.playbackState, 'paused');
  eq('Media handler wins', s.handlers.get('play')?.(), 'media-play');
  ok('Music-only action cleared while Media is on top', !s.handlers.has('pause'));
  eq('stack order', ownersOf(s), ['Music', 'Media']);

  // An update from the owner underneath must not steal the top.
  releaseMusic.update({ metadata: meta('Next song') });
  eq('background update does not re-apply', s.metadata?.title, 'Clip');

  releaseMedia();
  eq('releasing the top restores the first owner metadata', s.metadata?.title, 'Next song');
  eq('first owner playbackState restored', s.playbackState, 'playing');
  eq('first owner handlers restored', s.handlers.get('pause')?.(), 'music-pause');

  releaseMedia();
  eq('double release is a no-op', s.metadata?.title, 'Next song');

  releaseMusic();
  eq('release all → metadata cleared', s.metadata, null);
  eq('release all → playbackState none', s.playbackState, 'none');
  eq('release all → no handlers', s.handlers.size, 0);
  eq('release all → position state cleared', s.log.positionCalls.at(-1), null);
  eq('stack empty', ownersOf(s), []);
}

{
  // Releasing the owner UNDERNEATH leaves the top owner's session alone.
  const s = fakeSession();
  const a = registerOwner(s, 'Music', { metadata: { title: 'A' } }, { MediaMetadata: FakeMetadata });
  registerOwner(s, 'Media', { metadata: { title: 'B' } }, { MediaMetadata: FakeMetadata });
  a();
  eq('releasing a lower owner keeps the top', s.metadata?.title, 'B');
  eq('stack after lower release', ownersOf(s), ['Media']);
}

{
  const s = fakeSession();
  registerOwner(s, 'Music', { positionState: { duration: 100, position: 5, playbackRate: 1 } }, { MediaMetadata: FakeMetadata });
  eq('position state passed through', s.log.positionCalls.at(-1), { duration: 100, position: 5, playbackRate: 1 });
  // A getter is read on every apply, so the owner underneath comes back at its CURRENT position.
  let pos = 10;
  const s2 = fakeSession();
  registerOwner(s2, 'Music', { getPositionState: () => ({ duration: 100, position: pos, playbackRate: 1 }), positionState: { duration: 100, position: 1, playbackRate: 1 } }, { MediaMetadata: FakeMetadata });
  eq('getter wins over stored positionState', s2.log.positionCalls.at(-1)?.position, 10);
  const top = registerOwner(s2, 'Media', {}, { MediaMetadata: FakeMetadata });
  pos = 42;
  top();
  eq('re-apply after release reads the live position', s2.log.positionCalls.at(-1)?.position, 42);
  noThrow('no session → no-op release', () => { const r = registerOwner(undefined, 'x', {}); r(); r.update({}); });
}

// safePositionState
eq('position: normal', safePositionState({ duration: 200, position: 30, playbackRate: 1 }), { duration: 200, position: 30, playbackRate: 1 });
eq('position: duration 0 → null', safePositionState({ duration: 0, position: 0 }), null);
eq('position: negative duration → null', safePositionState({ duration: -5, position: 0 }), null);
eq('position: Infinity (live) → null', safePositionState({ duration: Infinity, position: 3 }), null);
eq('position: NaN duration → null', safePositionState({ duration: NaN, position: 3 }), null);
eq('position: missing duration → null', safePositionState({ position: 3 }), null);
eq('position: no argument → null', safePositionState(), null);
eq('position: past the end clamps', safePositionState({ duration: 60, position: 75 }), { duration: 60, position: 60, playbackRate: 1 });
eq('position: negative clamps to 0', safePositionState({ duration: 60, position: -4 }), { duration: 60, position: 0, playbackRate: 1 });
eq('position: undefined position → 0', safePositionState({ duration: 60 }), { duration: 60, position: 0, playbackRate: 1 });
eq('position: bad rate → 1', safePositionState({ duration: 60, position: 1, playbackRate: 0 }), { duration: 60, position: 1, playbackRate: 1 });
eq('position: rate kept', safePositionState({ duration: 60, position: 1, playbackRate: 1.5 }), { duration: 60, position: 1, playbackRate: 1.5 });

// trackMetadata
eq('trackMetadata: music track', trackMetadata({ title: 'T', artist: 'A', album: 'L', cover: 'https://c' }),
  { title: 'T', artist: 'A', album: 'L', artwork: [{ src: 'https://c' }] });
eq('trackMetadata: media item uses thumbnail', trackMetadata({ title: 'V', artist: 'P', thumbnail: 'https://t' }),
  { title: 'V', artist: 'P', album: '', artwork: [{ src: 'https://t' }] });
eq('trackMetadata: file-system node uses name', trackMetadata({ id: 'video-portfolio', name: 'Portfolio_Demo.mp4', type: 'video', url: 'https://v' }),
  { title: 'Portfolio_Demo.mp4', artist: '', album: '', artwork: [] });
eq('trackMetadata: null', trackMetadata(null), null);

/* ---------------------------------------------------------------------------------------------
 * 2. idle
 * ------------------------------------------------------------------------------------------- */
eq('IDLE_MS is 2 minutes', IDLE_MS, 120_000);

const IDLE_TABLE = [
  [{ userState: 'active', screenState: 'unlocked' }, false],
  [{ userState: 'idle', screenState: 'unlocked' }, true],
  [{ userState: 'active', screenState: 'locked' }, true],
  [{ userState: 'idle', screenState: 'locked' }, true],
  [{ userState: null, screenState: null }, false],
  [{}, false],
];
for (const [input, want] of IDLE_TABLE) eq(`isSystemIdle ${JSON.stringify(input)}`, isSystemIdle(input), want);
eq('isSystemIdle()', isSystemIdle(), false);

const A = { userState: 'active', screenState: 'unlocked' };
const I = { userState: 'idle', screenState: 'unlocked' };
const L = { userState: 'active', screenState: 'locked' };
const IL = { userState: 'idle', screenState: 'locked' };
const TRANSITIONS = [
  ['null → active', null, A, null],
  ['null → idle', null, I, 'show'],
  ['null → locked', null, L, 'show'],
  ['active → active', A, A, null],
  ['active → idle', A, I, 'show'],
  ['active → locked', A, L, 'show'],
  ['idle → active', I, A, 'hide'],
  ['locked → active', L, A, 'hide'],
  ['idle → locked', I, L, null],
  ['locked → idle+locked', L, IL, null],
  ['idle+locked → active', IL, A, 'hide'],
  ['idle → null', I, null, 'hide'],
];
for (const [label, prev, next, want] of TRANSITIONS) eq(`idleTransition ${label}`, idleTransition(prev, next), want);

/* ---------------------------------------------------------------------------------------------
 * 3. popoutDom — theme copy, sheet sync, bootstrapDocument, THEME_ATTRS drift guard.
 * ------------------------------------------------------------------------------------------- */

/** Just enough of an Element for popoutDom: attributes, children, text, href, style.cssText. */
class FakeEl {
  constructor(tagName, doc) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = doc;
    this.attrs = new Map();
    this.children = [];
    this.parentNode = null;
    this.text = '';
    this.style = { cssText: '' };
  }
  getAttribute(n) { return this.attrs.has(n) ? this.attrs.get(n) : null; }
  setAttribute(n, v) { this.attrs.set(n, String(v)); }
  removeAttribute(n) { this.attrs.delete(n); }
  hasAttribute(n) { return this.attrs.has(n); }
  get attributes() { return [...this.attrs].map(([name, value]) => ({ name, value })); }
  get textContent() { return this.text; }
  set textContent(v) { this.text = String(v); }
  get href() {
    const h = this.getAttribute('href');
    return h == null ? '' : new URL(h, this.ownerDocument.baseURI).href;
  }
  get firstChild() { return this.children[0] ?? null; }
  get nextSibling() {
    const siblings = this.parentNode?.children ?? [];
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }
  detach(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parentNode = null;
  }
  appendChild(child) {
    child.parentNode?.detach(child);
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  insertBefore(child, ref) {
    if (ref == null) return this.appendChild(child);
    child.parentNode?.detach(child);
    this.children.splice(this.children.indexOf(ref), 0, child);
    child.parentNode = this;
    return child;
  }
  remove() { this.parentNode?.detach(this); }
}
function fakeDoc(baseURI) {
  const doc = { baseURI, title: '' };
  doc.createElement = (t) => new FakeEl(t, doc);
  doc.documentElement = doc.createElement('html');
  doc.head = doc.documentElement.appendChild(doc.createElement('head'));
  doc.body = doc.documentElement.appendChild(doc.createElement('body'));
  doc.body.className = '';
  return doc;
}
const el = (doc, tag, attrs = {}, text) => {
  const node = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
};
const tags = (parent) => parent.children.map((c) => c.tagName.toLowerCase());

eq('THEME_ATTRS', THEME_ATTRS, ['data-theme', 'data-colorway', 'data-mode', 'data-grammar', 'data-density', 'data-glass', 'data-motion']);

{
  // Theme copy: adds, changes and removes theme attributes; copies inline vars; leaves others alone.
  const main = fakeDoc('http://localhost:5173/');
  const pop = fakeDoc('about:blank');
  const from = main.documentElement;
  const to = pop.documentElement;
  from.setAttribute('data-theme', 'dark');
  from.setAttribute('data-colorway', 'carbon');
  from.style.cssText = '--sdl-plane: #000;';
  to.setAttribute('data-colorway', 'paper');
  to.setAttribute('data-mode', 'light');
  to.setAttribute('lang', 'en');
  copyThemeState(from, to);
  eq('theme copy adds data-theme', to.getAttribute('data-theme'), 'dark');
  eq('theme copy changes data-colorway', to.getAttribute('data-colorway'), 'carbon');
  eq('theme copy removes a theme attribute the source lacks', to.hasAttribute('data-mode'), false);
  eq('theme copy leaves non-theme attributes', to.getAttribute('lang'), 'en');
  eq('theme copy copies style.cssText', to.style.cssText, '--sdl-plane: #000;');
  from.removeAttribute('data-theme');
  from.setAttribute('data-mode', 'dark');
  copyThemeState(from, to);
  eq('second copy removes data-theme', to.hasAttribute('data-theme'), false);
  eq('second copy adds data-mode', to.getAttribute('data-mode'), 'dark');
}

{
  // Sheet sync.
  const main = fakeDoc('http://localhost:5173/app/');
  const pop = fakeDoc('about:blank');
  const devStyle = main.head.appendChild(el(main, 'style', { type: 'text/css', 'data-vite-dev-id': '/src/index.css' }, 'a{color:red}'));
  const link = main.head.appendChild(el(main, 'link', { rel: 'stylesheet', href: '/assets/index.css', crossorigin: '' }));
  main.head.appendChild(el(main, 'link', { rel: 'icon', href: '/favicon.svg' }));
  main.head.appendChild(el(main, 'meta', { charset: 'utf-8' }));
  main.head.appendChild(el(main, 'style', {}, 'b{margin:0}'));

  eq('sheetKey: dev id', sheetKey(devStyle, 0), '/src/index.css');
  eq('sheetKey: link href', sheetKey(link, 0), '/assets/index.css');
  eq('sheetKey: keyless index', sheetKey(el(main, 'style'), 3), '#3');

  syncSheets(main, pop);
  eq('sync clones the two styles and the stylesheet link only', tags(pop.head), ['style', 'link', 'style']);
  const linkClone = pop.head.children[1];
  eq('link clone gets the ABSOLUTE href', linkClone.getAttribute('href'), 'http://localhost:5173/assets/index.css');
  eq('link clone keeps its other attributes', [linkClone.getAttribute('rel'), linkClone.getAttribute('crossorigin')], ['stylesheet', '']);
  const styleClone = pop.head.children[0];
  eq('style clone text', styleClone.textContent, 'a{color:red}');
  eq('keyless style clone text', pop.head.children[2].textContent, 'b{margin:0}');

  syncSheets(main, pop);
  eq('sync is idempotent', pop.head.children.length, 3);

  devStyle.textContent = 'a{color:blue}';
  syncSheets(main, pop);
  ok('changed style text updates the SAME clone in place', pop.head.children[0] === styleClone && styleClone.textContent === 'a{color:blue}');

  link.remove();
  syncSheets(main, pop);
  eq('orphaned clone removed', tags(pop.head), ['style', 'style']);
  ok('surviving clones are not recreated', pop.head.children[0] === styleClone);

  main.head.appendChild(el(main, 'style', { 'data-vite-dev-id': '/src/theme/grammar.css' }, 'c{}'));
  syncSheets(main, pop);
  eq('a sheet added later is appended', pop.head.children.map((c) => c.getAttribute('data-vite-dev-id')), ['/src/index.css', null, '/src/theme/grammar.css']);
}

{
  // bootstrapDocument.
  const pop = fakeDoc('about:blank');
  pop.head.appendChild(el(pop, 'style', {}, 'existing{}'));
  bootstrapDocument(pop, { title: 'Notepad', baseHref: 'http://localhost:5173/' });
  eq('<base> is the FIRST head child', pop.head.children[0]?.tagName, 'BASE');
  eq('<base href> is the app origin', pop.head.children[0]?.getAttribute('href'), 'http://localhost:5173/');
  eq('charset meta right after base', [pop.head.children[1]?.tagName, pop.head.children[1]?.getAttribute('charset')], ['META', 'utf-8']);
  eq('title', pop.title, 'Notepad — Lumina');
  ok('BASE_CSS style present', pop.head.children.some((c) => c.tagName === 'STYLE' && c.textContent === BASE_CSS));
  eq('BASE_CSS', BASE_CSS, 'html,body{height:100%;margin:0} html body{background:var(--sdl-plane);overflow:auto}');
  // index.css's body rule is unlayered (Tailwind v3) and its synced copy follows BASE_CSS in the
  // popup head, so the plane/overflow rule must outrank a bare `body` selector, not rely on order.
  ok('BASE_CSS plane rule outranks a plain body selector', /(^|\})\s*html body\{[^}]*background:var\(--sdl-plane\)/.test(BASE_CSS));
  eq('body classes copied from App root', pop.body.className, POPOUT_BODY_CLASS);
  eq('POPOUT_BODY_CLASS', POPOUT_BODY_CLASS, 'font-sans select-none text-os-onSurface');
  const count = pop.head.children.length;
  bootstrapDocument(pop, { title: 'Notepad', baseHref: 'http://localhost:5173/' });
  eq('bootstrapDocument is idempotent', pop.head.children.length, count);
  eq('no lang option leaves <html lang> unset', pop.documentElement.getAttribute('lang'), null);
  bootstrapDocument(pop, { title: 'Notepad', baseHref: 'http://localhost:5173/', lang: 'en' });
  eq('lang option sets <html lang> (WCAG 3.1.1)', pop.documentElement.getAttribute('lang'), 'en');
  eq('lang leaves the head alone', pop.head.children.length, count);
  bootstrapDocument(pop, { title: 'Notepad', baseHref: 'http://localhost:5173/', lang: 'fr' });
  eq('a different lang replaces it', pop.documentElement.getAttribute('lang'), 'fr');
}

const { createServer } = await import('vite');
const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  {
    // Drift guard: the attributes the REAL applyTheme writes on <html> must be exactly THEME_ATTRS
    // (⊇ so the popup copies all of them; ⊆ so a new one can't be added without the popup following).
    const { applyTheme } = await vite.ssrLoadModule('/src/theme/applyTheme.js');
    const had = { document: 'document' in globalThis, window: 'window' in globalThis };
    const saved = { document: globalThis.document, window: globalThis.window };
    const written = new Set();
    globalThis.document = {
      documentElement: {
        setAttribute: (n) => written.add(n),
        style: { setProperty() {} },
      },
    };
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    try {
      noThrow('applyTheme with stubs', () => applyTheme({}));
      noThrow('applyTheme reducedMotion on', () => applyTheme({ reducedMotion: 'on' }));
    } finally {
      for (const k of ['document', 'window']) {
        if (had[k]) globalThis[k] = saved[k];
        else delete globalThis[k];
      }
    }
    const missing = THEME_ATTRS.filter((a) => !written.has(a));
    const extra = [...written].filter((a) => a.startsWith('data-') && !THEME_ATTRS.includes(a));
    eq('applyTheme writes every THEME_ATTR (⊇)', missing, []);
    eq('applyTheme writes no data-* attribute outside THEME_ATTRS', extra, []);
  }

  /* -------------------------------------------------------------------------------------------
   * 4. popout policy (src/config/popout.js)
   * ----------------------------------------------------------------------------------------- */
  {
    const { POPOUT, POPOUT_REASONS, popoutPolicy } = await vite.ssrLoadModule('/src/config/popout.js');
    const { GAME_IDS } = await vite.ssrLoadModule('/src/config/games.js');
    const CURATED = ['notepad', 'terminal', 'media', 'photos', 'aichat', 'taskmanager', 'documentation', 'about', 'projects', 'achievements', 'settings'];
    eq('POPOUT lists exactly the curated apps', Object.keys(POPOUT).sort(), [...CURATED].sort());
    for (const id of CURATED) eq(`${id} may pop out`, popoutPolicy(id), { allowed: true, reason: null });

    eq('music docked', popoutPolicy('music'), {
      allowed: false, reason: 'Music plays through an embedded YouTube player, which restarts if moved to another window.',
    });
    eq('browser docked', popoutPolicy('browser'), {
      allowed: false, reason: 'Web pages in Flow-Net reload when moved to another window.',
    });
    ok('the game registry has games to check', GAME_IDS.length > 0);
    const gameReason = 'Games rely on this window for input, visibility and scores.';
    eq(`a game id (${GAME_IDS[0]}) docked`, popoutPolicy(GAME_IDS[0]), { allowed: false, reason: gameReason });
    eq('every game id docked with the games reason', GAME_IDS.filter((g) => popoutPolicy(g).reason !== gameReason), []);
    eq('a user: game docked', popoutPolicy('user:abc123'), { allowed: false, reason: gameReason });
    eq('any other app docked with the generic reason', popoutPolicy('files'), { allowed: false, reason: 'Not yet checked outside the main window.' });
    eq('unknown id docked with the generic reason', popoutPolicy('nope'), { allowed: false, reason: POPOUT_REASONS.other });
  }
} finally {
  await vite.close();
}

/* ---------------------------------------------------------------------------------------------
 * 5. noteExport (src/utils/noteExport.js)
 * ------------------------------------------------------------------------------------------- */
{
  for (const [input, want] of [
    ['Notes', 'Notes.md'],
    ['a/b:c.txt', 'abc.txt'],
    ['', 'Untitled.md'],
    ['README.md', 'README.md'],
    ['Draft.markdown', 'Draft.markdown'],
    ['  *?"<>|  ', 'Untitled.md'],
    ['report.pdf', 'report.pdf.md'],
    [undefined, 'Untitled.md'],
  ]) eq(`downloadFileName(${JSON.stringify(input)})`, downloadFileName(input), want);

  eq('noteMime .txt', noteMime('abc.txt'), 'text/plain');
  eq('noteMime .md', noteMime('Notes.md'), 'text/markdown');
  eq('noteMime .markdown', noteMime('Draft.markdown'), 'text/markdown');

  class FakeFile {
    constructor(parts, name, { type } = {}) { this.parts = parts; this.name = name; this.type = type; }
  }
  // canShare accepts files whose name passes `acceptFile`, and text when `acceptText`.
  const fakeNav = ({ acceptFile, acceptText = true }) => {
    const asked = [];
    return {
      asked,
      share: async () => {},
      canShare: (data) => {
        asked.push(data.files ? `files:${data.files[0].name}` : 'text');
        return data.files ? acceptFile(data.files[0]) : acceptText;
      },
    };
  };
  const args = (nav) => ({ fileName: 'Notes', content: '# Hi', nav, FileCtor: FakeFile });
  const summary = (p) => ({
    kind: p.kind,
    files: p.data?.files?.map((f) => [f.name, f.type, f.parts.join('')]),
    text: p.data?.text,
    title: p.data?.title,
  });

  {
    const nav = fakeNav({ acceptFile: () => true });
    eq('.md accepted → files(.md)', summary(buildSharePayload(args(nav))), {
      kind: 'files', files: [['Notes.md', 'text/markdown', '# Hi']], title: 'Notes',
    });
    eq('.md accepted → .txt never asked', nav.asked, ['files:Notes.md']);
  }
  {
    const nav = fakeNav({ acceptFile: (f) => f.name.endsWith('.txt') });
    eq('.md rejected, .txt accepted → files(.txt)', summary(buildSharePayload(args(nav))), {
      kind: 'files', files: [['Notes.txt', 'text/plain', '# Hi']], title: 'Notes',
    });
    eq('.md asked before .txt', nav.asked, ['files:Notes.md', 'files:Notes.txt']);
  }
  {
    const nav = fakeNav({ acceptFile: () => false });
    eq('both files rejected → text', summary(buildSharePayload(args(nav))), {
      kind: 'text', text: '# Hi', title: 'Notes',
    });
    eq('files tried in order, then text', nav.asked, ['files:Notes.md', 'files:Notes.txt', 'text']);
  }
  {
    const nav = fakeNav({ acceptFile: () => false });
    const p = buildSharePayload({ fileName: 'README.md', content: 'x', nav, FileCtor: FakeFile });
    eq('an existing extension is replaced, not doubled', nav.asked.slice(0, 2), ['files:README.md', 'files:README.txt']);
    eq('README.md falls back to text', p.kind, 'text');
  }
  eq('no share → none', buildSharePayload(args({})).kind, 'none');
  eq('no navigator → none', buildSharePayload(args(undefined)).kind, 'none');
  eq('share without canShare → text', summary(buildSharePayload(args({ share: async () => {} }))), {
    kind: 'text', text: '# Hi', title: 'Notes',
  });
  eq('canShare throwing → treated as rejected', buildSharePayload(args({
    share: async () => {}, canShare: () => { throw new TypeError('nope'); },
  })).kind, 'none');
}

console.log(`\ninteraction-check: ${pass} passed, ${fail} failed — ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
