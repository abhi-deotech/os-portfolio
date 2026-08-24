import * as Lucide from 'lucide-react';
import { Gamepad2, Layers, Grid3x3, Brain, Hash, Joystick, Blocks, Bomb, Grid2x2 } from 'lucide-react';
import FOLDER_GAMES from './folderGames.json';

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
    achievements: [],
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
    achievements: [],
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
    achievements: [],
  },
  {
    // Kept as `retroarcade` rather than renamed to `doom`: the id is also the window id, the dock
    // entry in apps.jsx and the key in any persisted openWindows array. The title is what the
    // user reads, and that is now honest about which single game this is.
    id: 'retroarcade',
    title: 'DOOM',
    tagline: 'id Software, 1993. Shareware WAD, in an emulator.',
    genre: 'arcade',
    icon: Joystick,
    hue: 34,
    source: 'emulator',
    novelty: true,
    window: { width: 1040, height: 780 },
    controls: { keys: ['↑', '↓', '←', '→', 'Z', 'X', 'Enter'], touch: 'none', desc: 'Arrow keys to move, Z and X to act, Enter for the menu. Keyboard only.' },
    achievements: [],
    credit: { author: 'id Software', url: 'https://github.com/nneonneo/universal-doom', license: 'Shareware WAD (freely redistributable)' },
  },
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
  retroarcade: () => import('../components/RetroArcade.jsx'),
};

/**
 * Games dropped into public/games/<slug>/, generated by scripts/games-manifest.mjs (which runs
 * as part of `npm run build`). They declare their icon as a lucide export NAME rather than a
 * component, because game.json is data on disk and cannot hold a function — so it is resolved
 * here, falling back to a generic pad if the name is wrong rather than crashing the launcher.
 */
const folderGames = FOLDER_GAMES.map((g) => ({
  ...g,
  icon: Lucide[g.icon] ?? Gamepad2,
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
