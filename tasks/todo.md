# Browser API interaction pass — 2026-09-17

Owner request: *"go ahead with all the changes we discussed for Browser API Interaction"*, under the
policy in `tasks/integrations-catalog.md` §1 (cross-browser first; Chromium-only features ship only with a
complete fallback or an in-place notice). Scope confirmed: core slice (no PWA, no passkeys). Owner
decisions: pop-out for curated apps only; remove Wi-Fi/Bluetooth switches, MediaPlayer dead buttons and
Task Manager's invented rows; make Focus real; keep the Settings → System layout. Full plan with every
verified line reference: `~/.claude/plans/zazzy-meandering-oasis.md`.

Gates for every phase (after its LAST edit): `npx eslint src` → 0 problems (the 63 baseline errors are all
third-party code in `public/games/`); `npx vite build` (NOT `npm run build`, which rewrites the GitHub
snapshot and game manifests); `npm run token-lint`; the phase's harness.

## 0. Baseline
- [x] Tree snapshot (scratchpad) for per-phase diffs
- [x] `npx eslint src` clean; 63 errors only under `public/games/`
- [x] Entry chunk `index-*.js`: 239.69 kB raw, 62,596 B brotli

## Phase 1 — Capability mechanism
- [x] `src/capabilities/`: registry (19 entries, applyMask, presets), browser, support, notice, notify, permissions, useCapability, CapabilityGate, devMask (first import in main.jsx)
- [x] `components/common/StatusChip.jsx` (+ SegmentBar); grammar.css chip vars (Law 5 every tone); Specimens.jsx uses it; stale MotionGate comment
- [x] `settings/primitives.jsx` moved verbatim from Appearance
- [x] SystemDialog `links` (+ `a[href]` in FOCUSABLE); dialog.js doc block
- [x] Settings → Compatibility pane; FileExplorer retrofit
- [x] `scripts/capabilities-check.mjs` → `npm run cap:check`
- [x] Gates + adversarial review
- [x] Browser probes: pane in real detection and `?caps=firefox` (masked APIs absent, Mozilla Why links), chip Law 5 in dark (soft gradient fill) and light (plane + 50% hairline), Files → Mount dialog text = pane text, links `_blank noreferrer`, Tab order Why → Support table → Got it
- [x] Own fixes after review: plural labels renamed; denied wording no longer blames the browser; "Set up" hidden on unsupported rows

## Phase 2 — Truthful system facts, Focus made real
- [x] `src/system/facts.js` + `gpu.js`; `hooks/useSystemFacts.js`; delete `useSystemMetrics.js`; `useNetworkInfo` → `readNetwork`
- [x] `FactValue`/`FactRow`, `SessionUptime`
- [x] Store: drop `systemMetrics`; `TERMINAL_SEED` + v5 migration; `windowOpenedAt`; `WINDOW_SESSION_RESET`; `focusMode` + `pushToast({ urgent })`
- [x] SystemDashboard, Settings → `SystemTab` (same layout, real values, real sparkline), TaskManager, ControlCenter (Connection tile, battery, body gating), Focus holds toasts
- [x] Terminal: promise arm, `Object.hasOwn`, neofetch/battery/df/free/uname/lscpu/uptime/ps; Benchmark cleanup
- [x] README/ARCHITECTURE refs; `scripts/facts-check.mjs` → `npm run facts:check`
- [x] Gates + adversarial review
- [x] Added scope (same goal): FileExplorer's hard-coded "64% / 128 GB of 256 GB used" gauge → real site storage
- [x] Browser probes (live `?t=` store): System tab real values (24 cores, 32 GB class, Linux · x86 · 64-bit, nvidia · ampere, 1920×1080); v5 migration removed the persisted invented neofetch seed; Control Center battery 100% (real), "Online · 4G", Connection tile estimate, no Nexus; Focus holds a pushed toast ("Holding 1") and releases it; Terminal neofetch/df/free/battery/uname/ps truthful, `__proto__` → not found, no Promise leaked into history; Task Manager has no PID/%/Healthy/Kernel
- [x] Entry chunk +8.3 KB br (70,883): capability prose + notice builder + neofetch text reached first paint through facts.js → refactor: lean `registry.js` + `positions.js`, `useCapability` without notice fields, `notify.js`/`FactValue` load `notice.js` lazily, `system/neofetch.js`. Entry now 67,588 B br (+4,992 vs baseline); 0 prose strings in the entry; re-probed `?caps=firefox` pane + System tab lazy Why links

## Phase 3 — Browser integrations
- [x] 3a Media Session owner stack + Wake Lock; Music/Media/Benchmark wiring; `getCurrentTime` — probed: metadata/playbackState follow Music; a Media video on top shows its own title; closing it restores Music
- [x] 3b Idle Detection → screensaver; `idleDetection` persisted; ScreenCard — probed: switch in Chromium; `?caps=firefox` shows the inline notice (Mozilla #453) instead. Own fixes: `refreshPermission` awaited after the request (no stale-state flash); 'prompt' reads "Permission needed", not "revoked"
- [x] 3c Immersive mode (Fullscreen + Keyboard Lock); Control Center tile — probed: a refused fullscreen leaves the tile Off and (own fix, was a silent console.warn) opens the "Fullscreen is blocked for this site" notice
- [x] 3d Pop-out (curated apps): WindowSlot/HostMount/PopoutHost, popout utils, policy config, Window button + monitor menu, Taskbar focus, Docs TOC fix — probed with `?popout=frame`: Notepad pops out (base href first, title "Notepad — Lumina", colorway matches and follows a live change, frame alive after StrictMode mount), text typed before AND inside the popup survives pop-in (no remount), content mousedown focuses the window, Music/other docked apps show aria-disabled buttons with reasons. Own fix (a refuted finding I disagreed with): any dialog raised while a popped-out window has focus docks that window first (`utils/dialog.js` + `focusedPopoutId`), probed with a stubbed `hasFocus`
- [x] **Budget note:** entry chunk 71,666 B br = +9,070 over the 62,596 baseline (plan threshold 8 KB). Breakdown: facts module for the eager desktop widget/Control Center (~+5.0 KB after the refactor), 3a–3c hooks + tiles (~+1.7 KB), pop-out button/menu + popout registry in the eager Window (~+2.3 KB). PopoutHost/popoutDom (1.5 KB), notice text, positions and neofetch are lazy chunks.
- [x] 3e Notepad first-open check/fix (bug CONFIRMED in browser: closed Notepad + openNotepad('file-readme') → empty editor, no file name; switching files works), Download + Share; MediaPlayer fullscreen/share, dead buttons removed — probed: first open loads README.md with its name; Download → `text/markdown` blob named README.md; Share hidden where `navigator.share` is absent (complete fallback); MediaPlayer shows only Library / Copy link / Fullscreen; Copy link failure (unfocused pane, NotAllowedError) → warning dialog, success (stubbed clipboard) → button reads "Link copied" + polite live region, resets after 2 s. Review fix: fullscreen targets the player root so controls stay visible (plan said the video container, which hid every control). Own fix (refuted finding I disagreed with): Copy link confirms inline instead of a toast that is invisible in a popup or under Focus
- [x] `scripts/interaction-check.mjs` → `npm run interaction:check` (140 assertions)
- [x] Gates + adversarial review (per sub-phase: 3a–3c, 3d, 3e)

## Phase 4 — Verify, document
- [x] All gates after the last edit: `npx eslint src` 0 problems; token-lint no regressions; cap:check 879, facts:check 148, interaction:check 140 all PASS; `npx vite build` OK; entry 71,228 B br (+8,632 vs 62,596 baseline — note above); 0 `Math.random` on system surfaces; 0 invented strings in shipped code
- [x] Preview probes (Compatibility with `?caps=firefox`, System tab, Control Center, Focus, Task Manager, Terminal, pop-out `?popout=frame`, Notepad, MediaPlayer, Media Session) — recorded per phase above
- [x] Real Chrome (fresh server :5176, visible document): JS heap polled 6× in 7 s, battery "100% · plugged in", GPU honestly reports SwiftShader under `--disable-gpu`, OS Linux / x86 · 64-bit. **Pressure NOT validated:** headless Chrome delivers no PressureObserver records even to the raw API with focus emulation → owner manual check
- [x] Catalog §5 wording fixes (Mozilla *negative*, WebKit *concerns* / *not implementing*); `sdl-notes.md` entry; `tasks/lessons.md` (4 lessons); review section below; owner manual checklist
- [x] Final cross-phase review (read-only, 3 lenses + skeptics): 10 confirmed → 9 fixes applied (nested fullscreen kept the keyboard lock; popped-out windows keep their native context menu; Focus resets on sign-out; refused fullscreen gets its own "didn’t start" wording; Chromium webkitEnterFullscreen no-op; toast names the feature; "Set up" moves focus; switch status is announced; popups get `lang`). Refuted-but-accepted on policy grounds: "Alt+Tab" → platform-neutral "app switching". Re-probed: docked right-click still opens the desktop menu, popup right-click is native, popup `lang="en"`, Set up focuses `screen-idle-switch`, Focus off after logout

## Review — Browser API pass, 2026-09-17

**Shipped.** Capability registry + notices + Settings → Compatibility; truthful system facts on every
surface that showed hardware numbers (System tab, dashboard widget, Task Manager, Control Center,
Files storage gauge, Terminal, Benchmark); Focus holds toasts; Media Session + Wake Lock; Idle
Detection → screensaver; Immersive mode; pop-out windows for the 11 curated apps with multi-monitor
placement; Notepad Download/Share; MediaPlayer fullscreen + Share/Copy link. Notepad's pre-existing
first-open bug fixed. Three Node harnesses added (`cap:check` 962, `facts:check` 148,
`interaction:check` 144 assertions).

| gate (after the last edit) | result |
|---|---|
| `npx eslint src` | 0 problems |
| `npm run token-lint` | no regressions (−6 vs allowance) |
| `npm run cap:check` / `facts:check` / `interaction:check` | PASS / PASS / PASS |
| `npx vite build` | OK |
| entry chunk (brotli) | 71,316 B, **+8,720 vs 62,596 baseline** (see budget note in Phase 3) |

**Validated in the browser (preview pane, DOM/text):** everything recorded per phase above, incl.
`?caps=firefox` simulation, Law 5 chips in dark and light, pop-out move without remount, focus/theme
sync, dialogs docking a focused popout, store migration of the persisted invented neofetch seed.
**In a visible headless Chrome:** heap polling, battery, GPU, OS/arch.

**NOT validated (needs a real browser + hardware) — owner manual checklist:**
- [ ] CPU pressure chip reaches a state in headed Chrome with the window focused (headless delivers no samples, even to the raw API)
- [ ] Media keys + OS now-playing card for Music and Media (Chrome, Firefox, Safari); whether YouTube's frame steals next/previous
- [ ] Screen stays awake during playback (wake lock)
- [ ] Settings → System → Screen: enable, grant, lock the OS screen → screensaver shows on unlock
- [ ] Immersive (Chrome): tap Esc does nothing, hold Esc exits; video fullscreen inside Immersive keeps the lock; Firefox/Safari toast names the browser
- [ ] Pop-out Media while playing: Document PiP keeps playing; a plain popup resumes at the same position; closing the tab closes popups; Firefox `window.open('')` popup does not dock itself straight back
- [ ] Two monitors: "Move to {screen}" lands on that screen
- [ ] Notepad Share on Safari/Android receives the note; Chrome on Windows/macOS shares a file or text without error; Download works from a popped-out Notepad
- [ ] Real Firefox and Safari: Compatibility pane and System tab read like the `?caps=` simulation

**Noticed, not changed:** Appearance `Switch` knob reads `--sdl-onAccent` (written as `--sdl-on-accent`) so it is always #fff; `render.yaml` has no CSP; local Node 20.19.4 vs engines ≥22.12; `App.jsx` imports `MotionConfig` unused; MediaPlayer's pre-existing 3 s control auto-hide can unmount a keyboard-focused button.

---

# Runtime performance pass — 2026-09-17

Owner request: *"the project is starting to slow down, we need to optimize our code and make it more
efficient to render and operate."* Bundle size was fixed on 2026-09-03 and has held (eager set
~163 KB br). This pass is about steady-state runtime cost. Full plan with rationale:
`~/.claude/plans/splendid-stirring-flute.md`; findings are written up in
`tasks/optimization-audit.md` (dated section) at the end.

## 0. Baseline (before any edit)
- [x] IDB writes / store notifications / timers over 30 s idle, Music playing, Music paused+minimised
- [x] Eager + MarkdownRenderer chunk sizes from a measurement build

## Tier A — steady-state idle cost
- [x] A1 Debounce persist `setItem` (+ flush on pagehide); drop `lastFmData` from persisted music
- [x] A2 `musicCurrentTime` out of `music`; YT poll only while playing
- [x] A3 `React.memo(SocialWidget)`; `useSystemMetrics(!isControlCenterOpen)`
- [x] A4 `useMinuteClock` hook → MenuBar, ClockWidget, new `DockClock` leaf in Taskbar
- [x] A5 Taskbar: hoist static filters, memo dockApps, dock magnification → CSS
- [x] A6 App: throttled idle re-arm, `transition-colors`, glows → radial-gradient
- [x] A7 Shared lazy AudioContext in `useSoundEffects`
- [x] A8 `useMediaQuery` deps
- [x] A9 Window: drop ResizeObserver/dimensions, dead props, WindowGlass blur
- [x] A10 Blur radii: Taskbar/SystemDashboard 3xl→xl; AppIcon tile backdrop blur off
- [x] A11 Delete SystemMetricsWidget.jsx, App.css, unused Widgets imports
- [x] A12 QuantumWidget frameloop off while document.hidden

## Tier B — background work / leaks
- [x] B1 `useWindowVisibility(id)` → Snake, TowerStack, TriviaGame, Visualizer, YT poll
- [x] B2 Visualizer: exit loop when settled; hoist gradients
- [x] B3 aiSlice listener leak on error
- [x] B4 useTerminal: progressive interval cleanup; memo inputHistory; hoist themes
- [x] B5 Spotlight achievement once
- [x] B6 Benchmark pool spawned in startBenchmark

## Tier C — interaction hot paths / store hygiene
- [x] C1 MarkdownRenderer: hoisted components, memo, PrismLight; Docs search corpus memo
- [x] C2 applyTheme palette cache; useColorwayList in Appearance/DesignLanguage
- [x] C3 windowSlice: trackRecentFile out of updater; focusWindow identity; drop `|| []`
- [x] C4 Uploaded wallpaper as Blob in its own idb key

## Verify
- [x] lint + build clean; chunk sizes after
- [x] Node harnesses: debounce, focusWindow identity, minute clock
- [x] Same browser probe after; manual click-through of touched paths
- [x] Review section below + `tasks/optimization-audit.md` updated

## Review — 2026-09-17

**Shipped.** 3 new files, 38 touched, 2 deleted. `npm run lint` clean, `vite build` clean, three Node
harnesses green (persist throttle, minute-clock alignment, windowSlice identity/ordering).

### Measured, same harness before and after (Browser pane, dev server, Music window open + paused)

| | before | after |
|---|---|---|
| live intervals on an idle desktop | 1 s ×2 (dock, clock widget), 2 s ×2 (dashboard, closed Control Center), 30 s, 60 s | 2 s ×1, 30 s, 60 s ×3 (minute-aligned) |
| YouTube seek poll while paused | 1 s, permanent | none (only while playing and visible) |
| `AudioContext`s on the bare desktop / with one window | 8 / 10 | 0 / 0 (one, lazily, on the first click) |
| 10 rapid `setMusicCurrentTime` → IDB puts | 10 × 44,664 B | 1 (store notified 10×, `music` identity unchanged) |
| `focusWindow` on a non-minimised window keeps `minimizedWindows` identity | no | yes |
| persisted `music.lastFmData` | yes | no |
| `MarkdownRenderer` lazy chunk | 216 KB br / 776 KB raw | 55 KB br / 206 KB raw |
| eager JS (index + react + ui + utils) | 163 KB br | 163 KB br (unchanged, as intended) |

rAF: baseline was 42/s idle and 106/s with Music open+paused (Visualizer). The after run could not
measure rAF because the pane reported `visibilityState: hidden` for the whole window — so the
Visualizer exit and the Quantum `frameloop` gate are verified by code reading only. Everything else
above was measured against the app's own store instance (see the new lessons.md entry on HMR).

### Also driven in the browser after the change
- Docs window with ARCHITECTURE.md open: 34 prose nodes, 251 Prism token spans (the light build
  highlights `javascript` fences), search typing works, `recentFiles` gains the id exactly once.
- Dock hover: computed scales 1.18 / 1.09 / 1.03 by distance from the hovered item (CSS ladder).
- Custom wallpaper: upload → `wallpaper: 'custom'` persisted, blob in its own idb key, layer paints
  a `blob:` URL; after a full reload it rehydrates from the blob. Test blob removed afterwards.
- The throttled write flushed on `pagehide`: a store change made just before a reload was on disk
  after it.

### Not verified here
- rAF-driven behaviour (Visualizer settle/exit, Quantum widget pause on hidden tab, game-loop pause
  on minimise) — the preview pane did not composite during the after run.
- Real YouTube playback: the dev CSP blocks `https://www.youtube.com/iframe_api` (`script-src`),
  so the player never loads in dev — pre-existing, and the same header set ships in
  netlify.toml/vercel.json. Flagged to the owner; not changed here because it is a security
  policy decision, not a performance one.
- Puter cloud sync of the new `wallpaper: 'custom'` sentinel on a second device (falls back to the
  default wallpaper by design; not exercised).
