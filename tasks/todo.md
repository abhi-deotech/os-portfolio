# Wallpaper mode (Plash desktop dashboard) — PROPOSAL, 2026-10-27

Owner request: a "dashboard / desktop wallpaper" mode, reachable from the right-click menu and
Settings, that strips the OS chrome and works as an always-on background for a Mac via
[Plash](https://sindresorhus.com/plash). Owner's starting list: no boot or screensaver; no GitHub or
LinkedIn widget; no dock (it clashes with the macOS Dock); widgets pushed into the corners, since
corners are what stays visible around normal-size windows; Apple widget styling.

**Status: built 2026-10-27** with the owner's decisions: top-right small only, Open-Meteo weather, tinted default, auto-on in Plash. `[-]` marks a proposal item dropped on purpose; the Review below says why.

## What Plash changes about the design (facts that drive the rest)

- **It's WebKit (WKWebView), not Chrome.** Every Chromium-only capability is missing: Battery,
  Compute Pressure, Network Information, Device Memory and Idle Detection. On a wallpaper, a
  "not supported" notice is clutter, so a widget whose data is missing doesn't render at all.
  Settings explains what's hidden and why, per the honest-notices policy.
- **It has its own storage.** Plash's webview doesn't share IndexedDB with your browser, so a toggle
  flipped in Chrome never reaches Plash. **The URL has to be the source of truth**
  (`/?mode=wallpaper&…`). The Settings pane builds that URL so you can paste it into Plash.
- **It's non-interactive by default.** Clicks pass through to the macOS desktop, so there's no
  hover, drag, tabs or buttons. Every widget has to work as a glance.
- **Plash can be detected.** It adds `is-plash-app` to `<html>`, and `plash-is-browsing-mode` while
  browsing mode is on. Use these as an automatic trigger (watch them with a MutationObserver, since
  they're added after load). Browsing mode is when layout editing turns on.
- **It's always running on a laptop.** It can deactivate on battery, but the budget is still "near
  zero when nothing changes": no rAF loops, no three.js, minute-aligned ticks, and polling paused
  while `document.hidden`.
- **macOS already owns some of the screen.** Menu bar plus notch at the top (~24–37pt, notch centred),
  the Dock at the bottom (~70–80pt unless hidden), and Finder's desktop icons in the top-right column.

## Proposed changes

### A. Entry, exit and persistence
- [x] `src/hooks/useWallpaperMode.js` sets `{ active, interactive }`. It turns on from
      `?mode=wallpaper`, from `html.is-plash-app`, or from a session-only store flag set by the menu.
      `interactive` is true in a normal browser and in Plash browsing mode.
- [x] `App.jsx`: branch **before** BSOD, Boot and Login. Wallpaper mode lazy-loads
      `<WallpaperDashboard/>`, so the entry chunk only gains the URL check. The `applyTheme` effect
      stays above the branch so colorways still apply.
- [x] Skipped in this mode: BootSequence, LoginScreen (no auth state is written), Screensaver plus
      the idle timer and IdleDetection, BSOD, achievement toasts, sounds, Spotlight, AI chat, window
      layer, Desktop icons, MenuBar, Taskbar (Dock), ControlCenter, QuantumWidget, SocialWidget
      (GitHub/LinkedIn), SystemDashboard tabs.
- [x] Desktop right-click menu gets a **"Wallpaper mode"** row under "Personalize…". In wallpaper
      mode the menu shrinks to **Edit layout / Copy Plash URL / Exit wallpaper mode** (it only shows
      when the page is interactive).
- [x] Exit in a normal browser with Esc, the menu, or a small "Exit" pill that appears on pointer
      movement and fades after 3 s.
- [x] Wallpaper mode never writes `openWindows` or icon positions, so your normal desktop is
      untouched afterwards.

### B. Layout: four corners, empty centre
- [x] `WallpaperDashboard` is a full-viewport grid with four corner **stacks** (TL, TR, BL, BR). The
      centre stays empty.
- [x] Safe-area insets as CSS variables: `--wp-top` (default 40px, clears a notched menu bar),
      `--wp-bottom` (default 88px for the Dock; 16px when "Dock hidden" is set), `--wp-side` 20px.
- [x] Top-right defaults to small widgets only and has a "Keep clear for desktop icons" option (open
      decision 1).
- [x] Stacks grow toward the centre: top stacks downward, bottom stacks upward. A widget never covers
      the middle third of the screen.
- [-] In interactive mode, "Edit layout" lets you drag widgets between corners and snap them there
      (no free positioning). Order and corner go into the URL, and Copy Plash URL hands it over.

### C. Widget design (Apple-inspired, inside SDL)
- [x] One `WidgetShell` with Apple's three sizes: **small** (1×1 ≈ 164px), **medium** (2×1 ≈ 344×164)
      and **large** (2×2). Continuous ~22px radius, 16px padding, one fact per widget, no chrome,
      no tabs, no buttons.
- [x] Surface: the existing `glass` role (24px blur), falling back to opaque when transparency is off.
      Wells stay demarcated (Law 4). Chrome text is quiet and the one data value is sharp (Law 2).
- [x] **Tinted style** (default, like macOS Sonoma desktop widgets): monochrome ink with accent only on
      the key value. **Full colour** is an option. Both obey the brightness ceiling (Law 6). A
      wallpaper is looked past all day, so it should default dimmer than the desktop shell.
- [x] Big numerals: tabular, rounded weight, no ALL-CAPS tracking walls (the current ClockWidget's
      `tracking-[0.3em]` labels go).
- [-] Follows the macOS appearance: `prefers-color-scheme` picks the colorway's light or dark variant.
      Tell people **not** to use Plash's "Invert colors".
- [-] Entrance animation once on load, then static. `prefers-reduced-motion` gets none.

### D. Widget catalogue (real data only)
| Widget | Size | Data source | Works in Plash |
|---|---|---|---|
| Clock + date | medium / large | local, minute tick | yes |
| World clocks (2–4 cities) | small / medium | `Intl` time zones | yes |
| Calendar month | small | local | yes |
| Now playing | medium | existing Last.fm `getNowPlaying`, 60 s poll | yes |
| Weather | small / medium | Open-Meteo (no API key), location set in Settings, 30 min poll | yes (if decision 2 = yes) |
| Day / year progress ring | small | local | yes |
| Battery | small | Battery API | **no** (Chromium only), hidden |

- [x] Remove the **fake weather (24°C "Clear") and `Math.random` bars** in `ClockWidget.jsx`. They're
      invented data, which the Phase 2 "truthful facts" rule forbids, and they'd be the most visible
      thing on a wallpaper. Fixing it helps the normal desktop too.
- [x] Default layout: TL = clock (medium) + world clocks; TR = calendar (small); BL = now playing;
      BR = weather + day progress.

### E. Settings
- [x] New **Settings → Wallpaper mode** pane: live preview thumbnail; corner and widget pickers;
      Dock-hidden toggle; 12/24 h; tinted or full colour; weather location; **Copy Plash URL**; a
      four-step Plash setup guide (paste URL, leave browsing mode off, optionally "Deactivate while
      on battery", optionally reload every 6 h for memory hygiene); and a "Hidden in Plash" list for
      capability-gated widgets.

### F. Verify (before calling it done)
- [x] Preview `?mode=wallpaper` at 1512×982 (MBP 14"), 1470×956 (Air 15") and 1440×900. Check the
      corners clear the safe areas and nothing enters the middle third.
- [x] Simulate Plash with `document.documentElement.classList.add('is-plash-app')` and confirm the
      chrome-free render, with no boot or login flash.
- [x] Idle cost: 0 rAF callbacks per second at steady state, one render per minute (React profiler),
      and no requests while hidden.
- [x] `npx eslint src`, `npm run token-lint`, `npx vite build`; entry chunk growth under 1 KB br.
- [-] **Not verifiable here:** real Plash/WKWebView on macOS (this machine is Linux). That needs a
      manual check by the owner.

## Owner decisions (2026-10-27)
1. Top-right corner: small widgets only.
2. Weather: yes, Open-Meteo, place chosen in Settings.
3. Default style: tinted.
4. Plash detection turns the mode on automatically (`?mode=desktop` opts out).

## Review — wallpaper mode, 2026-10-27

**Shipped.** `src/wallpaper/config.js` (URL contract: parse, build, sanitize), `hooks/useWallpaperMode.js`
(URL + `is-plash-app` via useSyncExternalStore and a MutationObserver), lazy `components/wallpaper/WallpaperMode.jsx`
+ `widgets.jsx` (clock, world clocks, calendar, now playing, weather, day/year), `wallpaper/time.js`,
`wallpaper/weather.js`, `hooks/useVisiblePoll.js`, Settings → Wallpaper mode (`settings/WallpaperTab.jsx`),
desktop menu row, `applyTheme(…, { mirror: false })`, `LiveWallpaper` `override`, `MenuRow` moved to
`components/common`. ClockWidget's fixed "24°C Clear" and `Math.random` bars are gone; it shows real
Open-Meteo weather only once a place is chosen.

**Departures from the proposal, on purpose.**
- No in-place "Edit layout". Plash reloads the URL it stored, so edits made inside Plash would be lost on
  the next reload. Layout lives in Settings as per-widget corner pickers, and Copy Plash URL hands it over.
- No "follow macOS appearance". Mode is derived from the colorway (SDL law 7), and colorways have no
  light/dark twins. The URL carries the colorway instead; the Plash steps say to skip Plash's "Invert colors".
- No entrance animation. The dashboard is static, so idle cost is zero animations (measured below).
- No battery widget, so there is no "hidden in Plash" list: every widget uses data WebKit provides.

**Measured.**
- `npx eslint src` 0 problems; token-lint no regressions; cap 962, facts 148, interaction 144, profile 76
  all PASS; sdl:check in sync; `npx vite build` OK.
- Entry chunk 77,343 B br vs 75,672 baseline (HEAD built in a worktree): **+1.67 KB, over the <1 KB target.**
  The weather module was in the entry via ClockWidget (+2.1 KB); it is now a dynamic import. The rest is
  the URL contract and hook, which have to decide before boot. WallpaperMode is its own 3.97 KB br chunk.
- Preview at 1512×982: six widgets inside the insets (top 40, sides 20, bottom 92 → last bottom edge 890),
  nothing in the middle third (left stacks end at 360, right start at 1152), no widget overflowing.
  At 1280×800 with `dock=hidden` and `h=24`: bottom edge 780, two smalls paired in one row, 24-hour clock.
- `is-plash-app` added to <html> on the plain URL → dashboard with defaults, no exit pill, no boot.
  Esc → clean URL, login. Desktop menu → full Plash URL with colorway. Wallpaper Settings… → Settings on
  the Wallpaper pane. Preview → Exit → back on the same pane.
- Live Open-Meteo: London 56°F and Bengaluru 67°F Overcast rendered; geocoding search returned
  "Bengaluru, Karnataka, India"; production CSP `connect-src https:` allows both hosts.
- 0 running animations in wallpaper mode. The theme mirror kept `bright: 100` after an 85% preview.

**Not validated.**
- Real Plash / WKWebView on macOS (this machine is Linux), including when Plash adds its class and how
  SF Rounded (`ui-rounded`) renders. Owner check on the Mac.
- Now playing with a real Last.fm key: none locally, so only the "Nothing playing right now" state was seen.
- Hidden-page polling pause: logic only; the pane reported `visible` throughout.

---

## Wallpaper mode v2 — owner feedback, 2026-10-28

Owner notes after using v1: no way back to normal mode; the left edge shows Stage Manager's running
apps; the Dock is on the right; "almost nothing useful or app access". Owner choices: a right column
around the Dock; toggling Plash's Browsing Mode to click is fine; app access = Mac apps + websites +
Lumina apps; add to-do, notes and a search box.

- [x] Way back: a Desktop / Settings (/ Plash URL in a browser) control at the head of the column,
      shown whenever the page can take a click (any browser; Plash while `plash-is-browsing-mode` is
      on). Right-click menu: Back to Desktop. Inside Plash, Desktop goes to `?mode=desktop`; Esc only
      exits in a browser, so a stray Esc while typing a task can't leave.
- [x] Layout: four corners → one column on a chosen side (default right), packed from known heights
      in `wallpaper/pack.js`; overflow starts a second column further in. Insets from `screenInsets`:
      Dock on any edge (default right, 96px), Stage Manager reserves 220px on the left (default on).
- [x] New widgets: Search (bar, Google/DuckDuckGo/Bing/Perplexity), Apps (8 tiles: `mac:` URL-scheme
      launchers, `web:` sites, `app:` Lumina apps, plus up to 4 custom http(s) links), To-do (large) and
      Notes (medium), both in localStorage so Plash keeps its own list.
- [x] Clock is now small (the menu bar already has the time); defaults are search, clock + weather,
      apps, to-do, which fits one column at 982pt tall. Calendar, world clocks, progress, music opt-in.
- [x] Opening a Lumina app signs in as guest if needed and skips the boot log.
- [x] Old `layout` prefs migrate in `merge` (personal choices kept, layout reset); `dock=shown` → bottom.

**Measured.** `npx eslint src` 0; token-lint no regressions; cap 962 / facts 148 / interaction 144 PASS;
`npx vite build` OK. Entry 77,452 B br (+109 B vs v1); WallpaperMode chunk 5.70 KB br. Preview at
1512×982: one column x 1076–1416 (Dock inset 96), y 84–840, nothing on the left, no overflow. To-do
added two tasks, ticked one (sorted last, stored in localStorage). `is-plash-app` → controls, task input
hidden, search disabled; + `plash-is-browsing-mode` → Desktop and Settings back, no copy button.
Desktop → `?mode=desktop`, desktop with no boot log. Terminal tile → Terminal window open. Settings pane
renders with Dock = Right from the migrated defaults.

**Not validated (owner, on the Mac).** Whether Plash hands `spotify:` / `vscode:` style links to macOS
(Safari and Chrome do; WKWebView hosts may not), where `target="_blank"` links and searches open from
Plash, and how the Browsing Mode class behaves live. All of it was simulated here by toggling the class.

## Wallpaper mode v3 — apps stay on the wallpaper, 2026-10-28

Owner notes after using v2 in Plash: ⌘C / ⌘V don't work in apps like Notepad; opening Notepad or
Terminal throws you out of wallpaper mode (should stay, with every app usable); "can we make the mac
apps available too?".

Root causes, from Plash 2.16's source (last public tree, via a fork; the repo is now closed):
- Plash is a menu-bar app with no Edit menu. ⌘C/⌘V are menu key equivalents, so in its WKWebView they
  reach the page as bare keydowns and do nothing.
- `decidePolicyFor navigationAction`: a clicked link (`.linkActivated`) to another host goes to
  `NSWorkspace.open` ONLY when "Open external links in default browser" is on — default off. Otherwise
  `vscode://` just fails in the web view. Form submissions are not `.linkActivated`, so searches opened
  in a Plash window. Plash's native right-click menu has "Update Website to Current".

- [x] `wallpaper/plashEditKeys.js` (lazy, loaded only when `is-plash-app`): ⌘C/⌘X via
      `execCommand`, ⌘V via `clipboard.readText` + `insertText` (undoable, React sees it), ⌘A, ⌘Z/⇧⌘Z;
      skips events an app already handled. Applies to the desktop inside Plash too.
- [x] Lumina apps open as windows over the wallpaper. `components/workArea.js` context; Window sizes
      itself into the area and maximizes/snaps within it (desktop unchanged: context is null there).
      Work area = between Stage Manager's inset and the widget columns (+24px).
- [x] Apps control + right-click "All Apps…": launcher panel with every Lumina app (dot when open,
      click restores a minimized one) and every known Mac app.
- [x] Settings opens over the wallpaper; `usePrefsSync` keeps store prefs and the URL in step (URL →
      store on load, store → URL via `replaceState` on edits).
- [x] Mac apps: 13 more URL schemes (Messages `sms:`, WhatsApp, Teams, Claude, Telegram, Cursor,
      Linear, Raycast, Reminders, Maps, Podcasts, App Store, Shortcuts), plus "Any Mac app" by name
      through a `Lumina Open` Shortcuts shortcut (`open -a "$1"`), `mac=` URL params, max 4.
- [x] Search goes out as a clicked link, so Plash routes it to the browser.
- [x] Inside Plash the page no longer takes over right-click: Plash's own menu (with "Update Website
      to Current") shows. Esc exits only in a browser with no window showing and nothing focused.
- [x] Settings → Set up Plash: steps for the external-links setting, the Shortcuts shortcut, and saving
      changes made inside Plash.

**Measured.** `npx eslint src` 0; token-lint no regressions; cap 962 / facts 148 / interaction 144 /
profile 76 PASS; sdl in sync; `npx vite build` OK. Entry 78,101 B br (+649 B vs v2: Window's work-area
geometry, the URL replace helper and the lazy-import hook are eager); WallpaperMode 7,198 B br (+1.4 KB);
plashEditKeys 0.94 kB raw, own chunk. Preview at 1512×982: Settings, Terminal, Notepad windows centred
in x 220–1052 (Notepad clamped 900→800 wide); maximize = fixed 40/460/20/220 insets; ⌥→ snap = x
636–1052. Settings → DuckDuckGo rewrote the URL (`se=duckduckgo`) and the search placeholder. Simulated
Plash: ⌘V pasted a stubbed clipboard into Notepad, ⌘A selected all, ⌘Z undid it, ⌘Q untouched;
right-click not prevented. Without Plash: ⌘V not intercepted, wallpaper menu only outside windows.

**Not validated (owner, on the Mac).** The real clipboard in WKWebView (`execCommand('copy')` and
`readText` were stubbed or synthetic here; WebKit may show its small "Paste" button for text from other
apps). Mac tiles with the external-links setting on; whether `shortcuts://run-shortcut` runs without
bringing Shortcuts forward; the newly added URL schemes on a real Mac.

The dev server had stale pre-bundled deps (504 "Outdated Optimize Dep" for react-markdown), which
blanked the page when Notepad opened; restarting it fixed that. Not a code issue.

## Wallpaper mode v3.1 — "unsupported URL" alert from Mac tiles, 2026-10-29

Owner screenshot from Plash 2.17.4: clicking the VS Code tile put up Plash's "unsupported URL" alert.

Root cause (reproduced in a WKWebView harness running Plash 2.16's `decidePolicyFor` and error path):
with "Open external links in default browser" off, Plash allows the `vscode://` navigation in the main
frame, it fails with NSURLError -1002, and Plash shows that error as an alert. The page sees nothing
in either case (no beforeunload, pagehide or blur), so it cannot tell whether the setting is on.

- [x] Inside Plash, Mac app links (Apps widget, All Apps panel, "any app" shortcuts) target a hidden
      frame, `MAC_LINK_TARGET`. A failed subframe load is silent; with the setting on Plash still hands
      the link to macOS. Browser behaviour is unchanged (no target outside Plash).
- [x] CSP `frame-src` gains the 24 Mac app schemes in vite.config.js, vercel.json and netlify.toml.
      Without them WebKit blocks the frame load before Plash's policy runs, so nothing opened even with
      the setting on.
- [x] After a Mac app click in Plash, a dismissable note says to turn on the Plash setting (or check
      the app is installed). It hides after 10 s; "Don't show again" is kept in Plash's localStorage.

**Measured.** Harness on the real dev page (`?mode=wallpaper`, Plash classes added, fresh data store):
VS Code tile and the All Apps Slack link → setting off: subframe policy for `vscode://` / `slack://open`,
no failed main-frame load (no alert), URL unchanged, note shown; setting on: handed to macOS. Every
`MAC_APPS` scheme is in all three CSPs (scripted check). `npx eslint src vite.config.js` 0;
token-lint no regressions; `npx vite build` OK; vercel.json parses.

**Not validated (owner, on the Mac).** Real Plash 2.17.4 (closed source; 2.16's code was the model) and
the deployed CSP. If Plash loads the deployed site, the fix needs a deploy before it shows up there.

## Wallpaper mode v4 — agenda, focus line, time-of-day wallpaper, 2026-10-30

Owner request: bring the designs from the stand-alone `~/Projects/plash-wallpaper` prototype (built by
mistake as a separate site) into wallpaper mode. Owner choices: Agenda widget, Focus widget and a
time-of-day wallpaper; no workday bar, no rotating reminders (Notes covers them); hosting is Vercel; the
old repo stays as it is. Same branch as v3.1 (owner's choice).

- [x] Calendar backend: `api/calendar.js` (Vercel function) + `api/_lib/ics.js` (parser, ported from the
      prototype). Feed links live only in the `CALENDAR_ICS_URLS` env var; the function answers only
      requests carrying `WALLPAPER_KEY`. Parser handles recurring events, EXDATE, moved and cancelled
      instances, all-day events and TZIDs without a VTIMEZONE block. `ical.js` added as a dependency.
- [x] `vercel.json`: keep `/api/*` out of the SPA catch-all rewrite.
- [x] Dev: a Vite middleware runs `api/*.js` under `npm run dev`, with env from `.env.local`.
- [x] `scripts/agenda-check.mjs` → `npm run agenda:check`: the prototype's parser and endpoint tests.
- [x] URL contract: widgets `agenda` (medium) and `focus` (medium), opt-in; `ck=` carries the calendar
      key. wallpaperPrefs is local-only (not in the Puter sync), so the key stays on this machine.
- [x] Agenda widget: today's next events, "Now · until 3:30" and "in 12 min" from the minute clock; all-day
      events on the label line; refetch every 5 min while visible and when the date changes; honest
      states for no key, rejected key, no feed on the server, and unavailable.
- [x] Focus widget: one line in Plash's localStorage, editable while interactive; dims with "From {day}"
      once the day has passed.
- [x] Settings → Wallpaper mode: an Agenda card (key field, "Check connection", setup steps), and a note
      that the Plash URL carries the key.
- [x] Time-of-day wallpaper: `type: 'sky'` in `theme/wallpapers.js`, palette in `theme/sky.js`, painted
      by LiveWallpaper once a minute, no animation. Its fit ingredients derive from the palette stops, so
      the randomizer judges it like any gradient. Appearance shows a swatch for it.
- [x] Gates after the last edit: `npx eslint src api scripts/agenda-check.mjs vite.config.js`,
      `npm run token-lint`, `npx vite build`, cap / facts / interaction / profile / agenda checks.
- [x] Browser: `?mode=wallpaper` with both widgets, the Agenda states (stubbed endpoint), Focus typing and
      reload, the sky at several hours, Settings card.

**Departures, on purpose.** The browser run used the real function under `npm run dev` with a temporary
`.env.local` (a `data:` URL feed, since deleted), not a stubbed endpoint. That run found a real bug:
`CALENDAR_ICS_URLS` was split on every comma, cutting any link that contains one. Feeds now split on
whitespace or on a comma that starts the next link (checked both ways in agenda-check).

**Measured.** `npx eslint src api scripts/agenda-check.mjs vite.config.js` 0; token-lint no regressions;
agenda-check 32 PASS; cap 962 / facts 148 / interaction 144 / profile 76 PASS; `npx vite build` OK;
vercel.json parses. Entry 74,315 B br vs 73,791 at 1e6ca99 (HEAD built in a worktree): **+524 B**, the
sky palette and LiveWallpaper's sky branch. WallpaperMode chunk 7,616 vs 6,794 B br (+822). `ical.js` is
in no client chunk. Browser at 1512×982 against `/api/calendar` in dev: Agenda shows the all-day title,
"Design review · until 3:06" highlighted, "Standup · in 34 min", then the 1:1. Focus: typed, Enter blurs,
stored with today's date; a stored line from yesterday reads "From Thursday" in `--sdl-sec`.
`is-plash-app`: no controls, Focus read-only with its text. Sky painted at 02:42, 13:00 and 17:45 (style
values checked; one dusk screenshot was a stale frame). Settings → Agenda: the right key reads "Connected.
5 events today."; a wrong key gives the rejection text and the live widget switches to its rejected note;
the key field is a password field; the URL card warns that it carries the key. Randomizer fit for
Time of Day: ok for all 6 dark colorways, refused (tone, polarity 0.67–0.81) for all 10 light ones.

**Not validated.**
- Vercel itself: the function's Web-standard `GET` export, `api/_lib` bundling, and the narrowed rewrite
  were not deployed here. First deploy check: `/api/calendar` answers 401 without a key, not index.html.
- A real Google or Outlook feed (only hand-written and sample feeds were parsed).
- Real Plash on the Mac (classes simulated, as before).

**Noticed, not changed.** Typing in Settings' key field refetches the Agenda once per keystroke (its poll
key includes the key). Harmless in Plash, a little wasteful while typing a key in a browser. The Google
Fonts stylesheet in `index.html` is blocked by the CSP's `style-src` (pre-existing console error).

---

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
