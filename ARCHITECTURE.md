# Lumina OS Architecture

This document describes the system architecture, state management, and data flow of the Lumina OS portfolio application.

## Overview

Lumina OS is a single-page application (SPA) that simulates a desktop operating system in the browser. It uses a centralized state management approach with Zustand, a modular layout system (Desktop/Taskbar), and implements a windowing system, virtual file system, and multiple interactive applications.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                     Desktop.jsx                         │ │
│  │  ┌───────────────────────────────────────────────────┐  │ │
│  │  │              Window Manager Layer                 │  │ │
│  │  │            (Zustand: openWindows[])               │  │ │
│  │  ├───────────────────────────────────────────────────┤  │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │ │
│  │  │  │ Terminal │ │  Games   │ │  ...     │           │  │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘           │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  │                     Taskbar.jsx                         │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Zustand Store Layer                       │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐ │
│  │ Window State │ │  File System │ │   User Preferences  │ │
│  └──────────────┘ └──────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Worker Layer (Off-thread)                  │
│     Benchmark pool · WebGPU compute · transformers.js AI     │
├─────────────────────────────────────────────────────────────┤
│                   Theme Engine (src/theme/)                  │
│    registry (16 colorways) → cssVars → applyTheme → :root    │
├─────────────────────────────────────────────────────────────┤
│                   Persistence Layer                          │
│        IndexedDB via idb-keyval  (+ localStorage mirror)     │
└─────────────────────────────────────────────────────────────┘
```

## State Management

### Zustand Store Structure

The application uses Zustand with persistence middleware. The store is defined in `src/store/osStore.js`.

#### Window State

```javascript
{
  openWindows: ['terminal', 'music'],     // Array of open window IDs
  activeWindow: 'terminal',               // Currently focused window
  minimizedWindows: [],
  maximizedWindows: [],
  snappedWindows: {},                     // id -> 'left' | 'right'
  isControlCenterOpen: false,             // Control center visibility
  isAppLauncherOpen: false,               // App launcher visibility
  isSpotlightOpen: false,                 // Spotlight search visibility
  isBSOD: false                           // System crash state
}
```

The three satellite lists are only meaningful for a window that is currently open, and the persist
`merge` hook prunes them against `openWindows` on every load. That invariant matters: `closeWindow`
once leaked into `maximizedWindows`, and because the dock hid itself whenever that list was
non-empty, maximizing a window once and closing it hid the dock permanently, across reloads.

#### User Preferences

```javascript
{
  colorway: 'rose-dusk',      // the single source of truth for theming (16 available)
  density: 'comfortable',     // 'comfortable' | 'compact'
  reducedMotion: 'system',    // 'system' | 'on' | 'off'
  iconTheme: 'harmonized',    // harmonized | solid | mono | outline | lumina
  wallpaper: 'linux-default',
  transparencyEffects: true,  // glassmorphism toggle
  brightness: 100,            // screen brightness scrim (0-100)
  accentIntensity: 80         // "Atmosphere": wash + motif + glow alpha (0-100)
}
```

Mode is **not** stored. SDL law 7 derives it from the colorway's temperature, so light and dark can
never disagree with the palette. See [STYLING.md](./STYLING.md).

#### Desktop State

```javascript
{
  iconPositions: {                        // Draggable icon positions
    'terminal': { x: 40, y: 40 },
    'music': { x: 160, y: 40 }
  },
  isDragging: false                       // Global drag state
}
```

#### Virtual File System

```javascript
{
  fileSystem: [
    {
      id: 'root-projects',
      name: 'Projects',
      children: [
        { id: 'file-os', name: 'System.md', type: 'text', content: '...' }
      ]
    }
  ]
}
```

#### Music Player State

```javascript
{
  music: {
    isPlaying: false,
    currentTrack: { id, title, artist, cover, youtubeId, duration },
    volume: 0.7,
    currentTime: 0,
    likedSongs: [],
    activeView: 'Home'
  }
}
```

#### Terminal State

```javascript
{
  terminalHistory: [
    { type: 'input', text: 'neofetch' },
    { type: 'output', text: 'OS: Lumina Desktop...' }
  ],
  terminalTheme: 'default',               // Terminal color theme
  installedApps: []                       // Apps installed via lumina-get
}
```

#### Achievements

```javascript
{
  achievements: ['first_login', 'terminal_wiz'],  // Unlocked achievements
  achievementQueue: []                          // Pending toast notifications
}
```

### Persistence Strategy

State persists to **IndexedDB** through `idb-keyval`, which is asynchronous — so React's first
render always uses defaults. That is harmless when every theme is dark and a full-screen white
flash when it is not, so `applyTheme` additionally mirrors the resolved variable map into
`localStorage`, and a small synchronous script in `index.html` stamps it before first paint.

The store is versioned; `migrate` in `osStore.js` upgrades older payloads. The following state is
persisted:

**Persisted:**
- User preferences (theme, colors, transparency)
- Window state (which windows are open)
- Desktop icon positions
- File system changes
- Terminal history
- Music player preferences
- Unlocked achievements

**Not Persisted:**
- Achievement queue (transient notifications)
- Current playback time (resets on reload)
- System metrics (real-time data)

## Window System

### Window Component

The `Window.jsx` component provides:
- Drag functionality (via Framer Motion `dragControls`)
- Maximize/minimize with snap-to-maximize
- Active/inactive styling
- Mobile-responsive behavior (fullscreen on mobile)
- Title bar with traffic light buttons (close, minimize, maximize)

### Window Lifecycle

1. **Open**: User clicks icon or types command → `openWindow(id)` → Window added to `openWindows`
2. **Focus**: Click on window → `focusWindow(id)` → `activeWindow` updated
3. **Close**: Click X button → `closeWindow(id)` → Window removed from `openWindows`
4. **Maximize**: Double-click title bar or drag to top → Window fills viewport

### Window Positioning

Desktop windows are centered by default with fixed sizes. Mobile windows are always maximized.

## Deep Simulation Features

### Boot Sequence & BSOD
The system implements a realistic **Boot Sequence** that validates system components before login. A fatal system crash (**BSOD**) can be triggered by killing critical processes like `kernel` or `window-server` in the Task Manager, necessitating a cold reboot.

### Terminal & Vim Emulator
The terminal includes a **Vim emulator** trap. When a user runs `vim <filename>`, the terminal enters a modal editing state. Persistence is achieved through the `:wq` command, which updates the Zustand file system store.

### Tab-Synchronization (LuminaChat)
The **Global Guestbook (LuminaChat)** uses a hybrid synchronization strategy:
1. **localStorage**: Persistent storage for message history.
2. **Window Storage Event**: A global event listener that triggers a re-render across all open browser tabs whenever a new message is posted, simulating a real-time network broadcast.

## Component Hierarchy

```
App.jsx
├── BootSequence (pre-auth)
├── BSOD (crash layer)
├── LoginScreen (auth gate)
├── Desktop (Main OS Shell)
│   ├── LiveWallpaper (background layer)
│   ├── Widgets & SystemDashboard
│   │   └── Clock, Social, and Metrics widgets
│   ├── Desktop Icons Layer
│   │   └── Draggable icon components
│   └── Windows Layer
│       └── WindowContentRenderer (Lazy Loading)
│           ├── WindowContainer
│           │   ├── MailApp (Lazy)
│           │   ├── LuminaChat (Lazy)
│           │   ├── Benchmark (Web Worker)
│           │   ├── Terminal
│           │   └── ...
└── Taskbar (bottom dock)
    ├── ControlCenter (flyout panel)
    ├── AppLauncher (flyout grid)
    ├── Spotlight (search overlay)
```

## Data Flow

### Opening an Application

```
1. User clicks desktop icon
2. onDoubleClick handler calls openWindow('appId')
3. Zustand store adds 'appId' to openWindows array
4. App.jsx renders <Window id="appId"> with the app component
5. Framer Motion animates window entrance
```

### File System Operations

```
1. User interacts in FileExplorer or Terminal
2. Component calls store method (createFolder, deleteNode, etc.)
3. Zustand updates fileSystem state
4. Change persists to IndexedDB (via idb-keyval)
5. UI re-renders with new file structure
```

### Theme Changes

```
1. User selects a colorway in Settings
2. setColorway('jewel-night') called
3. registry.js resolves the colorway to a full role map (OKLCH, contrast-verified)
4. applyTheme() — the only module that writes theme state to the DOM — stamps every
   --sdl-* variable plus data-mode / data-colorway / data-density / data-motion on :root
5. Every component reads through those roles, so the whole UI re-skins at once
```

Mode is derived from the colorway, never selected independently — see [STYLING.md](./STYLING.md).

## Authentication Flow

```
1. Initial load: Check isAuthenticated in store
2. If false: Render LoginScreen
3. User enters 'guest' password
4. login() action sets isAuthenticated = true
5. unlockAchievement('first_login') triggered
6. App renders full desktop environment
```

## Idle Detection & Screensaver

```
1. useEffect sets up mousemove/keydown listeners
2. 2-minute timer starts on activity
3. If timer expires: setIsIdle(true)
4. Screensaver component overlays desktop
5. Any activity resets timer and hides screensaver
```

## Performance Optimizations

1. **Code Splitting & Lazy Loading**: Heavy components (Games, Mail, AI Chat) are loaded on-demand using `React.lazy()` and `Suspense`, reducing the initial bundle size by ~170KB.
2. **Web Workers**: Computationally intensive tasks like the Benchmark engine are offloaded to Background Workers to keep the UI thread responsive.
3. **State Selectors**: Components use granular selectors to minimize re-renders.
4. **Asset Optimization**: Game previews and large images are optimized and lazily loaded.
5. **Animation Optimization**: Framer Motion uses GPU-accelerated transforms.
6. **Local Storage**: Debounced persistence via Zustand middleware.

## Key Files

| File | Purpose |
|------|---------|
| `src/store/osStore.js` | Central state management |
| `src/App.jsx` | Main system entry point |
| `src/components/Desktop.jsx` | Core OS shell & window manager |
| `src/components/Window.jsx` | Window container component |
| `src/hooks/useSystemMetrics.js` | Performance monitoring |
| `src/hooks/useSoundEffects.js` | Audio feedback |

## Extension Points

To add a new application:

1. Create component in `src/components/apps/MyApp.jsx`
2. Update `src/components/WindowContentRenderer.jsx` to include the app:
   - Add a `React.lazy()` import for the component.
   - Add a case in the renderer switch/mapping.
3. Add icon metadata to `desktopIcons` in `src/store/osStore.js`.
4. (Optional) Add terminal command in `Terminal.jsx`.

### Games

Games do **not** follow the steps above — they are data, not a `case`. Adding one used to mean
editing seven files across five disagreeing lists (the launcher, the window renderer, `apps.jsx`,
Spotlight, Task Manager, and two separate achievement tables), which is why the section rotted.

There are three ways in, in increasing order of trust:

| Kind | Where it lives | How it runs |
|---|---|---|
| **Builtin** | a React component in `src/components/games/` | in-process, wrapped in `GameShell` |
| **Folder** | `public/games/<slug>/` + `game.json` | sandboxed iframe, `src=` |
| **Sideload** | dropped in by a visitor, stored in IndexedDB | sandboxed iframe, `srcdoc=` |

For a builtin: add one object to `BUILTIN_GAMES` in `src/config/games.js` and one line to
`GAME_MODULES`. Everything else — the launcher tile, the dock, Spotlight, Task Manager, the window
title and size, the how-to-play card — derives from that entry. Build the game on `GameShell` plus
`useGameLoop` / `useGameInput` / `useGameAudio` / `useHighScore`, which supply the loop, DOM-scoped
input, sound and persistence. Never bind `keydown` on `window`: minimized windows stay mounted, so
a window-level listener makes a hidden game eat every key in the OS.

For a folder game, see `public/games/README.md`. Run `npm run games:sync` (wired into `npm run
build`) to validate the manifests and regenerate the index.

Both iframe kinds run with `sandbox="allow-scripts"` and no `allow-same-origin`, so the document
has an opaque security origin and cannot reach `localStorage`, `indexedDB` or `parent`. Verified
by measurement, not assumption — see the note at the top of `SandboxedGame.jsx`.
