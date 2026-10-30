# Mac integrations without installing anything

Goal: make the Plash wallpaper do more on the Mac using only the bridges that already exist: app
URL schemes (already used by the app tiles), Plash's own `plash:` scheme and Shortcuts actions, and
the Shortcuts app. Nothing new runs on the Mac. The local helper ("companion") comes later, as its own plan.

Ground truth this plan builds on:
- Clicks reach the page only in a normal browser, or in Plash with Browsing Mode on (`interactive` in
  `readWallpaperMode`). In passive Plash nothing is clickable, so every button below is a Browsing
  Mode feature, and item 3 makes getting in and out of it fast.
- ~~Mac links open through the hidden `lumina-mac-links` frame~~ — **wrong in real Plash, fixed here**
  (see Review): Mac links are now plain top-level links marked `data-mac-link` (`MAC_LINK_ATTR`,
  launchers.js). They need Plash's "Open external links in default browser" on.
- `shortcuts://run-shortcut?name=…` already works: it is how "Lumina Open" opens any app by name.
- Plash 2.17.4 (installed here) documents `plash:reload | next | previous | random |
  toggle-browsing-mode | add?url=`, Shortcuts actions "Set Current Website" / "Switch to Next
  Website", and the `is-plash-app` / `plash-is-browsing-mode` classes on `<html>`.
- Light/dark comes from the colorway (`applyTheme.js`: `data-mode` = `cw.mode`, law 7).

## 0. Spike on the real Mac first (≈30 min, decides 3 and 5)
Run 2026-10-30 on macOS 27.0.1, Plash 2.17.4 (WebKit UA "Version/18.0 Safari/605.1.15"), with a local
page at http://127.0.0.1:5199 that reported its `<html>` classes, `prefers-color-scheme` and events
back to the server. Control: `open -g plash:toggle-browsing-mode` from the shell flipped the class
both ways within a second, so the page's view of Browsing Mode is reliable.
- [x] `plash:toggle-browsing-mode` through the hidden frame (`target=` a hidden iframe): **does not
      work**, either clicked by the user (2 clicks) or set by script. Browsing Mode stayed on.
- [x] The same href as a **plain link** (no target), clicked: **works**, the mode went off within 30 ms.
      There was no alert and the page did not navigate away. Repeated once, same result. → Item 3 uses a
      plain link. A local page has no CSP, so check it again on the real build.
- [x] `prefers-color-scheme` **follows macOS live**: a `change` event fired at the moment of the
      switch to Light, and it read Light again after `plash:reload`. → Item 5 is possible.
- [x] Shortcuts on this Mac has **no Automation section**, so there is no automatic Focus trigger. →
      Item 4 changes to "mode shortcuts": one Shortcut per mode that sets the Focus AND
      Plash's "Set Current Website", run from a hotkey or a Shortcut tile.

## 1. Join button on meetings (Agenda widget)
- [x] `api/_lib/ics.js`: for each event, find one meeting link in `URL`, `LOCATION`, `DESCRIPTION`,
      `X-GOOGLE-CONFERENCE`, `X-MICROSOFT-SKYPETEAMSMEETINGURL`. Allowlist hosts only: Zoom
      (`*.zoom.us/j/<id>`), Google Meet, Teams (`teams.microsoft.com/l/meetup-join/…`), Webex.
      Return it as `join` (never the description itself).
- [x] Native hand-off where the app has one: Zoom → `zoommtg://zoom.us/join?confno=<id>&pwd=<pwd>`,
      Teams → `msteams:/l/meetup-join/…`; Meet/Webex stay https (default browser).
- [x] `AgendaWidget`: a "Join" chip on the `now` row and on `next` from 10 min before; it goes through
      the Mac-link frame in Plash. `scripts/agenda-check.mjs`: fixtures for each provider, a
      lookalike host (`zoom.us.evil.com`) that must be rejected, and an event with no link.
- [x] `/api/calendar` stays behind `WALLPAPER_KEY`; confirm its response is not CDN-cached, since
      meeting links are semi-secret.

## 2. Shortcut tiles and project tiles (Apps widget)
- [x] Shortcut tile: any named Shortcut as a tile (`shortcuts://run-shortcut?name=<name>`). This is the
      general escape hatch: "Start focus block", "Open today's note", "Join standup", whatever you
      build in Shortcuts. URL param `sc` (repeatable, sanitized like `mac`), Settings row like "Mac apps".
- [x] Project tile: a folder under your home → `cursor://file/<path>` or `vscode://file/<path>`
      (editor picked per tile). URL param `proj`; path must be absolute, no `..`, length-capped. The
      Plash URL is already private (it carries `ck`), but say in Settings that the path rides in it.
- [x] Both count toward `MAX_TILES`; reuse the favicon/Icon fallback.

## 3. Getting in and out of Browsing Mode
- [x] When `<html>` has `plash-is-browsing-mode`, show a small "Done" pill: a plain `<a>` (no target,
      per spike 0) to `plash:toggle-browsing-mode`. Only shown while the class is present, so it can
      only turn the mode OFF. Check that the production CSP does not block it.
- [x] Settings guide card: make a Shortcut "Wallpaper: interact" with one "Run Shell Script"
      action `open -g plash:toggle-browsing-mode`, and give it a keyboard shortcut. One hotkey in,
      the Done pill (or the same hotkey) out.

## 4. Focus-aware wallpaper (Settings guide, little or no page code)
- [ ] Each wallpaper URL already carries a full setup, so a "profile" is just another URL. Settings
      gets "Copy URL as…" for Work / Personal (the current setup), plus steps: add each to Plash,
      then a Shortcuts Focus automation → Plash "Set Current Website".
- [ ] Optional, a design call: save named profiles in Settings (localStorage, like `wallpaperPrefs`),
      so switching which one you are editing is one click.

## 5. Follow macOS light/dark (a design call: law 7)
- [ ] Only if spike 0 shows `prefers-color-scheme` flips in Plash: optional second colorway (`cwd`/`cwl`
      pair) and the page picks by `prefers-color-scheme`. Mode still comes from a colorway, never
      free-floating, so law 7 holds.

## Gates
`npx eslint src api`, `token-lint --strict`, `npx vite build`, `npm run agenda:check` (+ new cases),
browser check of every new control. Then real Plash on this Mac for items 1–3. That is the part the
Chromium pane cannot prove.

## Review

Items 1–3 built on `feat/mac-integrations` (2026-10-30). Items 4 (Focus-aware via mode shortcuts) and
5 (follow macOS light/dark) are not started.

**As built, where it differs from the plan above**
- Join is a round camera button, not a "Join" text chip, so the row keeps its title, end time and
  countdown. It shows on `now` rows and on any row starting within 10 min (not only `next`: two events
  can start together). In passive Plash it is an unfilled glyph, since it cannot be clicked there.
- The 3-item guide card was not needed: Settings → Set up Plash already tells you to bind Plash's
  own "Toggle Browsing Mode" hotkey. That step now mentions Join and the Done button.
- New `npm run url:check` (scripts/wallpaper-url-check.mjs) covers the `sc` / `proj` URL contract.

**Real Plash finding that changed existing behaviour.** The v3.1 hidden-frame route for Mac links
(`target="lumina-mac-links"`) does nothing in real Plash 2.17.4, even with "Open external links in
default browser" on. That setting was already on here. v3.1 had been checked against Plash 2.16's
code in a WKWebView harness only. Test page, user clicking: shortcuts:// via the hidden frame
→ nothing (5 clicks, Shortcuts never launched); maps:// as a plain link → Maps opened; podcasts://
with target=_blank → Podcasts opened; the page stayed put each time. So every Mac tile, including
the existing Spotify/VS Code ones, has been dead in Plash since v3.1. Fixed: plain links everywhere
(Apps widget, App launcher, Join), the hidden iframe removed, and the "Nothing opened?" hint keyed on
`data-mac-link`. The CSP `frame-src` schemes added for the frame are no longer needed. They are
harmless, so they were left in place.

**Review (ultracode workflows)**
- 3 lenses (security, correctness, design) → 12 findings → a skeptic per finding → 11 confirmed, 1
  refuted (bidi characters in project paths: no real spoof, but refused anyway since it is cheap).
- Confirmed and fixed:
  - Quadratic regex on hostile invite text (40k dots ≈ 2.8 s), with links also scanned on events
    not on the day.
  - Webex accepted any webex.com page.
  - Shortcut names altered: emoji VS16/ZWJ, Indic vowel signs, ’ / # % @.
  - A duplicate event across feeds lost its link.
  - A call tied with another event's start got no Join.
  - Zoom passcode lost behind `&amp;`.
  - Join squeezed the title to 86 px.
  - Join had no accessible name.
  - Passive Join looked live.
- A fix-verification pass (one verifier per lens) confirmed all 11 and found 7 follow-ons, all
  fixed:
  - Webex Events / k2 / e.php / lowercase mtid were dropped.
  - The 64 KB scan cap was raised to 1 MB, since scanning is now linear.
  - Shortcut names no longer have spaces collapsed or NFC applied.
  - The end time is no longer hidden.
  - The next-row squeeze is gone.
  - Empty spacer removed on later rows.
  - Duplicate accessible names now include the start time.
  - `&#38;` / `&#x26;` handled.

**Measured**
- eslint src api clean; token-lint --strict no regressions; `npx vite build` OK.
- agenda:check 75, url:check 36, plus solar 127, context 134, relief 168, interaction 144,
  profile 76, facts 148, all passing.
- Chromium: links and targets, the Plash and passive states, a 130 px title with an end time and
  Join, and Settings adding a project and writing it to the URL.
- Real Plash 2.17.4, a dev server on 127.0.0.1 with a test calendar, user clicking:
  - The Teams Join button opened Teams.
  - The Meet Join button opened the browser.
  - The Shortcut tile opened Shortcuts.
  - Done turned Browsing Mode off.

**Not validated**
- The Zoom join button on a real meeting (deliberately not clicked against a made-up meeting ID).
- Project tiles opening an editor: neither Cursor nor VS Code is installed on this Mac. The link
  shape is the documented `vscode://file/…`.
- The Vercel deploy and the production CSP. The real-Plash run used the dev server's CSP.
- Real calendar feeds: `CALENDAR_ICS_URLS` and `WALLPAPER_KEY` are still not set in Vercel.
