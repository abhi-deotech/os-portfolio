# Lumina OS Portfolio

An interactive, OS-style portfolio built with React — a desktop environment in the browser with a
window manager, a filesystem-backed terminal, a local AI model, a real GPU benchmark, and a games
library you can add to without touching the code.

```bash
npm install
npm run dev
```

Default login password: `guest`. Requires Node ≥ 22.12.

## Tech stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + Vite 8 |
| State | Zustand 5, persisted to IndexedDB (`idb-keyval`), versioned with migrations |
| Styling | Tailwind CSS 3.4 + Sarva Design Language |
| Animation | Framer Motion |
| Icons | Lucide React |
| Off-thread | Web Workers, WebGPU compute, WebContainer |

## Features

**Desktop** — draggable icons with persisted positions, window snapping (drag-to-edge and
`Alt`+arrows), minimize/maximize/restore, focus and z-ordering, a dock with running-app indicators,
Spotlight search across apps, files and games, context menus, and a Task Manager whose "kill" on a
system process triggers a real BSOD.

**Terminal** — 23 commands over the live virtual filesystem, tab completion, persistent history,
8 colour themes, an APT-style package manager that genuinely unlocks apps, and a `vim` that is a
read-only joke about how to exit vim. `node` and `npm` boot a real WebContainer.
See [TERMINAL.md](./TERMINAL.md).

**19 apps** — File Explorer, Terminal, AI Chat, Settings, About, Projects, Mail, Game Center,
Media, Music, Photos, Benchmark, Browser, Guestbook, Retro Arcade, Notepad, Task Manager,
Achievements, Documentation.

**Games** — 9 built-in (Snake, 2048, Memory Match, Trivia, Sudoku, Breakout, Minesweeper, Tower
Stack, and DOOM via an EmulatorJS-backed shareware WAD), 3 vendored HTML5 games, and **visitor
sideloading**: drop a self-contained `.html` file in and it runs in a sandboxed iframe with no
same-origin access, scored through a `postMessage` API.

**Theming** — 16 colorways across 6 themes, 5 icon themes, 10 wallpapers. Colour is computed in
**OKLCH**, and icon themes walk lightness until measured WCAG contrast clears 3:1/4.5:1 rather than
asserting it. Light/dark is *derived* from each colorway's temperature, never stored separately, so
the two can't disagree. A "Surprise Me" randomiser picks from curated looks and filters generated
combinations through the same contrast and wallpaper-fit measurements.
See [STYLING.md](./STYLING.md).

**Achievements** — 21 unlockables spanning system use, terminal mastery, games and exploration.

## What's real, and what isn't

A desktop simulation invites the question, so here is the boundary — drawn honestly.

**Real:**
- **GPU benchmark** — a WGSL compute shader running a 512×512 matrix multiply, reporting measured
  GFLOPS. Real arithmetic on your GPU.
- **CPU benchmark** — a self-clocking pool of Web Workers across your actual core count.
- **Local AI** — `Xenova/all-MiniLM-L6-v2` via transformers.js in a Worker, with real WebGPU
  detection and ONNX WASM thread tuning. It reports which backend it landed on rather than
  claiming one.
- **AI Chat** — Google Gemini, with model fallback and backoff.
- **Node.js** — WebContainer boots a genuine WASM-compiled Node runtime in the tab.
- **GitHub contributions** — fetched from the GraphQL API at *build* time, refreshed weekly by CI,
  and guarded by `profile:check`, which SSR-renders the widget and asserts it against the
  recorded data so it can't render something false.
- **Filesystem** — creating files in the Terminal, Notepad or File Explorer mutates one shared
  tree that persists. You can also mount a **real folder from your disk** via the File System
  Access API.
- **Game sandboxing** — sideloaded games get `allow-scripts` without `allow-same-origin`, verified
  to leave them on an opaque origin.

**Simulated, deliberately:**
- **System metrics** (CPU/RAM in the dashboard and widgets) are generated, not measured — browsers
  don't expose per-process telemetry.
- **The music visualizer** draws a modelled spectrum. Playback runs through a cross-origin YouTube
  iframe, and `AnalyserNode` cannot tap cross-origin audio — the trade was a real spectrum over a
  few self-hosted files, or a streaming library with a plausible stand-in. See the note in
  `src/components/Visualizer.jsx`.
- **Mail** composes and "sends" against a mock inbox; no message leaves the browser.
- **The Guestbook** syncs across your own tabs via `localStorage`, not across visitors.
- **`ssh`, `neofetch`, `ps`** are flavour text over local state.

## Project structure

```
src/
├── App.jsx                  # Shell, boot/login gating, desktop context menu
├── store/
│   ├── osStore.js           # Store assembly, IndexedDB persistence, migrations
│   └── slices/              # auth, fileSystem, window, music, system, ai, games, …
├── theme/                   # SDL: registry (16 colorways), oklch, icons, wallpapers,
│                            #   randomize, applyTheme (sole DOM writer)
├── components/
│   ├── games/               # Game implementations + shared GameShell
│   ├── widgets/             # Desktop widgets
│   ├── sdl/                 # Live design-language showcase
│   └── common/              # Shared primitives
├── hooks/                   # useTerminal, useSystemMetrics, useSoundEffects, …
├── workers/                 # aiWorker, benchmark.worker, gpuBench (WebGPU)
├── config/                  # apps, games, achievements, profile — declarative registries
└── data/                    # Seed filesystem, GitHub snapshot, media catalogues
```

## Developer tooling

Beyond `dev` / `build` / `lint`:

| Script | Purpose |
|--------|---------|
| `npm run census` | Counts every colour-bearing construct in `src/` — a design-token migration meter |
| `npm run token-lint` | One-directional ratchet; fails if a file adds untokenized colour beyond its recorded allowance |
| `npm run sdl:check` | Diffs vendored SDL tokens against upstream, role by role |
| `npm run profile:check` | SSR-renders the GitHub widget and asserts it matches recorded data |
| `npm run github:sync` | Bakes the contribution snapshot at build time |
| `npm run games:sync` | Validates game manifests; fails the build on an invalid one |
| `npm run shots` | Drives headless Chrome over raw CDP for screenshots |

CI runs lint + build on every push, CodeQL weekly, and refreshes the GitHub snapshot on a schedule.

## Configuration

Every key in [.env.example](./.env.example) is optional — the app builds and runs without any of
them. Each one moves a feature from its fallback state to its full state.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — state, windowing, persistence, data flow
- [TERMINAL.md](./TERMINAL.md) — full command reference
- [STYLING.md](./STYLING.md) — the SDL role vocabulary and theming rules

## Deployment

```bash
npm run build
```

Deploy `dist/` to any static host. Set `GH_SYNC_TOKEN` in the host's environment to keep the
contribution graph fresh; without it the build still succeeds and carries the previous snapshot
forward.

## Credits

Built by **Abhimanyu Saxena**. The Sarva Design Language is authored by **Aditya Sarva**; Settings
› Design Language documents it live, with measurements computed from the running theme.

## License

MIT
