# CPU, Memory and the battery death clock (wallpaper mode v7)

Asked 2026-11-01: RAM and CPU monitors for wallpaper mode, and a "doomsday clock" in Battery health
counting down, in years, months and days, to when maximum capacity reaches 80% (configurable 70–90%).

## Plan (approved)

- [x] battery-guard (`~/Projects/battery-optimization`): `GET /v1/system` with CPU per core (E/P kinds),
      load, memory split, pressure and swap; public calls only, no shelling out
- [x] battery-guard: a day ledger (cycles, nominal capacity) for a cycles-per-day rate and a 7-day median
      capacity; `pmset -g log` as the rate until the ledger spans 14 days; `--battery-since 2021-10`
- [x] battery-guard: HTTP keep-alive, so a poll skips the TLS handshake
- [x] `src/wallpaper/system.js`: parse, cadence (3 s adapter, 10 s battery, 15 s Low Power Mode),
      `cpuView`, `memoryView`
- [x] `src/wallpaper/battery.js`: `deathClock`, `ymdBetween`, `historyTrend`; health ring on the median
- [x] CPU and Memory widgets (small); the clock replaces the "1% per N cycles" line in Battery health
- [x] Settings: the card becomes "Mac readings"; "Death clock counts down to" 90–70% (`bdt`, 80 omitted)
- [x] Checks: battery-check 92, url-check 44

## The death clock

Days left = (capacity now − threshold) ÷ loss per day. Loss per day, best evidence first:

1. **trend:** the monthly health log's least-squares slope, once it spans 90 days and shows a 1% drop;
2. **age (use plus age):** Apple's rating (80% at the rated cycles, so 0.02% a cycle at 1000) × cycles a
   day, plus the yearly loss that rating leaves unexplained over the battery's life;
3. **cycles:** without a start date, all lost capacity is blamed on cycles (harsher).

On 2026-11-01 (94.57%, 187 cycles, October 2021 battery, 1.266 cycles a day from the power log):
0.33% a year from age + 9.24% from use = 9.57% a year → 80% in 555 days (1y 6m 8d, 9 May 2028).
The power log's week was mostly before the 80% cap; at the post-cap 0.9 cycles a day it is about
2 years. It corrects itself as the log rolls forward and the ledger takes over.

## Review

**Built 2026-11-01.** Verified:
- Relay readings against macOS (pressure sysctl, device-tree core kinds, a hand count of the power log).
- Relay cost per `/v1/system` poll: 9.3 ms → 0.73 ms of CPU (keep-alive, shared date formatter).
- In Chrome (local preview on 127.0.0.1:5173, an allowlisted origin): all four relay widgets live; one
  shared request every 3 s, about 3 ms each; picking 75% in Settings wrote `bdt=75` and the clock
  became 2y 0m 15d; Check connection reports both endpoints.
- In a WKWebView (Plash's engine) on the same build: widgets render with live data, 7 polls in 20 s on
  2 reused connections, no clipped text. Worst-case strings measured in SF Rounded / SF Pro fit
  (memory figure cut to 32 px so "63.9 / 64 GB" fits in 127 px).
- Page CPU, 60 s, four widgets: 0.36 s with readings, 0.06 s without. Animated core bars had cost
  2.36 s, so the bars jump instead of gliding.

Not exercised:
- Real Plash on production. That needs this merged and deployed, then a look at the wallpaper.
- The ledger-based rate (needs 14 days of day rows, from 2026-11-15) and the trend (needs 90 days and a
  1% drop in the monthly log).
- "Busy", hot and critical-pressure states on the real Mac (covered by checks with crafted readings only).
