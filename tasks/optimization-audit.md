# Optimization audit

## 2026-09-03 — first-paint bundle size

Every number here was measured on this checkout, not estimated. Method is noted per finding so
each one can be re-run.

**Status: all six findings are implemented.** See "Verification status" for what that claim does
and does not cover.

---

## Summary

| # | Finding | Impact | Status |
|---|---------|--------|--------|
| 1 | `import * as Lucide` puts the whole icon set on first paint | 1,498 KB → 91 KB source | fixed |
| 2 | `manualChunks` matches substrings, dragging lazy deps eager | ~1.4 MB source off first paint | fixed |
| 3 | `QuantumWidget` statically imports three.js | 2,680 KB source off first paint | fixed |
| 4 | Fake metrics rewrite the whole persisted store every 3s | ~30 MB/hr of IndexedDB writes | fixed |
| 5 | Seventeen components subscribe to the entire store | whole desktop re-renders on any change | fixed |
| 6 | `@webcontainer/api` eager via `containerSlice` | 46 KB source | fixed |

**Measured result: first-paint JS went from ~662 KB to 146 KB brotli — a 78% reduction.**

```
BEFORE                                   AFTER
index          47 KB br                  index           49 KB br
vendor        389 KB br                  vendor-react    50 KB br
vendor-react  215 KB br                  vendor-ui       47 KB br
vendor-ui      10 KB br                  vendor-utils   1.8 KB br
vendor-utils    1 KB br
------------------------                 ------------------------
TOTAL         662 KB br                  TOTAL          146 KB br
```

---

## 1. The Lucide barrel import — `src/config/games.js:1`

```js
import * as Lucide from 'lucide-react';   // line 1
...
icon: Lucide[g.icon] ?? Gamepad2,          // line 169
```

A namespace import cannot be tree-shaken: the bundler must assume any export may be read. The
whole of `lucide-react` therefore lands in the bundle — **1,498 KB of source** — and because
`App.jsx:31` imports `GAME_BY_ID` from this file, it lands in the *eagerly preloaded* chunk.

The barrel exists to resolve icon names that come from data. There are three of them:

```
folderGames.json → ["Circle", "Grid3x3", "Layers"]
```

Replacing the namespace with an explicit `const Lucide = { Circle, Grid3x3, Layers }` took the
eager lucide payload from **1,498 KB → 91 KB of source**. Behaviour is identical as long as the map
covers every `icon` value in `folderGames.json`; a missing name already falls back to `Gamepad2`.

*Method: `vite build` with `sourcemap: true`, then attributing `sourcesContent` bytes per package.*

## 2. `manualChunks` matches substrings — `vite.config.js:47-52`

```js
if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
```

This is the first test, and `id` is a full path. So `react-syntax-highlighter`,
`react-arborist`, `react-window`, `react-dnd`, `react-markdown` and `@react-three/fiber` all match
`'react'` and are assigned to `vendor-react`. React itself is in that chunk, so the entry depends on
it, so **the whole chunk is eager** — and every one of those packages is otherwise reachable only
behind a `React.lazy` boundary that `WindowContentRenderer.jsx` already sets up correctly.

The `vendor` catch-all has the same problem from the other side: it merged `motion-dom` (eager, via
framer-motion in `App.jsx`) with `three` (2,028 KB) and `refractor` (959 KB, the syntax-highlighter
language pack). One eager member makes the entire 1,587 KB chunk eager.

Measured eager composition before:

```
vendor-IdaGsU8t.js      1587 KB emitted   three 2028 KB · refractor 959 KB · motion-dom 334 KB
vendor-react-DEImymlm.js 1045 KB emitted   lucide 1498 KB · @react-three/fiber 640 KB · react-dom 533 KB
```

Matching on the **package name** instead of a substring, and letting everything not explicitly
named fall through to Rollup's own lazy splitting, removes `refractor`, the arborist/window/dnd
stack and the markdown stack from first paint entirely.

## 3. `QuantumWidget` pulls three.js onto the critical path

`App.jsx:19` imports `Widgets` statically; `Widgets.jsx:7` imports `QuantumWidget` statically;
`QuantumWidget.jsx:2-3` imports `@react-three/fiber` and `@react-three/drei`. So **three (2,028 KB)
+ fiber (640 KB) + drei (12 KB)** are on first paint for a decorative desktop widget.

This is not a chunking artifact — after fixing #2 the entry chunk simply absorbed three.js instead.
Only a lazy boundary moves it. Wrapping it as `React.lazy` behind a `<Suspense fallback={null}>`
took the eager set from 337 KB to **150 KB brotli**.

Worth noting: the Performance-mode switch in Appearance says it "Drops the 3D wallpaper and the
heavier ambient effects", but the *import* is unconditional — so a user on performance mode still
downloads and parses all 2.7 MB.

## 4. Decorative metrics rewrite the entire persisted store every 3 seconds

`SystemMetricsWidget.jsx:146-158` calls `updateMetrics` on a 3s interval with four random numbers.
`systemMetrics` is listed in `partialize` (`osStore.js:149`), and zustand's `persist` middleware
serialises and writes the **whole** partialized payload on every `set`.

Measured payload at factory defaults:

```
Default persisted payload: 26,066 bytes
  24,319 B  fileSystem
     502 B  music
     297 B  terminalHistory
      62 B  systemMetrics   ← the only field that changed
```

That is **26 KB serialised and written to IndexedDB every 3 seconds — ~30 MB/hour** — to persist
62 bytes of numbers that are regenerated randomly on the next tick anyway. It grows with the user's
filesystem and their 500-entry terminal history.

Two independent fixes, either sufficient: drop `systemMetrics` from `partialize` (it is decorative
and re-seeded on load), or debounce the persist write. Dropping it from `partialize` is the smaller
change and the more obviously correct one.

*Method: reconstructed the exact `partialize` key list against the real slice defaults in Node.*

## 5. Whole-store subscriptions

Ten call sites use `useOSStore()` with no selector, so they re-render on **any** state change
anywhere in the store:

```
LoginScreen · Spotlight · SystemDashboard · SocialWidget · Notepad
useTerminal · NowPlayingWidget · Benchmark · LuminaChat · AchievementToast
```

Four of those — `Spotlight`, `AchievementToast`, `SystemDashboard`, `SocialWidget` — are mounted for
the entire session. Combined with #4, every one of them re-renders every 3 seconds for a value none
of them read. `Spotlight` is the worst case: it destructures `fileSystem`, so it also re-renders on
every file operation.

Most of the file already uses the correct pattern (`App.jsx` and `Appearance.jsx` select field by
field); these ten are the stragglers.

## 6. `@webcontainer/api` is eager

`containerSlice.js:1` imports `WebContainer` at module scope, and `osStore.js` imports the slice, so
46 KB of source loads for every visitor whether or not they open the terminal's container features.
A dynamic `import()` inside the boot function defers it.

---

## Verification status

Verified:

- **The bundle numbers.** `npm run build` from a clean `dist/`, summing the brotli sizes of the
  chunks `index.html` actually modulepreloads. 662 KB → 146 KB.
- **Lint and build are clean** (`npx eslint src/` reports only a pre-existing `exhaustive-deps`
  warning in MusicApp.jsx, untouched by this work).
- **The app boots and renders.** Logged in against the real store and screenshotted the desktop:
  icons, dock, widgets and panels all render, and the Quantum widget *does* appear — so the
  `React.lazy` boundary from #3 resolves rather than silently failing to a null fallback.
- **`games.js` still resolves its icons.** Imported through the dev server: 12 games, all 12 with a
  real icon component, so the explicit map from #1 covers every entry in `folderGames.json`.
- **`containerSlice` still composes** with its dynamic import, and the store still exposes
  `systemMetrics` from the slice defaults after being dropped from `partialize`.

NOT verified:

- **The 3-second IndexedDB write no longer happens.** #4 follows from zustand's documented persist
  behaviour and the measured 26,066-byte payload, but I did not observe write traffic before and
  after. The Browser pane does not composite frames, so I could not drive the UI far enough to
  watch it over time.
- **The re-render reduction from #5.** The selector conversions are mechanical and type-identical,
  and lint is clean, but I did not profile render counts. The claim is "these components no longer
  subscribe to unrelated state", which is true by construction; "the desktop is measurably faster"
  is not something I measured.
- **Interaction beyond first render.** No click-through of the games launcher, terminal container
  boot, or markdown viewer. Those paths are the ones most affected by #2's chunk changes, so they
  are worth a manual pass.

## Found while verifying, also fixed

**Duplicate React keys on the toast queue.** The browser console logged
`Encountered two children with the same key, toast-3-Surprise Me` repeatedly. `pushToast` keyed
entries `toast-${queue.length}-${title}`, and the queue is capped at 3 by `.slice(-MAX_TOASTS)` —
so once full, the length is pinned at 3 and every subsequent toast reused the same key. React is
explicitly allowed to drop or duplicate children in that case. Replaced with a monotonic counter;
verified 12 rapid pushes now produce 12 unique ids.

## Not findings

Things that looked wrong and are not:

- `AddGameDialog.jsx:24` — the `setInterval` is inside the `EXAMPLE` template string shown to users.
- The `React.lazy` boundaries in `WindowContentRenderer.jsx` are correct and comprehensive. The
  bundle problem is entirely downstream of them, in `manualChunks`.
- Desktop icon labels over an arbitrary wallpaper: the three-layer `plane`-coloured halo in
  `Desktop.jsx:22-26` genuinely rescues them. An early version of the Surprise Me analysis assumed
  raw ink-on-wallpaper contrast and overstated the problem by a wide margin.


---

## 2026-09-17 — steady-state runtime cost

The 09-03 fix held (eager set still ~163 KB br), so the "starting to slow down" report was runtime,
not download. Three parallel audits (shell / store / per-app), every finding re-verified by hand.
Plan: `~/.claude/plans/splendid-stirring-flute.md`; checklist and measured results: `tasks/todo.md`.

### The two mechanisms

1. **zustand `persist` writes the whole partialized payload on every `set()`** with no diffing
   (`zustand/middleware.js`, `setItem` inside `persistImpl`). Measured: ten `setMusicCurrentTime`
   calls → ten IndexedDB puts of 44,664 B. The player called it once a second whenever the Music
   window had ever been opened — paused or minimised — so playback was ~150 MB/hour of
   structured-clone + IDB, and every `s.music` subscriber (ControlCenter is always mounted)
   re-rendered at 1 Hz. Fix: `src/store/persistStorage.js` (trailing throttle, flush on pagehide)
   + playback position moved to a top-level unpersisted `musicCurrentTime`.
2. **Always-mounted timers with a wide blast radius**: a 2 s metrics tick re-rendered the ~650-node
   GitHub heatmap SVG for the session; a second copy ran in the closed Control Center; two 1 s
   clocks re-rendered the whole dock and the clock widget to show HH:MM. Fix: `React.memo`
   boundary, the hook's existing `disabled` flag, and one `useMinuteClock`.

### Everything else, one line each
- One `AudioContext` per `useSoundEffects` caller → 8 on the bare desktop, +2 per window (Chrome
  caps at 6). Now one, module-scope, created on first sound.
- `Window` ran a `ResizeObserver → setState` loop whose only consumer read none of the values;
  `WindowGlass` was a backdrop-blur under a backdrop-blur. Both removed; three dead props too.
- Dock magnification was `hoveredIndex` state → whole-dock re-render per mouseenter. Now CSS.
- Two permanent `filter: blur(100px)` glow layers → one radial-gradient layer; root
  `transition-all` → `transition-colors`; 19 desktop tiles no longer each carry a backdrop blur;
  Taskbar / SystemDashboard 64 px blur → 24 px (the radius the rest of the shell already uses).
- Minimised windows kept every loop running. `useWindowVisibility(id)` now gates the four
  `useGameLoop` callers, the Visualizer and the seek poll. Visualizer also exits its rAF loop once
  settled (it never reached zero before) and allocates one gradient instead of 2,880/s.
- `MarkdownRenderer` rebuilt its `components` map per render (remount + re-tokenise per keystroke
  in the Docs search) and shipped every Prism grammar. Static map, `React.memo`, `PrismLight` with
  eight languages: 216 → 55 KB br.
- Uploaded wallpaper was a base64 string inside the persisted payload (cloned on every write,
  shipped to Puter on every pref change). Now a Blob under its own idb key + a `'custom'`
  sentinel; legacy data-URL payloads migrate on first load.
- `openWindow` called `trackRecentFile` inside its own updater (two writes, doubled under
  StrictMode); `focusWindow` re-allocated `minimizedWindows` on every click; `|| []` fallbacks
  removed from four selectors; AI worker listener leaked on error replies; terminal's
  progressive-output interval outlived the window; Spotlight fired an achievement per keystroke;
  Benchmark spawned 16 workers on mount; `useMediaQuery` re-subscribed on every match change;
  `applyTheme` recomputed the whole palette per slider move; idle watcher re-armed a timer per
  mousemove; `SystemMetricsWidget.jsx` (409 lines, never rendered) and `App.css` deleted.

### Found and NOT fixed (out of scope)
- Dev/prod CSP blocks `https://www.youtube.com/iframe_api` and Google Fonts — the music player
  cannot load at all. Pre-existing; policy decision for the owner.
- Maximize/snap animate `top/left/width/height` via spring (layout per frame).
- Persisted `fileSystem` is 33 KB of `?raw` docs that never change; a diff would be smaller.
- Puter `syncFilesToPuter` pretty-prints and uploads the whole tree per file op.
