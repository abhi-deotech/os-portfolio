#!/usr/bin/env node
/**
 * wallpaper-url-check — the Plash URL contract for the tiles that reach into the Mac: Shortcut tiles
 * (`sc`) and project tiles (`proj`). The URL is the only state Plash has (see src/wallpaper/config.js),
 * and both kinds turn what is in it into a link that macOS acts on, so what gets through matters:
 *
 *   1. sanitizeShortcut / sanitizeProject on good and hostile input,
 *   2. prefs → query string → prefs round trip, caps and de-duplication,
 *   3. the links launchers.js builds from them.
 *
 *   npm run url:check
 */
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

// src/ imports without extensions (Vite resolves them), so the modules load through Vite's SSR loader.
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const {
  sanitizeShortcut, sanitizeProject, projectName, buildWallpaperSearch, readWallpaperMode, MAX_SHORTCUTS, MAX_PROJECTS,
} = await vite.ssrLoadModule('/src/wallpaper/config.js');
const { shortcutHref, projectHref } = await vite.ssrLoadModule('/src/wallpaper/launchers.js');

let pass = 0;
let fail = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) pass++;
  else { fail++; console.error(`  FAIL ${label}\n       got  ${g}\n       want ${w}`); }
};

/* ── 1. Sanitizers ──────────────────────────────────────────────────────────── */

eq('shortcut: plain name', sanitizeShortcut('Start focus block'), 'Start focus block');
eq('shortcut: emoji and punctuation kept', sanitizeShortcut('🚀 Ship it! (prod), v2: go?'), '🚀 Ship it! (prod), v2: go?');
// Shortcuts matches names exactly, so a name is kept as typed; shortcutHref's encoding makes it safe.
eq('shortcut: URL characters kept (encoded later)', sanitizeShortcut('Timer 25/5 #work 50% @boss a&b=c'), 'Timer 25/5 #work 50% @boss a&b=c');
eq('shortcut: VS16 emoji kept', sanitizeShortcut('☀️ Morning'), '☀️ Morning');
eq('shortcut: ZWJ emoji kept', sanitizeShortcut('👨‍💻 Deep work'), '👨‍💻 Deep work');
eq('shortcut: curly apostrophe and dash kept', sanitizeShortcut('Mom’s call — later'), 'Mom’s call — later');
eq('shortcut: Indic vowel signs kept', sanitizeShortcut('नमस्ते हिन्दी'), 'नमस्ते हिन्दी');
eq('shortcut: decomposed accents kept as typed', sanitizeShortcut('Cafe\u0301'), 'Cafe\u0301');
eq('shortcut: bidi override removed', sanitizeShortcut('Run\u202eevil'), 'Runevil');
eq('shortcut: control characters become spaces', sanitizeShortcut('a\u0000b\tc'), 'a b c');
eq('shortcut: ends trimmed, inner spacing kept as typed', sanitizeShortcut('  Deep  work\u00a0block  '), 'Deep  work\u00a0block');
eq('shortcut: a line break becomes a space', sanitizeShortcut('Join\nstandup'), 'Join standup');
eq('shortcut: empty or blank → null', [sanitizeShortcut(''), sanitizeShortcut(' \n\t '), sanitizeShortcut(null)], [null, null, null]);
eq('shortcut: capped at 50 code points, emoji not split', [...sanitizeShortcut('🚀'.repeat(60))].length, 50);

const P = (path, editor = 'cursor') => sanitizeProject({ editor, path });
eq('project: absolute path', P('/Users/me/Projects/site'), { editor: 'cursor', path: '/Users/me/Projects/site' });
eq('project: trailing and double slashes tidied', P('/Users/me//Projects/site/'), { editor: 'cursor', path: '/Users/me/Projects/site' });
eq('project: spaces and unicode kept', P('/Users/me/My Work/café', 'vscode'), { editor: 'vscode', path: '/Users/me/My Work/café' });
eq('project: relative refused', P('Projects/site'), null);
eq('project: ~ refused (the page cannot expand it)', P('~/Projects/site'), null);
eq('project: .. refused', P('/Users/me/../../etc'), null);
eq('project: . refused', P('/Users/./me'), null);
eq('project: root alone refused', P('/'), null);
eq('project: ? and # refused', [P('/a?b'), P('/a#b')], [null, null]);
eq('project: control characters refused', [P('/a\nb'), P('/a\u0000b')], [null, null]);
eq('project: format characters refused', [P('/Users/me/x\u202eevil'), P('/a\u200bb')], [null, null]);
eq('project: unknown editor refused', P('/Users/me/x', 'sublime'), null);
eq('project: over 200 chars refused', P(`/${'a'.repeat(200)}`), null);
eq('projectName', projectName('/Users/me/Projects/site'), 'site');

/* ── 2. Round trip ──────────────────────────────────────────────────────────── */

{
  const prefs = {
    shortcuts: ['Start focus block', '🚀 Ship'],
    projects: [{ editor: 'cursor', path: '/Users/me/Projects/site' }, { editor: 'vscode', path: '/Users/me/My Work/api' }],
  };
  const back = readWallpaperMode(buildWallpaperSearch(prefs), false).prefs;
  eq('round trip: shortcuts', back.shortcuts, prefs.shortcuts);
  eq('round trip: projects', back.projects, prefs.projects);

  const none = readWallpaperMode('?mode=wallpaper', false).prefs;
  eq('absent params → empty lists', [none.shortcuts, none.projects], [[], []]);

  const q = new URLSearchParams({ mode: 'wallpaper' });
  for (let i = 0; i < 7; i++) q.append('sc', `S${i}`);
  q.append('sc', 'S1');
  for (let i = 0; i < 7; i++) q.append('proj', `cursor~/p/${i}`);
  q.append('proj', 'vscode~/p/0');
  q.append('proj', 'cursor~/p/../etc');
  q.append('proj', 'nope');
  q.append('proj', '~/p/9');
  q.append('proj', 'javascript~/p/x');
  const capped = readWallpaperMode(`?${q}`, false).prefs;
  eq('shortcuts capped and de-duplicated', capped.shortcuts, ['S0', 'S1', 'S2', 'S3'].slice(0, MAX_SHORTCUTS));
  eq('projects capped, de-duplicated by path, hostile ones dropped',
    capped.projects.map((p) => `${p.editor}~${p.path}`), ['cursor~/p/0', 'cursor~/p/1', 'cursor~/p/2', 'cursor~/p/3'].slice(0, MAX_PROJECTS));
}

/* ── 3. Links ───────────────────────────────────────────────────────────────── */

eq('shortcut link', shortcutHref('🚀 Ship & go'), 'shortcuts://run-shortcut?name=%F0%9F%9A%80%20Ship%20%26%20go');
eq('project link: cursor', projectHref({ editor: 'cursor', path: '/Users/me/Projects/site' }), 'cursor://file/Users/me/Projects/site');
eq('project link: segments encoded', projectHref({ editor: 'vscode', path: '/Users/me/My Work/100%' }), 'vscode://file/Users/me/My%20Work/100%25');

await vite.close();
console.log(`\nwallpaper-url-check: ${pass} passed, ${fail} failed — ${fail ? 'FAIL' : 'PASS'}`);
process.exit(fail ? 1 : 0);
