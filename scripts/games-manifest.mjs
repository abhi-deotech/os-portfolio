#!/usr/bin/env node
/**
 * Builds public/games/index.json from the folders under public/games/.
 *
 * A static host cannot enumerate a directory at runtime — netlify.toml publishes `dist`,
 * render.yaml is `type: static`, and there is no functions directory anywhere in the repo. So
 * the index has to be generated at build time. This runs as part of `npm run build`, which means
 * a deploy cannot ship an index that disagrees with the folders on disk.
 *
 * Each game is public/games/<slug>/ containing:
 *   game.json    required — { id, title, tagline, genre, icon, hue, credit: {author,url,license} }
 *   index.html   required — self-contained; no build step, no server
 *   cover.webp   optional — <= 40 KB
 *   LICENSE      required when the game is vendored from someone else
 *
 * Validation is deliberately strict and fails the build. A silently-skipped game is worse than a
 * broken build: it looks like the convention does not work.
 */
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAMES_DIR = join(ROOT, 'public', 'games');
const OUT = join(GAMES_DIR, 'index.json');

const GENRES = new Set(['arcade', 'puzzle', 'logic', 'quiz']);
const MAX_COVER = 40 * 1024;
const MAX_ENTRY = 2 * 1024 * 1024;

const errors = [];
const games = [];

if (!existsSync(GAMES_DIR)) {
  console.log('games-manifest: no public/games directory; nothing to do.');
  process.exit(0);
}

const slugs = readdirSync(GAMES_DIR)
  .filter((n) => !n.startsWith('.') && !n.startsWith('_'))
  .filter((n) => statSync(join(GAMES_DIR, n)).isDirectory())
  .sort();

const seenIds = new Set();

for (const slug of slugs) {
  const dir = join(GAMES_DIR, slug);
  const fail = (msg) => errors.push(`  ${slug}: ${msg}`);

  const manifestPath = join(dir, 'game.json');
  if (!existsSync(manifestPath)) { fail('missing game.json'); continue; }
  if (!existsSync(join(dir, 'index.html'))) { fail('missing index.html'); continue; }

  let m;
  try {
    m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    fail(`game.json is not valid JSON — ${e.message}`);
    continue;
  }

  for (const field of ['id', 'title', 'tagline', 'genre']) {
    if (!m[field] || typeof m[field] !== 'string') fail(`game.json is missing "${field}"`);
  }
  if (m.genre && !GENRES.has(m.genre)) fail(`genre "${m.genre}" is not one of ${[...GENRES].join(', ')}`);
  if (m.id && seenIds.has(m.id)) fail(`duplicate id "${m.id}"`);
  if (m.id) seenIds.add(m.id);
  if (m.id && !/^[a-z0-9][a-z0-9-]*$/.test(m.id)) fail(`id "${m.id}" must be lowercase kebab-case`);
  if (typeof m.hue !== 'number' || m.hue < 0 || m.hue >= 360) fail('game.json needs a numeric "hue" in [0,360)');

  const credit = m.credit || {};
  if (!credit.author || !credit.license) {
    fail('game.json needs credit.author and credit.license — attribution is not optional for vendored code');
  }
  if (credit.license && credit.license !== 'original' && !existsSync(join(dir, 'LICENSE')) && !existsSync(join(dir, 'LICENSE.md'))) {
    fail(`declares license "${credit.license}" but ships no LICENSE file`);
  }

  const entryBytes = statSync(join(dir, 'index.html')).size;
  if (entryBytes > MAX_ENTRY) fail(`index.html is ${(entryBytes / 1048576).toFixed(1)} MB (limit 2 MB)`);

  let cover = null;
  for (const name of ['cover.webp', 'cover.png', 'cover.jpg']) {
    const p = join(dir, name);
    if (existsSync(p)) {
      const bytes = statSync(p).size;
      if (bytes > MAX_COVER) fail(`${name} is ${Math.round(bytes / 1024)} KB (limit 40 KB)`);
      cover = `/games/${slug}/${name}`;
      break;
    }
  }

  games.push({
    id: m.id,
    title: m.title,
    tagline: m.tagline,
    genre: m.genre,
    hue: m.hue,
    icon: m.icon || 'Gamepad2',
    source: 'folder',
    entry: `/games/${slug}/index.html`,
    cover,
    credit: { author: credit.author, url: credit.url || '', license: credit.license },
    controls: m.controls || { keys: [], touch: 'tap', desc: 'See the game for controls.' },
    window: m.window || { width: 980, height: 760 },
  });
}

if (errors.length) {
  console.error(`games-manifest: ${errors.length} problem(s):\n${errors.join('\n')}`);
  process.exit(1);
}

writeFileSync(OUT, JSON.stringify(games, null, 2) + '\n');

/**
 * Also emitted into src/ so the app can `import` it synchronously.
 *
 * Fetching public/games/index.json at runtime would make the registry async, which every
 * consumer — the launcher, Spotlight, Task Manager, the window renderer — would then have to
 * handle with a loading state. A folder game only changes when the site is rebuilt and
 * redeployed anyway, so there is nothing to gain from deferring it to runtime. The public copy
 * stays because it is a useful, inspectable manifest of what shipped.
 */
const SRC_OUT = join(ROOT, 'src', 'config', 'folderGames.json');
writeFileSync(SRC_OUT, JSON.stringify(games, null, 2) + '\n');

console.log(`games-manifest: indexed ${games.length} folder game(s) -> public/games/index.json + src/config/folderGames.json`);
