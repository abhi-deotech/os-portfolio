# Revamp: Flow-Net Browser · Music · Game Center

Owner request: *"suggest and implement a complete revamp and improvement of our Browser app,
Music app and Gaming Center."* Grounded in a full exploration pass: the Browser is a 215-line
stub (inert Back/Forward, fake 1s loading timer, no tabs/history/persistence, fully untokenized
and denylist-exempted); Music works but has split-brain volume, duplicated categories, hardcoded
durations and a Last.fm-only Now Playing widget; the Game Center records stats it never shows and
leaves 4 of 12 games without achievements.

Plan: Phase 0 shell enablers directly, then three parallel per-app agents on disjoint file sets,
then one integration + verification pass.

## Phase 0 — Shared shell enablers (direct, before agents)
- [x] `apps.jsx`: per-app `window` sizes for browser/music/games; `App.jsx` consults
      `APP_BY_ID[id]?.window` (and `title`, fixing "Aichat"/"Taskmanager"-style window titles)
- [x] `Spotlight.jsx`: derive the app list from the APPS registry — the hand list covered 9 of 19
      apps and was missing Flow-Net entirely; quick-shortcuts grid shows pinned/featured only
      (retroarcade excluded from the app half so it can't collide with its game entry's key)
- [x] `achievements.js`: registered 7 new ids — `netizen`, `tab_hoarder` (browser), `curator`
      (music), `breakout_pro`, `mines_master`, `tower_pro`, `retro_gamer` (games); icons/hues
      match each game's registry identity — eslint clean on all four files

## Phase 1 — Flow-Net Browser (rewrite) — agent complete (86/86 harness, eslint clean)
- [x] Real tab model (cap 8): per-tab history stacks, working Back/Forward (Alt+←/→), all
      iframes stay mounted so switches don't reload — Browser.jsx 487 lines + browser/ modules
      (browserCore.js pure logic, StartPage, BlockedSplash, Favicon)
- [x] Real loading from iframe `onLoad` + 12s safety + 2px accent indeterminate bar
- [x] Start page (`lumina://start`): autofocused search, bookmarks grid (hover-reveal remove),
      Recent (8, relative time) + Clear — tokenized
- [x] Bookmarks persisted ('lumina-browser-bookmarks'), star toggle, seeded with the 5 defaults;
      explicitly emptied list stays empty (seed only while key absent)
- [x] History persisted ('lumina-browser-history'), cap 100, consecutive-dup skip, clearable
- [x] Blocklist: parsed-URL matcher (github.com.evil.com no longer matches); splash on sdl-warn
      voice. PLUS integration fix: google search WITH `igu=1` embeds (measured: 200, no
      XFO/frame-ancestors) so address-bar search now WORKS; bare google.com/search stays blocked
      (measured SAMEORIGIN) — old app showed the splash for every search
- [x] `openBrowser(url)` → new tab via consumedNavRef-guarded effect (StrictMode-safe);
      WindowContentRenderer no longer keys/remounts on browserNav; at tab cap reuses active tab
- [x] DuckDuckGo ip3 favicons w/ failed-host memo + Globe fallback; Ctrl/Cmd+L; full aria pass
- [x] Achievements on handler paths: `netizen` (navigateTo user paths), `tab_hoarder` (3rd tab)
- [x] Fully tokenized — Browser.jsx REMOVED from denylist MEDIA_FILES (verified 0 violations)

## Phase 2 — Music — agent complete (367/367 harness, eslint clean, 0 literals in MusicApp)
- [x] Volume: canonical 0–100 in store, clamped in slice; PlayerBar + ControlCenter both drive
      `setMusicVolume`; persisted old-scale values (≤1) migrate ×100 in `sanitizePersistedMusic`
- [x] Real durations: 1s poll reconciles `getDuration()` (guarded by `getVideoData().video_id`
      so a loading track can't inherit the previous duration)
- [x] Queue: queueNext/queueLast/dequeue/clearQueue + UpNextPanel + per-row TrackMenu;
      resolution order repeat-one > queue > shuffle-bag > sequential (asserted numerically)
- [x] Shuffle = Fisher–Yates bag keyed to context signature; no repeats per cycle (33-track
      catalog cycled 3×, union=33); session-only by design
- [x] Playlists: full CRUD persisted + Play All context (Liked too); `curator` fires from
      LibraryView submitCreate and TrackMenu "New playlist" handlers
- [x] `CATEGORIES` reshaped `{id,name,hue,genres}` in musicData.js, single-sourced; Explore
      filters genuinely (33/33 tracks reachable); cards use iconStyle washes, not stock gradients
- [x] NowPlayingWidget local-first, Last.fm fallback; background/blur untouched as documented
- [x] Fixes: :216 deps warning gone honestly; fill="black"→currentColor; via.placeholder→
      tokenized element; end-of-playlist now sets isPlaying(false)
- [x] Structure: MusicApp 832→299 composing 11 music/ modules incl. pure playback.js +
      useYouTubePlayer hook (StrictMode-safe destroy — old code leaked the player)
- [x] Visualizer untouched

## Phase 3 — Game Center — agent complete (36/36 harness, eslint + token-lint clean)
- [x] Launcher home: "Jump back in" row (≤4 by lastPlayed desc), stat badges (best, plays) on
      cards; card heights h-40→h-44 / h-48→h-52 to fit the chip row (screenshot-check this)
- [x] `gamesSlice`: `{ plays, lastPlayed }` with lazy migration of persisted `{ plays }`;
      `useHighScore` exports `readAllGameStats()` ({} on any failure)
- [x] Genre filter chips on All Games (law-5 chip treatment, stranded-filter falls back to All)
- [x] Trophy Room: grouped by game + earned/total; earned = accent-soft + aInk, locked = veil
- [x] Achievements wired on event paths: `breakout_pro` (Breakout.jsx:490 board-clear),
      `mines_master` (Minesweeper.jsx:302 endWin), `tower_pro` (TowerStack.jsx:341 15th drop),
      `retro_gamer` (RetroArcade.jsx:61, gated on emulator status==='ready')
- [x] SandboxedGame: `gameover` handled (spam-gated, clamped), best via useHighScore(gameId),
      tokenized overlay + Restart; sandbox attrs unchanged
- [x] Keyboard focus pass on launcher cards (real buttons / tileProps contract + visible rings)
- [x] Token sweep: Snake/Sudoku/TriviaGame audited — already clean, untouched

## Phase 4 — Integration & verification (direct)
- [x] eslint clean: `npx eslint src scripts` → zero problems
- [x] `npm run build` passes (run after the final edit; compression pass completed)
- [x] token-lint: −320 vs allowance, no regressions → blessed (8 files / 109). Browser.jsx AND
      musicData.js removed from the denylist (both verifiably literal-free now)
- [x] Census: white/black literals −145 → 81; untokenized colour sites −495 → 118
- [x] shot.mjs: 7 screenshots (3 apps × dark/light + browser-nav), fresh server, store-instance
      check passed; all reviewed by eye
- [x] End-to-end numeric probes: bookmark click → Wikipedia rendered in-tab, history entry
      persisted ({url, host, ts} correct), `netizen` present in store achievements
- [x] sdl-notes.md entry (2026-09-10); this review section

---

# Review — what shipped and what was verified

**Flow-Net Browser** went from a 215-line stub to a real tabbed browser (487-line component +
four `browser/` modules incl. a React-free `browserCore.js`): up to 8 tabs with per-tab history
and working Back/Forward, true iframe-load state with a 12s safety, a tokenized start page
(search / bookmarks grid / recent), persisted bookmarks + history, a parsed-URL blocklist with a
measured `igu=1` carve-out (in-app Google search now actually renders instead of hitting the
splash — verified by header inspection: with igu=1 Google sends no XFO/frame-ancestors), external
`openBrowser` launches land as new tabs without remounting, favicons, Ctrl/Cmd+L and Alt+←/→,
achievements `netizen` + `tab_hoarder`. 86/86 harness assertions on the shipped core module.

**Music** was restructured from an 832-line monolith to a 299-line entry over 11 `music/`
modules (pure `playback.js`, `useYouTubePlayer` engine hook with StrictMode-safe destroy, views,
PlayerBar, UpNext, TrackMenu). Features: store-canonical 0–100 volume with persisted-value
migration (Control Center slider finally controls playback), duration reconciliation from the
real player, a queue (play-next/add/remove/clear) with Up Next panel, Fisher–Yates shuffle bag,
full playlist CRUD persisted through `sanitizePersistedMusic`, single-sourced categories that
genuinely filter Explore, local-first NowPlayingWidget with Last.fm fallback, `curator`
achievement, and the :216 deps warning fixed honestly. 367/367 harness assertions.

**Game Center**: registry-declared achievements for the four games that had none, wired on real
event paths (Breakout board-clear, Minesweeper endWin, Tower Stack 15th placement, DOOM
emulator-ready); `{plays, lastPlayed}` stats with lazy migration; "Jump back in" row; best/plays
chips on cards; genre filter chips; Trophy Room grouped by game with earned=accent treatment;
SandboxedGame now honors its own `gameover` contract with a tokenized overlay and per-game best
via `useHighScore`; launcher fully keyboard-reachable. 36/36 harness assertions.

**Shell**: per-app window geometry + registry titles; Spotlight derives from the APPS registry
(10 previously unsearchable apps incl. Flow-Net now searchable); 21 → 28 achievements.

### Honest boundaries — NOT exercised
- YouTube playback audio (headless run can't hear; engine behavior against the real YT API is
  logic-verified only). Smoke-check in dev: audio should start on a second mount too, since the
  hook now destroys the player on unmount (the old code leaked it).
- `retro_gamer` depends on the EmulatorJS CDN boot succeeding; a failed boot awards nothing.
- The Games "Jump back in" row and stat chips render only once something has been played —
  screenshots show the empty-state variant (correct conditional), not the populated one.
- ControlCenter's decorative Skip button remains unwired (pre-existing, out of scope; a store-
  level skip channel would be the fix).
- Card heights in the launcher grew (h-40→h-44 / h-48→h-52) to fit stat chips — reviewed in both
  modes at 1440×900; worth one glance on a small laptop viewport.

---

# Carried over from the previous task — still needs the owner

*(The GitHub-sync / profile work in this file is complete and shipped. These items were left
open for the repository owner and are preserved here so they are not lost.)*

- **`recommendations` and `endorsements` ship empty on purpose** — inventing them was the original
  sin. Pull the LinkedIn archive (Settings → Data privacy → Get a copy of your data → *larger
  archive*), then paste `Recommendations_Received.csv` and `Endorsement_Received_Info.csv` into
  the marked slots in `profile.js`. Both sections appear automatically once non-empty.
- **Confirm `identity.location`** — set to *Kota, Rajasthan* (résumé address + what AboutMe
  already showed). If the LinkedIn header says Jaipur, change that one line.
- **`handles.email` is `null`** — `contact@abhi.dev` was hardcoded and is not real; the mail tile
  is filtered out until a real address is supplied. The in-app Mail window still works.
- **Set `GH_SYNC_TOKEN` in the deploy host's env** (any GitHub PAT, no scopes needed). Without it
  the deploy still works but the contribution data ages instead of refreshing.
- **A home street address was being published** — `AboutMe`'s System Info card rendered
  `1-C-27 S.F.S Talwandi, Kota, RJ` on a public site; it now shows city-level
  `identity.location`. Revert that line if the full address was intended.
