# Battery widgets for wallpaper mode — BUILT 2026-10-31 (not yet installed on the Mac)

Source: `~/Projects/battery-optimization/README.md`, which has the charging rules and a planned
`battery-guard` LaunchAgent. **Status: built on `feat/mac-integrations`, uncommitted. The owner chose an https relay on the Mac with the wallpaper staying on Vercel; see Review.**

The value isn't the percentage, since the menu bar already shows that. It's what the menu bar doesn't
show: where the level sits in the 20–80 band and what to do about it, heat, slow health numbers, and
the doc's every-few-weeks routines. The guard's notifications stay the alarm. The wallpaper is behind
windows most of the day, so it's the ambient view.

## Ground truth (measured on this Mac, 2026-10-31, macOS 27.0.1, Plash 2.17.4)

- **Plash has no battery API.** It's WKWebView, and WebKit has no Battery Status API (`registry.js`:
  Safari and Firefox are `null`). That's why the v1 review dropped a battery widget. In Plash the
  readings have to come from a process on the Mac: the "companion" that `mac-integrations.md` deferred.
- **A plain-http helper can't reach the production page.** In a WKWebView harness (not Plash itself)
  with a non-persistent store, `fetch('http://127.0.0.1:47380/…')` and `http://localhost:47380`:
  - from `https://example.com` failed with `TypeError: Load failed`, and the server logged no request,
    so WebKit blocked it as mixed content before sending;
  - from `http://example.com` and from `http://127.0.0.1` returned 200 (control).
  Loopback is not exempt. The helper has to serve **https**.
- **The CSP already allows an https helper.** `connect-src … https: …` is a scheme source, so it matches
  `https://127.0.0.1:47380` with no edit to the three CSP copies. This follows from the CSP rule and still
  needs checking in the spike.
- **Readings that need no sudo:** `pmset -g batt` showed 79%, discharging, 7:56 remaining.
  `ioreg -rn AppleSmartBattery` showed `CycleCount` 187, `DesignCycleCount9C` 1000,
  `NominalChargeCapacity` 5257, `FullChargeCapacity` 5107, `DesignCapacity` 5596.
  - Nominal ÷ design = 93.9%, which is the doc's "Maximum capacity 94%". Full-charge ÷ design is 91%.
  - Time left disagrees: pmset says 7:56 but ioreg's `AvgTimeToEmpty` says 323 min (5:23), read in the
    same run. Use pmset's figure, which is the one macOS shows.
- **The battery temperature moved.** The doc's `ioreg -rn AppleSmartBattery | grep '"Temperature"'` prints
  nothing on macOS 27.0.1. The value now sits under `ioreg -rc AppleSmartBatteryPack -w0`, in `BatteryData`,
  as `"Temperature"=3050` (30.50 °C). `ProcessInfo.thermalState` also works without root (it read 0, nominal).
- **The Charge Limit can't be read.** Nothing in `pmset -g`, `pmset -g custom` or the AppleSmartBattery keys
  (`ChargerConfiguration` = 0). "Holding at 80%" has to be inferred (adapter, not charging, at the cap), or
  taken from `ChargerData.NotChargingReason` if that has its own value at the limit. It reads 128 on
  battery; the value at the limit is a spike item.
- **Power settings can be read:** `pmset -g custom` shows `powernap 1` and `lowpowermode 1` on both battery
  and AC, matching the doc's ❌ and ⚠️ rows.
- **What Plash offers:** a per-website "Allow self-signed certificate", and "Deactivate while on battery".
  The page gets nothing except the two `<html>` classes (no script message handlers in the binary).

## What the doc's rules turn into

| Doc rule | Wallpaper feature |
|---|---|
| 80% cap, 80→40 daily band, 30–40 recharge point, 20% floor, < 10% emergency | Battery widget: level, a band bar, one line of advice |
| Heat is the biggest risk (alert at 40 °C) | Same widget: the temperature, and an alert tone when hot |
| Cap broken = still charging above ~82% | Same widget: "Above 80%, check Charge Limit" |
| Every 1–2 weeks run it down to 30–40%; monthly let it reach ~20% | Battery health widget: one "due" line |
| Monthly health log (cycles, max capacity) | Battery health widget: capacity ring, cycles, wear pace |
| Settings table (Power Nap, Low Power Mode, Charge Limit, Optimized Charging) | Settings checklist, plus a Battery settings tile |
| Floor, cap and heat notifications | Stay in battery-guard. Not duplicated on the page. |

## Proposed

### 1. Battery widget (small)
- `Battery` label with a state glyph, a big level, and a band bar: the 40–80 band shaded, ticks at the
  floor and the cap, a dot at the level.
- One advice line, picked from the live reading and the thresholds the helper sends (so the page and the
  notifications never disagree):

  | Reading | Line | Tone |
  |---|---|---|
  | Adapter, not charging, at the cap | Holding at 80% | neutral |
  | Adapter, charging, below the cap | Charging to 80% · time to full | neutral |
  | Adapter, charging, at or above 82% | Above 80%, check Charge Limit | alert |
  | Battery, over 40% | On battery · time left | neutral |
  | Battery, 30–40% | Good time to plug in | neutral |
  | Battery, 21–29% | Plug in soon | warn |
  | Battery, 20% or less | Plug in now | alert |
  | Temperature at or above 40 °C (any source) | Hot · 41° · give it air | alert, overrides the rest |

- The sub line shows the temperature, in the wallpaper's existing °C/°F setting.
- Colours: law 10 rules out green for "fine". Normal states are plain ink, then `--sdl-warn`, then `--sdl-alert`.
- Polls every 60 s through `useVisiblePoll`, so nothing runs while the page is hidden.
- With no helper it shows a setup note ("Set up the Mac helper in Settings → Wallpaper mode"), like
  Weather and Agenda do. v1 has no Chrome Battery API fallback, so there's one data path.

### 2. Battery health widget (medium)
- Maximum capacity ring (nominal ÷ design, which matches System Settings), cycles out of 1000, the
  condition, and the wear pace against Apple's (1% per 50 cycles, from the doc).
- One "due" line when a routine is overdue: "Run it down to ~35% this week" (nothing at 40% or below
  for 14 days), or "Let it reach ~20% once this month". Otherwise "Routines up to date".
- It needs history the guard keeps (`below40` and `near20` dates, monthly `health.csv`), so it comes after it.

### 3. Tools
- **Battery settings tile** for the Apps widget: `x-apple.systempreferences:com.apple.Battery-Settings.extension`
  opens System Settings → Battery (Charge Limit, Low Power Mode, Optimized Charging). It works like the
  existing Settings tile.
- **Settings → Wallpaper mode → Battery card:** helper setup steps, a "Check connection" button (like
  Agenda's), and the live power checklist. Power Nap on battery and Low Power Mode on AC each show their
  `sudo pmset …` command with a Copy button, since those stay manual. Charge Limit and Optimized
  Charging can't be read, so they link to the pane.
- **Set up Plash card:** step 7 currently suggests "Deactivate while on battery". With the Battery widget
  on, it should say to leave that off, since battery is exactly when the widget matters. The closing
  paragraph ("none of them rely on Chrome-only features") should mention the helper.

## Data path (decision 1)

**Recommended: a loopback https helper**, part of the battery-optimization project alongside the guard.
- `GET https://127.0.0.1:47380/v1/battery`, read only, bound to 127.0.0.1.
- The `Host` header must be `127.0.0.1:47380`.
- CORS is limited to the production origin and the dev origin.
- No write endpoints.
- A self-signed certificate for `IP:127.0.0.1` only, `CA:FALSE`, valid ≤ 825 days, with its key mode 600.
  The owner trusts it for SSL in the login keychain with one `security add-trusted-cert` command, which
  prompts for their password. That changes a security setting, so it stays the owner's step.
- Readings stay on the Mac and still work offline, which matters because being unplugged often means
  being away from Wi-Fi.

Not recommended:
- **Relay through `/api/battery`**: needs a cloud store (the API has none today), sends the readings off
  the Mac, and goes blank when you're unplugged and offline.
- **Plash's "Allow self-signed certificate" on the wallpaper entry**: its scope is unknown. If it accepts
  any certificate in that web view, it weakens TLS for the calendar key the URL carries.
- **A local http page that frames the production site**: blocked by `frame-ancestors 'self'`. Plash's
  classes would land on the wrapper, not the frame, and Mac links from frames already failed in Plash
  (v3.1). WebKit would also partition the frame's storage, so Plash's to-dos would disappear.

Contract (v1). The page computes the advice; the helper only reports:

```json
{
  "v": 1, "at": "2026-10-31T06:10:00Z",
  "pct": 79, "ac": false, "charging": false, "full": false,
  "minutes": 476,
  "tempC": 30.5,
  "cycles": 187, "cyclesRated": 1000,
  "nominalMah": 5257, "fullMah": 5107, "designMah": 5596,
  "power": { "battery": { "powernap": 1, "lowpowermode": 1 }, "ac": { "powernap": 1, "lowpowermode": 1 } },
  "limits": { "cap": 80, "capAlert": 82, "floor": 20, "recharge": [30, 40], "hotC": 40 },
  "routine": { "below40": "2026-10-24", "near20": null },
  "history": [{ "date": "2026-10-31", "cycles": 187, "nominalMah": 5257, "designMah": 5596 }]
}
```

`minutes` is pmset's estimate, to empty or to full, and `null` while macOS is still calculating.
`limits` is the guard's own config. `routine` comes from the guard's state file and `history` from its
`health.csv`. Both are `null` or empty until the guard has run.

## 0. Spike on the real Mac (≈45 min, decides 1)
- [ ] WKWebView harness, then Plash with the production URL: `fetch('https://127.0.0.1:47380/v1/battery')`
      with the cert trusted in the keychain. Expect 200 with no Plash setting changed. Without trust, expect
      a failure (control).
- [ ] The production CSP really does allow it (deploy, then check from Plash, per the v3.1 lesson).
- [ ] `ChargerData.NotChargingReason` when plugged in and held at 80%.
- [ ] The Battery pane deep link opens from a plain link in Plash.
- [ ] Chrome: the Local Network Access prompt appears once for the site, then 200.

## 1. Helper endpoint (battery-optimization repo)
- [ ] A Swift binary (Network.framework TLS, IOPowerSources, the AppleSmartBatteryPack temperature), run
      as a LaunchAgent with KeepAlive. A Python `ssl` server is fine for the spike.
- [ ] The guard writes the `below40` and `near20` dates into its state file.
- [ ] `install.sh` creates the cert and prints the trust command for the owner to run.
- [ ] Each field checked against `pmset` and `ioreg` on the real Mac.

## 2. Battery widget (os-portfolio)
- [ ] `config.js`: `battery: { name: 'Battery', size: 'small' }`, opt-in (not in the defaults), and a
      URL flag `bat=1` ("helper installed"), so the page never touches loopback unless the owner turns it on.
- [ ] `src/wallpaper/battery.js`: `fetchBattery()` (2 s timeout, payload validated and clamped) and a pure
      `batteryView(reading)` implementing the table above.
- [ ] `BatteryWidget` in `widgets.jsx`; Settings Battery card (setup, Check connection, Plash note).
- [ ] `scripts/battery-check.mjs` and `npm run battery:check`: every band edge (81/80/79 on the adapter;
      41/40/31/30/29/21/20/10/9 on battery), the hot override, a broken cap, malformed and partial
      payloads, and `minutes: null`.

## 3. Battery health and the settings checklist
- [ ] `batteryHealth: { name: 'Battery health', size: 'medium' }`, reusing `Ring`.
- [ ] Power checklist in the Settings card, with the Copy buttons.
- [ ] Battery settings tile in `MAC_APPS`.

## Corrections for battery-optimization/README.md (not applied)
- Monitoring and the heat guard: read the temperature from `ioreg -rc AppleSmartBatteryPack -w0`
  (`"Temperature"=3050`, nested in `BatteryData`). As written, the heat alert would never fire.
- Baseline: "~5170 mAh" matches neither of today's figures (full-charge 5107, nominal 5257). Record both,
  and note that 94% is nominal ÷ design.
- Time left: use `pmset -g batt` (7:56). ioreg's `AvgTimeToEmpty` said 5:23 at the same moment.
- Guard plan: add the endpoint and the routine dates above.

## Owner decisions
1. **Data path:** loopback https helper (recommended) or relay through the site's API.
2. **Scope:** the Battery widget first (recommended). Battery health and the checklist once the guard has
   a few weeks of history.
3. **Helper:** Swift binary (recommended: no runtime dependency, reads IOKit directly) or Python
   (quicker, depends on Homebrew's python).
4. **Plash:** Settings tells you to leave "Deactivate while on battery" off when the Battery widget is on
   (recommended).

## Gates
`npx eslint src api`, `token-lint --strict`, `npx vite build`, `npm run battery:check`, and `url:check`
with the `bat` cases. Then a browser check of each widget state with a stubbed helper, and real Plash on
this Mac (the part the Chromium pane can't prove).

## Review
Built 2026-10-31. Owner's decisions: wallpaper stays on Vercel; a loopback https relay on the Mac;
the guards and the tools as proposed.

**battery-guard (`~/Projects/battery-optimization`).** One Swift binary handles the three alerts, the
monthly health log and the relay (`https://127.0.0.1:47380/v1/battery`), bound to 127.0.0.1. Its own
README's Review has the details.
- Readings match `pmset` and `ioreg`.
- Every alert transition passes with fake readings in dry-run mode.
- Relay rules: wrong Host → 421, unlisted origin → 403, POST → 405, plain http and untrusted TLS refused.
- A WKWebView on an https page fetched it → 200, with the relay's certificate as the only trust anchor.
- Footprint about 5.5 MB.

**Wallpaper.**
- `src/wallpaper/battery.js`: fetch, payload checks, `batteryView`, `healthView`, `powerChecklist`.
- Widgets `battery` (small) and `batteryHealth` (medium); one shared request a minute, only while visible.
- A `bat=1` URL flag (off by default), so visitors never touch their loopback.
- A Settings → Battery card: install steps, an on switch, Check connection, and the power checklist with Copy.
- A `mac:battery` tile that opens System Settings → Battery.
- The Plash steps now warn that "Deactivate while on battery" hides the widgets when they matter.

As built, where it differs from the proposal:
- The relay is https from the start, so no CSP change was needed (`connect-src https:` covers it).
- One Swift binary replaces the planned bash guard plus separate server.
- The temperature sits in the widget's header, beside the icon. Measured in the widget's font, the
  sub line has 130 px, and "Check Charge Limit · 31.6°" didn't fit.
- Copy was shortened to fit: "Above 80% cap" + "Check Charge Limit", "Not charging",
  "Plug in now" + "Very low · …", and "Give it air or pause".

**Measured.**
- `npx eslint src api` clean; `token-lint --strict` no regressions (−6); `npx vite build` OK.
- `battery:check` 53; `url:check` 40 (36 + 4 `bat` cases); agenda 75, profile 76, facts 148,
  interaction 144, all passing.
- Chromium (dev server, relay stubbed by overriding `fetch`, since the pane can't trust the certificate):
  - The off and unreachable notes.
  - 70% on battery; 18% (alert ink); 25% (warn ink); hot 41.2 (alert); broken cap (alert); holding at 80%.
  - 36 °C shown in warn ink.
  - Nothing cut off in any state.
  - Health: 94%, 187 of 1000, 1% per 31, the routine line due and up to date.
  - Settings Check connection: "Connected. 80% on the adapter, 31.6°." with the real pmset checklist.

**Not validated.**
- Real Plash with the trusted certificate: battery-guard isn't installed yet, and trusting the
  certificate is the owner's step.
- The Vercel deploy: the production CSP is expected to allow the relay, but that's untested.
- Copy buttons: this pane denies clipboard writes. The existing Copy Plash URL fails there too, and
  both say so.
- The real alerts firing as macOS notifications.
- `notChargingReason` while held at 80%.
