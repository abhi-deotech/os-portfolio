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


---

## 2026-10-15 — all-axis audit, weighted for the real-world case: a visitor chats

Scope: bundle/critical path, runtime rendering, memory/background work, persistence, network,
and — as the primary real-world scenario — a visitor opening **AI Chat** (and the terminal's
`lumina-ai`) on a laptop or a phone. The 09-03 and 09-17 fixes all still hold and are not
re-reported. Every finding below was re-read at the cited line on this checkout; sizes marked
**M** were measured here (fresh `vite build` into a scratch dir, `ls`, `curl`), **E** are estimates.
Nothing was profiled in a browser; see "Verification status".

### Fresh build, eager set (M, brotli)

| chunk | br | raw |
|---|---:|---:|
| index | 71,316 | 269,045 |
| vendor-react | 50,750 | 189,646 |
| vendor-ui | 47,684 | 166,352 |
| vendor-utils + browser + registry + runtime | ~4,400 | ~12,200 |
| index.css + vendor-ui.css | 14,726 | 119,258 |
| **app total on first paint** | **~189 KB** | |
| `js.puter.com/v2` (not ours, parser-blocking, before all of the above) | **132–143 KB** | 521,418 |

Lazy chunks of note: QuantumWidget 192 KB br (three.js), aiWorker 121 KB br + a 23.5 MB wasm,
MarkdownRenderer 55 KB br, AIChat **8.4 KB br with the Gemini SDK** (2.2 KB when built without a
key — see C1).

---

### Part 1 — the chat path (ranked)

**C1. The Gemini key ships in the public bundle, and without one the chat is compiled out.**
`src/components/AIChat.jsx:78-90` reads `import.meta.env.VITE_GEMINI_API_KEY` and hands it to the
SDK in the browser. M: building with a key puts the literal key string in `assets/AIChat-*.js`.
Anyone can lift it, burn the quota, and every real visitor then sees 429s. M: building *without*
a key (this checkout has no `.env`), oxc proves the `throw` always runs and dead-code-eliminates
the whole request path — the chunk contains **zero `fetch` calls** and the chat can only ever
answer "VITE_GEMINI_API_KEY is missing". So the deployed app is either exposing the key or has
no working chat; there is no third state.
Fix: a serverless proxy (`netlify/functions/chat` or `api/chat` on Vercel) that holds the key,
rate-limits by IP, caps history, and streams. This single change also unlocks C2–C4.

**C2. No streaming.** `aiHandler.js:66-68` awaits the full `sendMessage` response. The SDK has
`sendMessageStream`. For a 150–300-token answer the visitor stares at three bouncing dots for
E 2–5 s instead of seeing the first token at E 0.5–1 s. Time-to-first-token is *the* chat metric.
Fix: stream and append chunks to the last assistant message; keep the dots only until the first
chunk.

**C3. The fallback chain is dead, and it makes failures slower, not rarer.**
`aiHandler.js:9-13`: `gemini-2.0-flash-exp`, `gemini-1.5-flash`, `gemini-1.5-flash-8b`. Google
retired the 1.5 Flash family and the `gemini-1.5-flash` alias in September 2025; `2.0-flash-exp`
was an experimental id. On a 429/503 from the primary the visitor waits 1 s + 2 s of backoff
(`:78-82`), then three more requests to models that 404, then the error. And a 429 caused by the
shared key's quota (C1) is hit identically by every "fallback" because they share the key.
`:76` detects retryability with `errorMsg.includes("503")` — the SDK throws
`GoogleGenerativeAIFetchError` with a numeric `status`. Also `@google/generative-ai` is
deprecated since 2025-11-30 (replacement: `@google/genai`).
Fix: one current primary + one current fallback (confirm ids on the Gemini models page at deploy
time), `error.status` checks, jittered backoff capped at ~6 s total, and a visible "retrying…"
state. Treat the SDK swap as part of the proxy move (C1) — the client then needs no SDK at all.

**C4. Context grows without bound and the system prompt is resent every turn.**
`AIChat.jsx:84-90` passes the full `messages` array each send; the system prompt is 4,114 chars
(M, ≈1,000 tokens). Turn *n* costs ≈ 1,000 + Σ(all previous turns) input tokens; a 20-turn chat
is E 40–60k input tokens, and latency rises with it. No cap on input length either (a pasted
50 KB message goes straight through).
Fix: send the last ~12 messages (or a rolling summary), cap input at ~2,000 chars, and let the
proxy own the system prompt so it never leaves the server.

**C5. The conversation dies when the window closes.** `AIChat.jsx:47` keeps messages in component
`useState`; closing (not minimising) the window unmounts it. Visitors close windows. There is also
no abort: `aiHandler`'s retry chain keeps running for up to ~15 s after unmount and sets state on
a dead component (bounded, but wasted).
Fix: a small unpersisted (or session-persisted, capped at ~50 messages) `chat` slice; an
`AbortController` in a ref, aborted on unmount and threaded into the request.

**C6. Rendering: every keystroke re-renders every message, and markdown shows raw.**
`AIChat.jsx:50,131-149`: `input` state lives beside `messages`, so each keystroke re-renders the
whole list — each row a `motion.div` keyed by index. Invisible at 10 messages; on a low-end phone
at 100+ it is typing lag. Gemini answers in markdown and `{msg.text}` renders the asterisks.
Fix: lift the composer into its own component, `React.memo` the row (key by a stable id), render
assistant text through the existing lazy `MarkdownRenderer` (55 KB br, loads once, only when the
first assistant reply arrives).

**C7. Mobile (suspected — not device-tested).** The input is `text-xs` (`AIChat.jsx:174`;
LuminaChat is `text-sm`): iOS Safari zooms the page on focus for any input under 16 px. Windows
are sized with `calc(100vh - 80px)` (`Window.jsx:119`) and nothing in `src/` uses `dvh` or
`visualViewport`, so with the keyboard up the composer is likely under it. No `enterkeyhint="send"`.
Fix: 16 px input font on mobile, `100dvh` (with a `visualViewport` resize fallback), `enterkeyhint`.

**C8. `lumina-ai` downloads ~47 MB to answer with keyword matching.**
`useTerminal.js:444-451` boots the worker; `aiSlice.js:14-29` spawns it; `aiWorker.js` builds a
MiniLM feature-extraction pipeline. M: the quantized model is 22,972,370 B from huggingface.co,
plus `ort-wasm-simd-threaded.asyncify-*.wasm` 23,567,050 B from our own origin — **with no
`.br`/`.gz` sibling**, because `vite-plugin-compression`'s default filter is `js|mjs|json|css|html`
(`vite.config.js:34-43`), and the asyncify variant was chosen although `numThreads` is forced to 1
(`aiWorker.js:40-43`); the plain `ort-wasm-simd-threaded.wasm` is 12.9 MB. Then `:456-470` answers
with `q.includes('stack')`. **`getEmbedding` has zero callers.** The worker is never terminated, so
the runtime and weights stay resident for the session. The progress text says "~20MB".
Fix: either delete the worker path and the `@huggingface/transformers` dependency (removes
517 KB JS + 23.5 MB wasm from `dist/`), or make it real: nearest-neighbour over a small canned
FAQ, `dtype: 'q8'` on WebGPU too, `wasmPaths` pointed at the jsdelivr CDN (already in
`script-src`), a size warning before the first download, and `terminate()` on terminal unmount.

**C9. Guestbook (LuminaChat).** `LuminaChat.jsx:40-43` adds a 1.5 s fake "connecting" delay on
every open; `:75-79` appends to `localStorage` with no cap and re-parses the whole array on every
cross-tab event. Fix: drop the delay (or 300 ms), `slice(-200)` on write.

---

### Part 2 — critical path and loading

**L1. Puter SDK: a 521 KB parser-blocking third-party script in `<head>`.** `index.html:42`
`<script src="https://js.puter.com/v2/">` with no `defer`/`async`, before `#root` and before our
module script. M: 521,418 B raw, 143,424 B gzip, served `cache-control: max-age=0` → revalidated
on every repeat visit. It is ~43% of first-visit wire bytes and nearly as large as our entire
eager set. Its only consumer is optional cloud sign-in; `puterSlice.js:10-15` already null-guards.
Fix: `defer` today; inject on first "Sign in with Puter" click (and when a persisted
`isPuterSignedIn` is true) tomorrow, with `checkPuterAuth` awaiting the load.

**L2. Google Fonts are requested and then blocked by our own CSP.** `src/index.css:6` `@import`s
Inter + Manrope (lands at the head of the built CSS, M) and `index.html:6-7` preconnects to both
origins, but `style-src 'self' 'unsafe-inline'` / `font-src 'self' data:` block them in dev and
prod. Net: two wasted connections, a render-blocking CSS→googleapis chain that fails, and every
SDL micro-weight the file's comment describes renders in the system fallback.
Fix: self-host Inter variable latin woff2 (~48 KB) under `public/fonts/`, one `@font-face` with
`font-display: swap`, `<link rel=preload as=font>`; delete the `@import` and preconnects.

**L3. No `Cache-Control` for hashed assets.** `netlify.toml`/`vercel.json`/`render.yaml` set only
CSP/CORP/nosniff/referrer. Netlify defaults to `max-age=0, must-revalidate`, so every repeat visit
is 8–10 conditional requests (E). Fix: `/assets/*` → `public, max-age=31536000, immutable` in all
three; keep `/index.html` at `max-age=0`.

**L4. Boot animation runs on every load, serialised after the JS download.** `App.jsx:105` keeps
`bootComplete` in unpersisted state while `isAuthenticated` *is* persisted; `BootSequence.jsx:39-46`
is 24 lines × 10–30 ms + 300 ms ≈ 0.55–1.0 s that starts only after ~189 KB has executed.
Fix: skip or cap at ~300 ms when `sessionStorage` says we booted already.

**L5. QuantumWidget (192 KB br + WebGL) downloads the instant the desktop mounts.**
`Widgets.jsx:18` lazy-imports it unconditionally; `QuantumWidget.jsx:74` returns null in
low-performance mode *after* the chunk has loaded. Fix: check `lowPerformance` before the
`import()`, and defer it behind `requestIdleCallback`/~2 s post-login.

**L6. Broken and dead assets.** `src/data/fileSystem.js:61,77-79` point four Pictures/Downloads
entries at `/src/assets/hero.png`, a dev-server path that does not exist in `dist/` (M) → broken
images in PhotoViewer in production. `public/assets/games/doom.png` is 1,218,972 B (M), 64% of
`public/`, referenced by nothing (DOOM disabled). Fix: import `hero.png` through Vite; delete
`doom.png` until DOOM returns.

**L7. Eager data.** Four `?raw` markdown docs (35 KB), `musicData.js`, `githubSnapshot.json` and
the FS seed sit in the entry chunk (E 15–20 KB br of the 71 KB). Low priority; the markdown is the
odd one (already flagged 09-17 as 33 KB of persisted payload).

---

### Part 3 — runtime rendering (what the 09-17 pass left)

**R1. Desktop icon drag fights a CSS transition.** `Desktop.jsx:106` — the dragged `motion.div`
carries `transition-all`. Framer writes `transform` per pointer frame; CSS turns each write into a
150 ms interpolation (smear + per-frame style/paint). Fix: remove `transition-all` from that
element.

**R2. Appearance dials fan out per pointer event.** `Appearance.jsx:270-272` →
`systemSlice.js:145-152` (`set` + `syncPrefsToPuter()` when signed in → one `puter.keyval.set`
network call per slider tick) → `App.jsx:173-175` → `applyTheme.js:68-89`: ~45 `setProperty`
calls, 7 `setAttribute`s with unchanged values, and a synchronous `localStorage.setItem` of a
~3 KB JSON every call. Fix: diff vars/attributes before writing; debounce the mirror write and the
Puter sync (trailing, ~250 ms / ~1 s).

**R3. Every open window re-renders on any window-state change.** `Window.jsx:49-53` subscribes to
`activeWindow`, `maximizedWindows`, `snappedWindows`; `windowSlice.js:223` `focusWindow` runs a
full `set` on every `mousedown` in any frame even when already active; `toggleMaximizeWindow` /
`closeWindow` / `snapWindow` re-allocate the snapped map unconditionally; `WindowSlot` is not
memoised, so App's own re-renders cascade into every frame. Fix: boolean selectors
(`s.activeWindow === id`, `.includes(id)`), `React.memo(WindowSlot)`, early-return in
`focusWindow`, keep map identity when the id is absent.

**R4. Window frame paint cost.** `Window.jsx:376` `backdrop-blur-2xl` (40 px) floating /
`3xl` (64 px) maximised — the only shell surfaces still above the 24 px `--sdl-glass-blur`
standard, re-sampled every drag frame; `:510` a per-window `blur-3xl` glow layer 1.4× the window;
`:375` `grayscale-[0.1]` puts a `filter` on every inactive frame, so a terminal cursor blink in a
background window repaints through a filter pass. Maximise/snap springs still animate
`top/left/width/height` (known from 09-17). Fix: 24 px blur both states, radial-gradient instead
of the blurred glow (the trick App.jsx already uses), drop the grayscale.

**R5. ControlCenter subscribes to the whole `music` object** (`ControlCenter.jsx:211`) — see M1:
it re-renders every 30 s for the Last.fm tick. Fix: three narrow selectors.

**R6. `::-webkit-scrollbar-thumb { backdrop-filter: blur(4px) }`** (`index.css:164-167`) on every
scrollable container. Remove the filter.

**R7. Residual `transition-all`** on the dock root (`Taskbar.jsx:98`, has backdrop blur), every
dock button (`:106,118,129,175`), the window title bar (`Window.jsx:380`). Replace with
`transition-colors` / `transition-[transform,opacity]`.

**R8. fileSystem tree writers re-allocate every node** (`fileSystemSlice.js:108-110` and the
sibling mappers) so FileExplorer/Spotlight/Notepad/Docs/Terminal lose all node identity on any
write. User-paced, low frequency. Fix: structural sharing (return `n` when children unchanged).

Timer inventory on an idle desktop: minute clocks (clean), 30 s Last.fm (M1), 2 s heap/storage
fact poll (identity-stable, no re-render), QuantumWidget rAF (visibility-gated). Clean otherwise.

---

### Part 4 — memory, background work, persistence

**M1. The Last.fm poll writes the whole persisted store every 30 s, forever, with no key.**
`NowPlayingWidget.jsx:12-24` polls; `musicApi.js:6-9` returns `null` without a key, `:48-55`
then returns a *fresh mock object*; `musicSlice.js:236` spreads a new `music` → every `s.music`
subscriber re-renders and persist runs `partialize` + a throttled IDB write. E 120 writes × 30–45
KB/hour idle, plus 120 console warnings. Fix: return early from the effect when the key is unset;
gate on document visibility; skip `set` when unchanged.

**M2. Mounting a real folder persists its entire recursive listing, handles included.**
`fileSystemSlice.js:236-273` writes `{ id: mounted-<random>, handle }` nodes into `fileSystem`,
which is in `partialize`. Every later `set()` structured-clones the whole mounted tree into IDB;
a second mount of the same folder adds a second copy. Unbounded in folder size, survives reloads.
Fix: `partialize` filters `isMounted` nodes; keep handles only in the unpersisted
`mountedHandles` map (it already exists, `:19`).

**M3. Terminal history is capped by count, not bytes.** `systemSlice.js:189-196` keeps 500
entries; `cat ARCHITECTURE.md` stores 15.6 KB verbatim. Ten of those = +156 KB cloned on every
persist write for the rest of this and every later session. Fix: truncate outputs over ~4 KB and
enforce a total byte budget.

**M4. Sandboxed game iframes run at full rate while minimised.** `SandboxedGame.jsx:234` renders
the iframe unconditionally and nothing there reads `useWindowVisibility`; the shipped example game
runs a 16 ms `setInterval`. Fix: unmount while hidden with a "paused" overlay, or document it.

**M5. Smaller, confirmed.** `FullscreenPlayer.jsx:44` passes `isPlaying` without `visible`, so
the fullscreen Visualizer's rAF loop runs while Music is minimised. `useYouTubePlayer.js:118-122`
wraps `onYouTubeIframeAPIReady` once per Music mount and, since the CSP blocks the API script,
the chain is never consumed (+1 closure per open, permanent). Flow-Net keeps up to 8 cross-origin
iframes mounted (`hidden`, by design). `Screensaver.jsx` re-subscribes three window listeners on
every App render because `onDismiss` is an inline arrow (`App.jsx:294`). No module-scope
`useOSStore.subscribe`; popouts, wake lock, media session, idle detection, benchmark workers,
game loops and object URLs all clean up correctly.

---

### Prioritised plan (effort: S < 1 h, M half a day, L a day+)

| # | change | axis | effort | why first |
|---|---|---|---|---|
| 1 | Proxy the chat through a serverless function: key server-side, streaming, history cap, rate limit; drop the client SDK | C1–C4 | L | the only way the chat is both working and not leaking the key |
| 2 | `defer` the Puter script now; lazy-inject on sign-in next | L1 | S / M | 143 KB + a blocking third-party off every first paint |
| 3 | Self-host Inter, delete the font `@import` + preconnects | L2 | S | the intended typography has never rendered in prod |
| 4 | `immutable` cache headers for `/assets/*` in all three host configs | L3 | S | repeat visits stop revalidating |
| 5 | Delete or finish the `lumina-ai` embedding path; compress/CDN the wasm either way | C8 | S (delete) / M | 47 MB for a keyword match |
| 6 | Chat slice + abort + memoised rows + markdown + 16 px mobile input + `dvh` | C5–C7 | M | the visible chat UX |
| 7 | Last.fm effect: bail without a key, visibility-gate, no-op set | M1, R5 | S | 120 pointless store writes an hour |
| 8 | `Window.jsx` boolean selectors, `memo(WindowSlot)`, `focusWindow` early return | R3 | S | every click re-renders every frame today |
| 9 | Window frame: 24 px blur, gradient glow, no grayscale; icon `transition-all` | R1, R4 | S | drag smoothness |
| 10 | `applyTheme` diff + debounced mirror/Puter sync | R2 | S | slider jank, and a network call per tick when signed in |
| 11 | `partialize` drops mounted nodes; byte-cap terminal history | M2, M3 | S | unbounded persisted payload |
| 12 | Fix `hero.png` path, delete `doom.png`, skip boot on repeat, idle-defer QuantumWidget | L4–L6 | S | broken images in prod; faster return visits |

### Not findings
`modulepreload` list equals the eager set exactly; wallpapers are CSS gradients by default and
images load only on selection; the 23.5 MB wasm is referenced only by the lazy worker chunk;
`WindowContentRenderer` memo and the lazy boundaries are correct; `useSystemFact` keeps snapshot
identity so the 2 s heap poll does not re-render the dashboard; all CSS `animate-pulse` dots sit
inside their own blur surfaces; `facts.js` observers are ref-counted and visibility-gated.

### Verification status
Measured: fresh build chunk sizes (with and without a Gemini key), the key literal in the chat
chunk and the DCE'd request path without one, Puter script size/headers, HF model sizes, wasm
sizes and the missing `.br` siblings, system prompt length, every cited line. Read, not run:
re-render cascades, paint costs, the mobile keyboard behaviour, the host cache defaults, and the
Gemini model-id status (from Google's retirement notice as quoted on its developer forum — confirm
on the models page before changing ids). No browser profiling was done in this pass.
