import {
  Gamepad2, Layers, Grid3x3, Brain, Hash, Blocks, Bomb, Grid2x2, Circle,
} from 'lucide-react';
import FOLDER_GAMES from './folderGames.json';

/**
 * The icons a folder game is allowed to name, keyed by their lucide export name.
 *
 * This was `import * as Lucide from 'lucide-react'`. A namespace import cannot be tree-shaken —
 * the bundler has to assume any export might be read — so the entire icon set, 1,498 KB of source,
 * was pulled in to resolve the three names that folderGames.json actually uses. App.jsx imports
 * `GAME_BY_ID` from this file, so all of it landed on first paint.
 *
 * Naming them explicitly costs a line per icon and takes the eager lucide payload to 91 KB. A game
 * that names something absent still falls back to the generic pad below, exactly as before, so the
 * failure mode is unchanged — it is just reached by a wider set of inputs now. Add an entry here
 * when a new folder game wants an icon this map does not carry.
 */
const FOLDER_GAME_ICONS = { Circle, Grid3x3, Layers };

/**
 * The game registry — the single source of truth for the Games section.
 *
 * Before this file, a game was markup rather than data. The launcher held five byte-identical
 * ~1,270-character <div> tiles (one had already drifted: the Retro tile used `font-black` where
 * the other four used `font-bold`), and adding a single game meant hand-editing seven files
 * across five lists that did not agree with each other:
 *
 *   - Games.jsx            a hardcoded tile per game
 *   - WindowContentRenderer.jsx  a `case` per game, in a switch ending `default: return null`
 *   - apps.jsx             the dock entry
 *   - Spotlight.jsx        which contained NO games at all — searching "snake" returned nothing
 *   - TaskManager.jsx      its own separate process list
 *   - Achievements.jsx / AchievementToast.jsx   two more lists, missing all five game ids
 *
 * Everything now derives from GAMES. Adding a game is one object here plus one lazy import in
 * GAME_MODULES.
 *
 * `hue` is an OKLCH hue angle on the same contract as apps.jsx and achievements.js — the active
 * colorway sets chroma and lightness, so a tile cannot land off-theme the way the old private
 * five-hex tile palette did.
 */
const BUILTIN_GAMES = [
  {
    id: 'snake',
    title: 'Snake',
    tagline: 'Classic arcade, one wrong turn from over.',
    genre: 'arcade',
    icon: Gamepad2,
    hue: 145,
    source: 'builtin',
    window: { width: 620, height: 780 },
    controls: { keys: ['↑', '↓', '←', '→'], touch: 'swipe', desc: 'Arrow keys or swipe to steer.' },
    achievements: ['snake_pro'],
    featured: true,
  },
  {
    id: '2048',
    title: '2048',
    tagline: 'Merge tiles. Reach 2048.',
    genre: 'puzzle',
    icon: Layers,
    hue: 56,
    source: 'builtin',
    window: { width: 560, height: 780 },
    controls: { keys: ['↑', '↓', '←', '→'], touch: 'swipe', desc: 'Arrow keys or swipe to slide every tile.' },
    achievements: ['2048_master'],
  },
  {
    id: 'memory',
    title: 'Memory Match',
    tagline: 'Test your visual recall.',
    genre: 'puzzle',
    icon: Grid3x3,
    hue: 122,
    source: 'builtin',
    window: { width: 900, height: 720 },
    controls: { keys: [], touch: 'tap', desc: 'Click or tap a card to flip it.' },
    achievements: ['memory_master'],
  },
  {
    id: 'trivia',
    title: 'Trivia Quest',
    tagline: 'Knowledge challenges against the clock.',
    genre: 'quiz',
    icon: Brain,
    hue: 300,
    source: 'builtin',
    window: { width: 820, height: 680 },
    controls: { keys: [], touch: 'tap', desc: 'Click or tap an answer before the timer runs out.' },
    achievements: ['trivia_expert'],
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    tagline: 'Train your logical thinking.',
    genre: 'logic',
    icon: Hash,
    hue: 176,
    source: 'builtin',
    window: { width: 660, height: 800 },
    controls: { keys: [], touch: 'tap', desc: 'Tap a cell, then pick a digit.' },
    achievements: ['sudoku_pro'],
  },
  {
    id: 'breakout',
    title: 'Breakout',
    tagline: 'Clear every brick without dropping the ball.',
    genre: 'arcade',
    icon: Blocks,
    hue: 24,
    source: 'builtin',
    window: { width: 720, height: 780 },
    controls: { keys: ['←', '→'], touch: 'drag', desc: 'Arrow keys, or drag anywhere to move the paddle.' },
    // Every id listed here must exist in src/config/achievements.js — unlockAchievement dev-warns
    // on unknown ids, and the launcher's Trophy Room groups its rows by THIS field, so a game with
    // an empty array simply has no section there. These four games shipped with `achievements: []`
    // until their ids were registered; the arrays and the registry are now updated together.
    achievements: ['breakout_pro'],
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    tagline: 'Find every mine without setting one off.',
    genre: 'logic',
    icon: Bomb,
    hue: 264,
    source: 'builtin',
    window: { width: 780, height: 800 },
    controls: { keys: ['↑', '↓', '←', '→', 'Enter', 'F'], touch: 'tap', desc: 'Tap to reveal, long-press to flag. First click is always safe.' },
    achievements: ['mines_master'],
  },
  {
    id: 'towerstack',
    title: 'Tower Stack',
    tagline: 'Time the drop. Stack it higher.',
    genre: 'arcade',
    icon: Grid2x2,
    hue: 86,
    source: 'builtin',
    window: { width: 560, height: 800 },
    controls: { keys: ['Space'], touch: 'tap', desc: 'Space or tap to drop the block.' },
    achievements: ['tower_pro'],
  },
  // ── DOOM / the EmulatorJS arcade is DISABLED, not deleted ──────────────────────────────────
  // src/components/RetroArcade.jsx and public/arcade/ are untouched on disk; only the three
  // registry hooks are gone (this entry, the GAME_MODULES loader below, and the apps.jsx dock
  // entry). Everything else — Spotlight, window titles, the launcher grid — derives from those
  // registries, so it disappeared on its own.
  //
  // WHY: the emulator ran `EJS_threads = true`, whose threaded WASM core needs SharedArrayBuffer,
  // which forced COOP/COEP cross-origin isolation site-wide. That isolation made every external
  // iframe fail on Firefox and Safari — Flow-Net could not open a single URL. One 1993 shareware
  // game was costing three working apps on two browser families. See vite.config.js.
  //
  // TO RESTORE: re-add this entry (plus `Joystick` to the lucide import above, dropped with it),
  // the GAME_MODULES line, the apps.jsx dock entry, and the widget guard in App.jsx. Do NOT put
  // the COOP/COEP headers back with it — set
  // `window.EJS_threads = typeof SharedArrayBuffer === 'function'` in public/arcade/index.html
  // instead, so prboom falls back to a single thread rather than hard-failing with EmulatorJS's
  // "Error for site owner" (it does not fall back on its own; verified in emulator.min.js).
  // `requiresThreads` there lists only ppsspp and dosbox_pure, so prboom runs fine unthreaded.
  //
  //   {
  //     id: 'retroarcade',
  //     title: 'DOOM',
  //     tagline: 'id Software, 1993. Shareware WAD, in an emulator.',
  //     genre: 'arcade',
  //     icon: Joystick,
  //     hue: 34,
  //     source: 'emulator',
  //     novelty: true,
  //     window: { width: 1040, height: 780 },
  //     controls: { keys: ['↑', '↓', '←', '→', 'Z', 'X', 'Enter'], touch: 'none', desc: 'Arrow keys to move, Z and X to act, Enter for the menu. Keyboard only.' },
  //     achievements: ['retro_gamer'],
  //     credit: { author: 'id Software', url: 'https://github.com/nneonneo/universal-doom', license: 'Shareware WAD (freely redistributable)' },
  //   },
];

/**
 * Lazy loaders, kept beside the registry so a new game is one entry above and one line here.
 * Split from GAMES itself because the entries are plain serializable data — a component
 * reference in there would stop the registry being usable anywhere data is expected.
 */
export const GAME_MODULES = {
  snake: () => import('../components/games/Snake.jsx'),
  '2048': () => import('../components/games/Game2048.jsx'),
  memory: () => import('../components/games/MemoryGame.jsx'),
  trivia: () => import('../components/games/TriviaGame.jsx'),
  sudoku: () => import('../components/games/Sudoku.jsx'),
  breakout: () => import('../components/games/Breakout.jsx'),
  minesweeper: () => import('../components/games/Minesweeper.jsx'),
  towerstack: () => import('../components/games/TowerStack.jsx'),
  // retroarcade: () => import('../components/RetroArcade.jsx'),  // disabled — see the note above
};

/**
 * Games dropped into public/games/<slug>/, generated by scripts/games-manifest.mjs (which runs
 * as part of `npm run build`). They declare their icon as a lucide export NAME rather than a
 * component, because game.json is data on disk and cannot hold a function — so it is resolved
 * here, falling back to a generic pad if the name is wrong rather than crashing the launcher.
 */
const folderGames = FOLDER_GAMES.map((g) => ({
  ...g,
  icon: FOLDER_GAME_ICONS[g.icon] ?? Gamepad2,
  achievements: [],
}));

/** Builtins plus folder games. Sideloaded games are per-visitor and come from the store. */
export const GAMES = [...BUILTIN_GAMES, ...folderGames];

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));

export const GAME_IDS = GAMES.map((g) => g.id);

export const isGameId = (id) => Object.hasOwn(GAME_BY_ID, id);

/** Sideloaded games all share one id prefix, minted in gamesSlice so they cannot collide. */
export const isUserGameId = (id) => typeof id === 'string' && id.startsWith('user:');

/**
 * Shapes a sideloaded game's stored metadata into the same object the launcher and window
 * renderer use for every other game, so no consumer needs to know where a game came from.
 */
export const userGameEntry = (rec) => ({
  id: rec.id,
  title: rec.title,
  tagline: 'Added by you.',
  genre: 'arcade',
  icon: Gamepad2,
  hue: 210,
  source: 'sideload',
  unverified: true,
  window: { width: 980, height: 760 },
  controls: { keys: [], touch: 'tap', desc: 'This game was added by you. Controls are up to it.' },
  achievements: [],
});

/** The one entry that gets the launcher's hero tile. */
export const FEATURED_GAME = GAMES.find((g) => g.featured) ?? GAMES[0];
