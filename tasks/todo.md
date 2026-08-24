# Retro / Games rebuild — Phase 1 + Phase 2

Decisions taken (2026-08-21): emulator **demoted to a single DOOM tile** inside the new
registry; everything else in the retro catalog is deleted. Scope approved: Phase 1 + Phase 2.

## Evidence this is based on

Verified first-hand, not inferred:

- 2048's vertical axis is inverted. Differential test vs. a reference implementation:
  LEFT/RIGHT 0 mismatches in 200k grids, UP/DOWN 198,991/200,000 each, and 0/800,000 once
  UP and DOWN are swapped. Cause is the rotation map at `Game2048.jsx:83`.
- 2 of the 4 dead ROM paths were **fabricated**: a full walk of `OpenEmu/OpenEmu-Update`
  (3,589 paths) has zero hits for `Spacegulls` or `Retroid`, and no `Game Boy` directory.
  The other 2 were typos — `streemerz-v02.nes` and `Blade Buster` (with the space) both 200.
- Metadata is fabricated too: `RetroArcade.jsx:29` credits Streemerz to "The New 8-bit
  Heroes"; the README shipped beside the ROM says `(C) 2012 Faux Game Company`.
- All 5 game achievements (`2048_master`, `memory_master`, `snake_pro`, `sudoku_pro`,
  `trivia_expert`) are fired but exist in **neither** registry. 3 more (`deep_thinker`,
  `devops_escape`, `system_pro`) are in the panel but not the toast, so they unlock silently.
- A dead ROM renders as a bare `Network Error`; `onError` never fires because the *iframe*
  loads fine, so the "Core Initialization Failure" UI at `RetroArcade.jsx:229` is unreachable.

## Phase 1 — Stop the bleeding

- [ ] `src/config/achievements.js` — one registry, id → {title, desc, icon, hue}, including
      the 5 orphaned game ids
- [ ] Rewire `Achievements.jsx` and `AchievementToast.jsx` to import it; delete both private
      lists; reconcile the two conflicting `architect` entries
- [ ] `unlockAchievement` dev-warns on an id absent from the registry
- [ ] 2048: swap the UP/DOWN rotation map; re-run the 800k-move harness to 0 mismatches
- [ ] 2048: lift `setScore` / `localStorage` / `unlockAchievement` out of the `setGrid` updater
- [ ] Snake: fix growth — `setFood` inside the `setSnake` updater makes `ateFood` depend on an
      undocumented React eager-state optimization
- [ ] Snake: exclude the vacating tail tip from the self-collision test
- [ ] Snake: drop the bogus `'games' || 'retroarcade'` focus guard
- [ ] All games: scope keydown to a focused board element, `preventDefault` the arrows
      (kills the minimized-window key-eating and the desktop scroll at the root)
- [ ] Emulator: reduce `RETRO_GAMES` to DOOM only; delete `ArcadeAI.jsx`; delete the 6 unused
      thumbnails; fix the bottom bar covering the EmulatorJS menu; correct the control overlay
      to the keys actually bound

**Done when:** every tile launches something that works, ArrowUp moves up, a minimized game
consumes no keys, and the 5 game achievements render.

## Phase 2 — The spine

- [ ] `src/config/games.js` — `GAMES`, `GAME_MODULES`, `GAME_BY_ID`
- [ ] `src/store/slices/gamesSlice.js` — `gameStats`, replacing the 3 loose localStorage scalars
- [ ] `WindowContentRenderer.jsx` — add the `default:` arm that resolves from the registry
- [ ] Point `Games.jsx` (5 duplicated tiles → map), `Spotlight.jsx`, `TaskManager.jsx` at it
- [ ] `App.jsx` — window title and size from the registry
- [ ] Migrate legacy `snake-high-score` / `2048-best-score` / `memory-best-moves`

**Done when:** Spotlight finds "snake", Task Manager names it, windows size correctly, and
adding a game is a one-object diff.

## Phase 3 — Shared shell + repair

- [x] `useGameLoop` (fixed-step rAF accumulator, clamped catch-up), `useGameInput` (DOM-scoped
      keys + swipe), `useGameAudio` (honours the OS `soundEnabled`), `useHighScore` (numeric,
      migrates the three legacy localStorage keys), `canvasPalette()` for canvas games
- [x] `GameShell` — title, score/best, pause, restart, mute, how-to-play, exit, and the focusable
      board wrapper. Overlays render absolutely inside it, which fixes Memory's clipped win panel
- [x] All five games rebuilt onto it: Snake, 2048, Sudoku, Memory, Trivia
- [x] Sudoku: real generator (randomized fill + bitmask solver + uniqueness-checked digging),
      4 difficulties, keyboard digits, notes, undo, timer, derived conflicts
- [x] Trivia: `TIMED_OUT` state, Fisher-Yates, bigger bank, streak, per-question countdown
- [x] Memory: Fisher-Yates, flip-lock, difficulties, timer
- [x] No side effect inside any `setState` updater, in any game

## Phase 4 — Catalog + install path

- [x] Three new games: Breakout, Minesweeper, Tower Stack
- [x] `SandboxedGame` — `sandbox="allow-scripts"` with no `allow-same-origin`; `src=` for folder
      games so relative assets resolve, `srcdoc=` + a localStorage shim for sideloads
- [x] `AddGameDialog` — drop or pick one self-contained `.html`, ≤2 MB, with a worked example
- [x] `gamesSlice` — sideload metadata in zustand, payloads in a separate idb-keyval store so a
      2 MB game is not re-serialized on every unrelated settings write
- [x] `scripts/games-manifest.mjs` + `public/games/README.md`, wired into `npm run build`
- [x] Vendored three MIT games through the folder convention (licences verified via the GitHub
      API before pulling anything in): Bubble Shooter, Match 3, Tetris
- [x] CSP added to netlify.toml, vercel.json **and** vite.config.js (dev + preview)
- [x] Launcher: real All Games grid, wired See All, real Trophy Room, Settings tab removed

## Review

All Phase 1 and Phase 2 items are done. Build passes, `eslint src/` is clean (0 errors; the one
remaining warning is pre-existing in MusicApp.jsx).

**Verified, not assumed:**

- 2048 direction: differential test of the shipped `applyMove` against an independent reference,
  **0 mismatches in 800,000 moves** (was 198,991/200,000 on each of UP and DOWN). The `moved` flag
  and `addedScore` are also exact across all 800k. Re-run after the later refactor: still 0.
- 2048 in the running app: React fiber state after ArrowUp read `2 2 2 0` in row 0 — tiles move up.
- 2048 scoring: a move merging one pair of 2s moved the score 544 → 548. Exactly +4.
  **This caught a bad first fix** — deferring the side effects to a `queueMicrotask` from inside
  the updater still double-counted (delta of 8). See tasks/lessons.md. The working fix computes
  from a `gridRef` in the event handler, where StrictMode does not re-invoke.
- Window sizes from the registry: measured 620×780 (Snake), 560×780 (2048), 900×650 (Games,
  unregistered → default). Previously every window was 900×650.
- Launcher: renders all six registry entries, DOOM carries the "EMULATED" badge, and the sidebar
  reads a real `HONORS 3 / 21` from the store instead of the hardcoded "LVL 42" and 75% bar.
- Trophy Room: all five previously-orphaned game achievements render, counted honestly
  ("1 of 5 game honors earned") instead of the four invented 80/100/35/60 progress bars.
- DOOM: `started: true`, `failedToStart: false`, `crossOriginIsolated: true`, SharedArrayBuffer
  present. The control strip lists the keys read out of the running prboom core's own table.
- Boards self-focus on mount (`document.activeElement === board`, `tabIndex 0`), so keys are
  DOM-scoped rather than bound to `window`.
- token-lint: **−280** untokenized occurrences. The games surface is at **0** allowance —
  RetroArcade alone retired 59, Games.jsx 70. RetroArcade also dropped out of the `MEDIA_FILES`
  denylist, an exemption written for video letterboxing that it had been using to hold 51
  white/black literals.
- 4.27 MB of dead thumbnails deleted.

### Phase 3 / 4 verification

Headless differential tests, run against the real source extracted from the shipped files:

- **Sudoku** — 40 generated puzzles across all 4 difficulties: **0 non-unique**, 0 unsolvable,
  0 disagreements between the solver and the stored solution. Clue counts hit their targets
  (easy 44–45, medium 35–36, hard 29–30, expert 26). Fisher-Yates deviates 1.43% from uniform
  over 180k shuffles, against roughly 40% for the `sort(() => Math.random() - 0.5)` it replaced.
- **Minesweeper** — 1,200 boards across all 3 difficulties: **0** mines on the first click, **0**
  mines adjacent to it, 0 wrong mine counts, 0 adjacency mismatches, and no board where the first
  click opened fewer than 2 cells (mean opening region 39.9 cells).
- **2048** — re-ran the 800k-move differential after the GameShell rewrite: still 0 mismatches.

In the running app:

- The sandbox is real, measured from inside a frame: scripts and canvas run, while `localStorage`
  and `parent.location` **both throw SecurityError**.
- Full sideload round trip: drop an `.html` → tile appears with an "Unverified" badge and a Remove
  button → launches into an opaque-origin `srcdoc` frame with the shim injected → the game's
  `window.lumina.score(6)` reaches the shell header. Removing it purges the payload store too
  (0 leftover keys).
- All 12 games render as tiles: 5 rebuilt, 3 new, DOOM, 3 vendored.

**Found and fixed during verification:** `frame-ancestors 'none'` in the new CSP applied to *every*
response including `public/games/<slug>/index.html`, so the sandboxed game frames failed with
`ERR_BLOCKED_BY_RESPONSE`. Now `'self'`, which still blocks another origin from framing the
portfolio. This is exactly why the CSP is served from `vite.config.js` in dev as well as from the
two deploy configs — it failed locally instead of only in production.

### Not verified, and why

The Browser pane does not composite: measured **0 requestAnimationFrame callbacks in 1500 ms**,
`visibilityState: "hidden"`. So the canvas games (**Breakout**, **Tower Stack**) and Snake's loop
could not be seen running — their modules load, mount inside GameShell and take focus with no
console errors, and their logic passed adversarial review, but the moving picture is unverified
here and wants a real browser. The three vendored games load and are correctly sandboxed; their
gameplay likewise was not played through.

**Pre-existing, untouched:** `src/components/MusicApp.jsx` trips the token-lint ratchet
(stock Tailwind colour 11 → 13). Confirmed present on a clean `git stash` of this work, so it is
not a regression from these changes.
