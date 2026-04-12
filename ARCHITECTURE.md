# Lumina OS Architecture

This document describes the system architecture, state management, and data flow of the Lumina OS portfolio application.

## Overview

Lumina OS is a single-page application (SPA) that simulates a desktop operating system in the browser. It uses a centralized state management approach with Zustand and implements a windowing system, virtual file system, and multiple interactive applications.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  Window Manager Layer                    │ │
│  │              (Zustand: openWindows[])                  │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │ │
│  │  │ Terminal │ │  Music   │ │ Settings│ │  Games  │   │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Zustand Store Layer                       │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐ │
│  │ Window State │ │  File System │ │   User Preferences  │ │
│  └──────────────┘ └──────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   Persistence Layer                          │
│              localStorage (via Zustand)                      │
└─────────────────────────────────────────────────────────────┘
```

## State Management

### Zustand Store Structure

The application uses Zustand with persistence middleware. The store is defined in `src/store/osStore.js`.

#### Window State

```javascript
{
  openWindows: ['terminal', 'music'],     // Array of open window IDs
  activeWindow: 'terminal',                 // Currently focused window
  isControlCenterOpen: false,             // Control center visibility
  isAppLauncherOpen: false,               // App launcher visibility
  isSpotlightOpen: false,                 // Spotlight search visibility
  isBSOD: false                           // System crash state
}
```

#### User Preferences

```javascript
{
  activeAccent: 'purple',                 // 'purple' | 'cyan' | 'magenta' | 'green'
  wallpaper: 'sunset-glow',               // Wallpaper ID
  transparencyEffects: true,              // Glassmorphism toggle
  brightness: 100,                        // Screen brightness (0-100)
  accentIntensity: 80                     // Accent color intensity (0-100)
}
```

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

The store uses Zustand's `persist` middleware with `localStorage`. The following state is persisted:

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
├── LiveWallpaper (background layer)
├── Widgets & SystemDashboard
│   └── Clock, Social, and Metrics widgets
├── Desktop Icons Layer
│   └── Draggable icon components
├── Windows Layer
│   └── Window components (conditionally rendered)
│       ├── MailApp (Neural Mail)
│       ├── LuminaChat (Guestbook)
│       ├── Benchmark (Stress Tester)
│       ├── Terminal (with Vim trap)
│       └── ... (other apps)
├── Taskbar (bottom dock)
├── ControlCenter (flyout panel)
├── AppLauncher (flyout grid)
├── Spotlight (search overlay)
└── Screensaver
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
4. Change persists to localStorage
5. UI re-renders with new file structure
```

### Theme Changes

```
1. User selects accent color in Settings
2. setActiveAccent('cyan') called
3. CSS custom property --os-primary-rgb updated
4. All components using the theme re-render
5. Color changes propagated throughout UI
```

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

1. **State Selectors**: Components use granular selectors to minimize re-renders
2. **Memoization**: Hardware info in useSystemMetrics is memoized
3. **Lazy Evaluation**: Achievement checks only run on relevant actions
4. **Animation Optimization**: Framer Motion uses GPU-accelerated transforms
5. **Local Storage**: Debounced persistence via Zustand middleware

## Key Files

| File | Purpose |
|------|---------|
| `src/store/osStore.js` | Central state management |
| `src/App.jsx` | Main application shell |
| `src/components/Window.jsx` | Window container component |
| `src/hooks/useSystemMetrics.js` | Performance monitoring |
| `src/hooks/useSoundEffects.js` | Audio feedback |

## Extension Points

To add a new application:

1. Create component in `src/components/MyApp.jsx`
2. Add window rendering case in `App.jsx`:
   ```jsx
   {openWindows.includes('myapp') && (
     <Window key="myapp" id="myapp" title="My App">
       <MyApp />
     </Window>
   )}
   ```
3. Add icon to `desktopIcons` array in `App.jsx`
4. (Optional) Add terminal command in `Terminal.jsx`
