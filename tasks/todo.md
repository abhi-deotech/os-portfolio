# Icons & Settings consolidation — Todo

Two asks: (1) Desktop and Appearance should be one tab, (2) app icons look bad under many colorways.

### Why the icons look bad — diagnosis, not guesswork

The glyph colour carries **100%** of an app's identity, and those colours are literal
*legacy Lumina Neon* hexes baked into `config/apps.jsx`:

| failure | evidence |
|---|---|
| neon on a light plane | `#00f5a0` has rel. luminance 0.678; on Honey Vivid's near-white plane that is ~1.4:1 |
| neon under a disciplined colorway | Carbon/Steel run 46–60% saturation; the icon set runs 100% |
| collisions kill wayfinding | 5 apps render purple, 3 render the same green |
| `colorway` theme | 18 identical accent glyphs — a dock you cannot scan |
| `duotone` theme | `index % 2` is arbitrary, and contradicts its own description ("accent for pinned apps" — the code never reads `pinned`) |
| `outline` theme | everything collapses to `sec`; the *lowest*-contrast option, zero identity |
| Terminal | its `>_` is a bare div — participates in no icon theme at all |
| dock running-dot | `app.shadow` is a second, separate hardcoded hex; Terminal's is `#ffffff`, invisible on a light plane |
| glow | `effectiveGlow = isIdentity ? glow : false` — leaving `lumina` also flattens the dock |

### The fix: store hue, not hex

Identity is the **hue**; discipline is the **colorway**. Convert each app to an OKLCH hue angle and
re-render it at the active colorway's own chroma and lightness, verified by measured contrast. Colour
stays a wayfinding cue (you can still find Music by its purple) without ever fighting the theme.

- [x] `src/theme/oklch.js` — sRGB↔OKLab↔OKLCH + gamut clamp, emitting hex so `contrast()` still applies
- [x] `src/theme/icons.js` — Harmonized (default) / Solid / Monochrome / Outline / Lumina Neon, each with a **tile** and a **glyph** channel
- [x] `src/config/apps.jsx` — declarative `{glyph, hue, legacyHex}`; distinct hues around the wheel; Terminal joins the system
- [x] `Desktop.jsx` + `Taskbar.jsx` — delegate the existing tile to the resolved theme
- [x] `settings/Appearance.jsx` — absorb the Desktop tab; live icon preview
- [x] `Settings.jsx` — delete `renderPersonalization`, the 4 legacy accent swatches, 13 `#cc97ff` literals
- [x] Retire `activeAccent` colour reads (4 files; one reads a variable that has never existed)
- [x] Verify: 16 colorways × 5 icon themes, every glyph ≥ 3:1

## Review

**Measured result** — 18 apps × 16 colorways × 5 themes = 1,440 combinations:

| theme | below floor | worst |
|---|---|---|
| Harmonized | **0 / 288** | 3.20:1 |
| Solid | **0 / 288** | 4.50:1 |
| Monochrome | **0 / 288** | 3.89:1 |
| Outline | **0 / 288** | 3.32:1 |
| Lumina Neon | 180 / 288 | 1.01:1 |

Lumina Neon fails on all ten light colorways by construction — it is a fixed palette. It stays
selectable (it is correct under the legacy colorway) and the Settings card now states the count and
the worst ratio for the colorway you are actually on.

Existing users on `lumina` migrate to `harmonized` at store v3, *except* those running the legacy
colorway. That breaks the "never change a user's look on upgrade" rule set in v2, deliberately: the
old default is measurably broken rather than merely different.

### Two bugs a measurement could not have caught

1. **Solid's dock glyphs were invisible.** Its glyph ink is chosen to read *inside* the filled tile;
   the dock draws icons without one, so cream ink landed on a cream dock. Every contrast number was
   correct — for a surface the glyph never touched. Fixed with a `bare` channel.
2. **The Quantum Core rendered as a black blob** on light colorways. `metalness: 0.8` with no
   environment map reflects nothing, so the sphere ignored its base colour entirely. It went
   unnoticed for as long as the widget only ever sat on a dark card.

Both were found by looking at a screenshot — which required `scripts/shot.mjs`, because the in-app
Browser pane never composites (`document.hidden` is permanently true, rAF never fires, so
framer-motion's `AnimatePresence` never resolves and the app is frozen on the pre-boot screen).

### Also fixed, in passing

- `CustomIcon` defaulted to `themed: true`, so the *app icon* setting recoloured every chevron and
  panel header in the OS. Choosing "Outline" turned Control Center and Settings uniform grey.
- Retro Arcade shared both its glyph (`Gamepad2`) and its colour with Game Center.
- `NowPlayingWidget` read `var(--os-${activeAccent}-rgb)` — a variable that has never been declared.
- The desktop label halo was a hardcoded `rgba(0,0,0,.8)`, i.e. a dark-mode assumption.
- `token-lint` and `token-census` counted hexes inside COMMENTS, so documenting the bug tripped the
  ratchet. Comments are now stripped (accounts for 8 of the 59 `os-*` and 10 of the 46 untokenized
  reductions below; the rest is real).

Census: `os-*` **975 → 916**, white/black **226 → 219**, untokenized colour **613 → 567**.
eslint 3 errors (all pre-existing unused vars), build green, vendored SDL in sync.

---

# Music App: Global Dual-Engine Playback — Todo (archived, unrelated session)

Plan: /home/hepond/.claude/plans/radiant-cooking-snail.md

- [ ] Install `music-metadata` devDependency
- [ ] `plugins/musicManifest.js` — Vite plugin: scan `public/assets/music/*.mp3`, ID3 → `virtual:music-manifest`, cover extraction, dev watcher
- [ ] Seed `public/assets/music/` with royalty-free tracks (ffmpeg re-encode + ID3 tags), gitignore `.covers/`
- [ ] `src/data/musicData.js` — `source: 'youtube'` on existing tracks, merge virtual manifest
- [ ] `src/utils/musicEngine.js` — global singleton: Audio element + YT iframe backends, store subscription, AnalyserNode, seek()
- [ ] `src/App.jsx` — attach engine on mount
- [ ] `src/store/slices/musicSlice.js` — nextTrack/prevTrack actions, fix default currentTrack; `osStore.js` reset isPlaying on rehydrate
- [ ] `src/components/MusicApp.jsx` — strip YT code, wire to store/engine
- [ ] `src/components/Visualizer.jsx` — real analyser data with fake fallback
- [ ] `src/components/ControlCenter.jsx` — wire Skip button
- [ ] `vite.config.js` — register plugin, exclude .mp3 from compression
- [ ] Verify end-to-end in browser (playback both backends, window close, drop-in test, reload) + `npm run build`

## Review

(to be filled after implementation)
