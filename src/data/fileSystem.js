/**
 * Default virtual file system structure for Lumina OS.
 * Organized into folders with text files, media, and system files.
 */
export const DEFAULT_FILE_SYSTEM = [
  {
    id: 'root-documents',
    name: 'Documents',
    children: [
      { id: 'file-readme', name: 'README.md', type: 'text', content: '# Lumina OS Portfolio\n\nAn interactive, OS-style portfolio website built with React. Experience a fully functional desktop environment with draggable windows, a terminal, games, media player, and more—all running in the browser.\n\n## Quick Start\n\n```bash\nnpm install\nnpm run dev\n```\n\nDefault login password: `guest`\n\n## Tech Stack\n\n| Category | Technology |\n|----------|------------|\n| Framework | React 19 + Vite |\n| State Management | Zustand (persisted) |\n| Styling | Tailwind CSS 3.4 + Sarva Design Language |\n| Animations | Framer Motion |\n| Icons | Lucide React |\n\n## Features\n\n- **Desktop Environment**: Draggable icons, window management, context menus\n- **Terminal**: 8 themes, virtual filesystem, package manager\n- **Applications**: File Explorer, Music App, Browser, Settings, Task Manager\n- **Games**: Snake, Memory Match, Trivia, 2048, Sudoku\n- **Personalization**: 16 SDL colorways (light + dark), 5 icon themes, live wallpapers, glassmorphism\n\n## Project Structure\n\n```\nsrc/\n├── App.jsx              # Main app component\n├── store/osStore.js     # Zustand state management\n├── hooks/               # Custom React hooks\n├── components/          # UI components\n│   ├── games/           # Game components\n│   └── common/          # Shared components\n```\n\n## Documentation\n\n- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture\n- [TERMINAL.md](./TERMINAL.md) - Terminal commands reference\n- [STYLING.md](./STYLING.md) - Theming system\n\n## Deployment\n\n```bash\nnpm run build\n# Deploy dist/ folder to any static host\n```\n\n## Credits\n\nBuilt by **Abhimanyu Saxena**\n\n## License\n\nMIT License' },
      { id: 'file-architecture', name: 'ARCHITECTURE.md', type: 'text', content: '# Lumina OS Architecture\n\nThis document describes the system architecture, state management, and data flow of the Lumina OS\nportfolio application.\n\n## Overview\n\nLumina OS is a single-page application (SPA) that simulates a desktop operating system in the\nbrowser. It uses a centralized state management approach with Zustand and implements a windowing\nsystem, virtual file system, a role-based theme engine, and multiple interactive applications.\n\n## Architecture Diagram\n\n```\n┌─────────────────────────────────────────────────────────────┐\n│                         App.jsx                              │\n│  ┌─────────────────────────────────────────────────────────┐ │\n│  │                  Window Manager Layer                    │ │\n│  │              (Zustand: openWindows[])                    │ │\n│  ├─────────────────────────────────────────────────────────┤ │\n│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │ │\n│  │  │ Terminal │ │  Music   │ │ Settings │ │  Games   │   │ │\n│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │ │\n│  └─────────────────────────────────────────────────────────┘ │\n├─────────────────────────────────────────────────────────────┤\n│                    Zustand Store Layer                       │\n│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐ │\n│  │ Window State │ │  File System │ │   User Preferences  │ │\n│  └──────────────┘ └──────────────┘ └─────────────────────┘ │\n├─────────────────────────────────────────────────────────────┤\n│                     Theme Engine (src/theme/)                │\n│    registry (16 colorways) → cssVars → applyTheme → :root    │\n├─────────────────────────────────────────────────────────────┤\n│                   Persistence Layer                          │\n│        IndexedDB via idb-keyval  (+ localStorage mirror)     │\n└─────────────────────────────────────────────────────────────┘\n```\n\n## State Management\n\nThe application uses Zustand with persistence middleware, composed from slices in\n`src/store/slices/`. The store is assembled in `src/store/osStore.js`.\n\n### Window State\n\n```javascript\n{\n  openWindows: [\'terminal\', \'music\'],   // Array of open window IDs\n  activeWindow: \'terminal\',             // Currently focused window\n  minimizedWindows: [],\n  maximizedWindows: [],\n  snappedWindows: {},                   // id -> \'left\' | \'right\'\n  isControlCenterOpen: false,\n  isAppLauncherOpen: false,\n  isSpotlightOpen: false\n}\n```\n\nThe three satellite lists are only meaningful for a window that is currently open, and the persist\n`merge` hook prunes them against `openWindows` on every load. That invariant matters: `closeWindow`\nonce leaked into `maximizedWindows`, and because the dock hid itself whenever that list was\nnon-empty, maximizing a window once and closing it hid the dock permanently, across reloads.\n\n### User Preferences\n\n```javascript\n{\n  colorway: \'rose-dusk\',      // the single source of truth for theming (16 available)\n  density: \'comfortable\',     // \'comfortable\' | \'compact\'\n  reducedMotion: \'system\',    // \'system\' | \'on\' | \'off\'\n  iconTheme: \'harmonized\',    // harmonized | solid | mono | outline | lumina\n  wallpaper: \'linux-default\',\n  transparencyEffects: true,  // glassmorphism toggle\n  brightness: 100,            // screen brightness scrim (0-100)\n  accentIntensity: 80         // "Atmosphere": wash + motif + glow alpha (0-100)\n}\n```\n\nMode is **not** stored. SDL law 7 derives it from the colorway\'s temperature, so light and dark can\nnever disagree with the palette. See STYLING.md.\n\n## Persistence\n\nState persists to **IndexedDB** through `idb-keyval`, which is asynchronous — so React\'s first\nrender always uses defaults. That is harmless when every theme is dark and a full-screen white flash\nwhen it is not, so `applyTheme` additionally mirrors the resolved variable map into `localStorage`,\nand a small synchronous script in `index.html` stamps it before first paint.\n\nThe store is versioned; `migrate` in `osStore.js` upgrades older payloads.\n\n## Key Files\n\n| File | Purpose |\n|------|---------|\n| `src/store/osStore.js` | Store assembly, persistence, migrations |\n| `src/App.jsx` | Main application shell |\n| `src/components/Window.jsx` | Window container component |\n| `src/theme/registry.js` | The 16 colorways — single source of truth |\n| `src/theme/applyTheme.js` | The only module that writes theme state to the DOM |\n| `src/theme/icons.js` | App-icon themes (hue-preserving, contrast-verified) |\n| `src/config/apps.jsx` | Declarative app registry |\n| `src/hooks/useSystemMetrics.js` | Performance monitoring |\n| `src/hooks/useSoundEffects.js` | Audio feedback |\n\n## Extension Points\n\nTo add a new application:\n\n1. Create the component in `src/components/MyApp.jsx`\n2. Add a `case` in `src/components/WindowContentRenderer.jsx`\n3. Add an entry to `APPS` in `src/config/apps.jsx` — declare a `glyph` and an OKLCH `hue`, never a\n   literal colour; the icon themes derive the rest\n4. (Optional) Add a terminal command in `src/hooks/useTerminal.js`\n\nAn app declared in `APPS` with no matching `case` opens an empty window, so the two must be added\ntogether.' },
      { id: 'file-terminal', name: 'TERMINAL.md', type: 'text', content: '# Terminal Commands Reference\n\nThe Lumina OS terminal provides a simulated shell environment with file system navigation, system commands, and Easter eggs.\n\n## Basic Commands\n\n### help\nDisplays available commands list.\n```\n$ help\nAvailable commands:\n  help, clear, ls, cd, cat, neofetch, whoami, date, matrix\n  ssh, lumina-get, theme, man, lumina-ai\n```\n\n### clear\nClears the terminal screen and history.\n```\n$ clear\n[Terminal cleared]\n```\n\n### whoami\nShows current user identity.\n```\n$ whoami\nguest@lumina-os\n```\n\n### date\nDisplays current date and time.\n```\n$ date\nSat Mar 29 2025 12:30:00 GMT+0530 (India Standard Time)\n```\n\n## File System Commands\n\n### ls [directory]\nLists contents of current or specified directory.\n```\n$ ls\nProjects/  Documents/  Media/  sys/\n\n$ ls Projects/\nSystem.md  MERN-Dashboard.md  IoT-Controller.md  Benchmark.exe\n```\n\n### cd <directory>\nChanges current directory.\n```\n$ cd Projects\n~/Projects\n\n$ cd ..\n~\n\n$ cd ~\n~\n```\n\n### cat <filename>\nDisplays file contents.\n```\n$ cat System.md\n# Lumina OS\nVersion 1.0.0\n\nWelcome to my interactive portfolio OS...\n```\n\n## System Commands\n\n### neofetch\nDisplays system information in ASCII art style.\n```\n$ neofetch\nOS: Lumina Desktop v1.0.0\nKernel: 6.8.0-lumina-os\nUptime: 3 years, 2 months\nPackages: 1337 (npm)\nShell: zsh 5.9\nResolution: 2560x1440\nDE: Lumina\nWM: Framer-Motion\nTerminal: Lumina-Term\nCPU: M3 Max (8) @ 4.06GHz\nMemory: 64GB\n```\n\n## Package Manager\n\n### lumina-get install <package>\nAPT-style package manager for installing apps.\n\n**Available packages:**\n| Package | Unlocks | Description |\n|---------|---------|-------------|\n| `matrix-mode` | matrix command | Matrix rain Easter egg |\n| `task-monitor` | TaskManager | System monitoring app |\n| `cloud-sync` | Settings | Cloud settings sync |\n| `quantum-bench` | Benchmark | Performance testing |\n\n```\n$ lumina-get install matrix-mode\nReading package lists... Done\nBuilding dependency tree... Done\nDownloading matrix-mode... [100%]\nSetting up matrix-mode (v1.0.0)... Done\nApplication "matrix-mode" is now available in your launcher.\n```\n\n## Terminal Themes\n\n### theme [name]\nChanges terminal color scheme.\n\n**Available themes:**\n| Theme | Background | Text Colors |\n|-------|------------|-------------|\n| `default` | Dark gray | Purple/Cyan accents |\n| `dracula` | #282a36 | Purple/Green |\n| `solarized` | #002b36 | Blue/Green |\n| `monokai` | #272822 | Pink/Green |\n| `retro` | Black | Green monochrome |\n| `cyberpunk` | #050505 | Yellow/Magenta |\n| `matrix-glow` | #000d00 | Green glow |\n| `ocean` | #001b2b | Cyan/Teal |\n\n```\n$ theme dracula\nTheme changed to dracula.\n\n$ theme\nAvailable themes: default, dracula, solarized, monokai, retro, cyberpunk, matrix-glow, ocean\n```\n\n## Easter Eggs\n\n### matrix\nActivates Matrix mode (requires `matrix-mode` package).\n```\n$ lumina-get install matrix-mode\n$ matrix\nWake up, Neo...\n[Opens Matrix rain animation]\n```\n\n## Tips\n\n1. **Tab completion is not implemented** - type full command names\n2. **File names are case-insensitive** - `cat system.md` works\n3. **Paths use forward slashes** - consistent with Unix systems\n4. **Hidden files** - check `sys/secrets.txt` for hints\n5. **Konami code** - The secrets file hints at hidden features' },
      { id: 'file-styling', name: 'STYLING.md', type: 'text', content: '# Styling and Theming Guide\n\nLumina OS is themed by the **Sarva Design Language (SDL)** — a role-based system where components\nnever name a colour, only its *role*. Sixteen colorways (fifteen SDL, plus the preserved pre-SDL\n"Lumina Neon" pack) swap every role at once, and ten of the sixteen are light.\n\n## The role vocabulary\n\nColour lives in CSS custom properties on `documentElement`, written by exactly one module,\n`src/theme/applyTheme.js`.\n\n```css\n/* surfaces, back to front */\n--sdl-plane      /* the page itself — undertoned, never paper-default (law 1) */\n--sdl-surface    /* panels and cards sitting on the plane */\n--sdl-sunken     /* wells and insets */\n--sdl-chart      /* chart wells, which must demarcate (law 4) */\n\n/* ink */\n--sdl-ink        /* primary text */\n--sdl-sec        /* secondary text */\n--sdl-sunk-sec   /* secondary text on a sunken surface */\n\n/* accent — chrome speaks quietly (law 2) */\n--sdl-accent\n--sdl-soft       /* accent-tinted fill */\n--sdl-aink       /* accent-toned ink, lightened + desaturated before bolding (law 3) */\n--sdl-on-accent  /* ink that reads ON an accent fill */\n\n/* data — data speaks sharply (law 2) */\n--sdl-bar-a\n--sdl-bar-b\n\n/* status — completed is neutral grey, never green beside red (law 10) */\n--sdl-alert  --sdl-warn  --sdl-done\n```\n\nEvery colour role emits **two** variables: a hex (`--sdl-accent`) for gradients, shadows, SVG,\ncanvas and WebGL, and a space-separated RGB triple (`--sdl-accent-rgb`) for Tailwind\'s alpha syntax.\n\n### Why the triples are space-separated\n\nThis is load-bearing, not style. Tailwind emits `rgb(var(--sdl-accent-rgb) / <alpha-value>)`. With a\n**comma** triple that resolves to `rgb(204, 151, 255 / 1)`, which matches neither the legacy nor the\nmodern `rgb()` grammar — so the browser drops the declaration and the class renders transparent.\n\nThat was a real bug in this codebase: 778 token call sites rendered invisible, including\n`.bg-os-primary` with no opacity modifier at all. It is why the app once carried 925 white/black\nliterals and 327 hardcoded hexes — they were *compensation* for a token layer that silently did\nnothing.\n\nConsequence: hand-written CSS must use the **slash** form, `rgb(var(--sdl-accent-rgb) / .3)`. The\nlegacy `rgba(var(--x), .3)` form only works with comma triples and is invalid everywhere now. The\ntwo forms cannot coexist on one variable.\n\n## Usage\n\n```jsx\n/* Tailwind classes — the normal path */\n<div className="bg-sdl-surface text-sdl-ink" />\n<div className="bg-sdl-accent/20 border border-hairline/10" />\n<span className="text-sdl-alert">Delete</span>\n\n/* CSS variables — for gradients, shadows, canvas and inline styles */\n<div style={{ background: \'var(--sdl-soft)\', borderRadius: \'var(--sdl-radius)\' }} />\n```\n\n### Mode-aware helpers\n\n`--sdl-veil` and `--sdl-hairline` invert with the mode: white over a dark plane, the colorway\'s own\n**ink** over a light one. So `bg-veil/5` lifts in dark mode and deepens in light with no branching.\n`bg-scrim` is the modal backdrop — black at 55% in dark, ink at 28% in light.\n\n## Modes, density and motion\n\nMode is **derived**, never stored: SDL law 7 says temperature decides it, so a warm or earthy\ncolorway lives light and a cool or deep one lives dark. `applyTheme` stamps the result as\n`data-mode` on the root, alongside `data-theme`, `data-colorway`, `data-grammar`, `data-density`,\n`data-glass` and `data-motion`. `src/theme/grammar.css` keys off those attributes.\n\n## Brightness and atmosphere\n\nBrightness is a fixed `body::after` scrim driven by `--os-dim`, **not** a CSS `filter`. A filter on\nthe app root makes that element a containing block for every `position: fixed` descendant — the\ntaskbar, control centre, spotlight and toasts all broke. A scrim has no such side effect, composites\nmore cheaply, and also covers the boot and login screens.\n\nThe "Atmosphere" slider drives `--sdl-atmo`, which multiplies wash alpha, motif opacity and glow\nalpha together — law 8\'s "atmosphere is whisper-quiet" on one control.\n\n## Best practices\n\n1. **Reach for a role, never a hex.** If no role fits, the missing thing is a role, not a literal.\n2. **Use the slash form** for alpha in hand-written CSS: `rgb(var(--sdl-x-rgb) / .3)`.\n3. **Status colour carries meaning** — `sdl-alert` / `sdl-warn` / `sdl-done`, not stock red/green.\n4. **Content is exempt.** Brand logos, third-party palettes and gamification badges keep their own\n   colour; see `scripts/denylist.mjs`, which records the reason for each exemption.\n5. **Only `applyTheme.js` writes theme state to the DOM.** Everything else reads.\n\nSDL is authored by **Aditya Sarva**. Settings > Design Language documents it live, with measurements\ncomputed from the running theme rather than transcribed.' },
      { id: 'file-resume', name: 'Resume.pdf', type: 'pdf', url: '/Abhimanyu.pdf' },
      { id: 'file-cover', name: 'CoverLetter.docx', type: 'text', content: 'Dear Hiring Manager,\n\nI am writing to express my interest in the Software Engineer position. With my experience in full-stack development and team leadership, I believe I would be a valuable addition to your team.\n\nBest regards,\nAbhimanyu Saxena' },
      {
        id: 'folder-private',
        name: 'Private',
        type: 'folder',
        children: [
          { id: 'file-journal', name: 'Journal.txt', type: 'text', content: '2024-03-28: Today I finally finished the window manager for Lumina OS. It was a challenge to get the z-index management right, but Framer Motion made the animations a breeze.\n\n2024-03-29: Added the terminal system. It feels so satisfying to type "ls" and see the virtual filesystem react.' },
          { id: 'file-ideas', name: 'Project_Ideas.md', type: 'text', content: '# Future Project Ideas\n\n- AI-driven code architect\n- Decentalized social graph\n- Real-time collaborative IDE\n- Neural-link interface simulation' },
          { id: 'file-passwords', name: 'passwords.txt', type: 'text', content: 'Nice try! I don\'t keep real passwords in a public portfolio. But the password to this OS was "guest" anyway.' },
        ]
      },
    ]
  },
  {
    id: 'root-projects',
    name: 'Projects',
    type: 'folder',
    children: [
      { id: 'file-lumina-os', name: 'Lumina-OS.md', type: 'text', content: '# Lumina OS\nInteractive portfolio operating system simulation.' },
      { id: 'file-workleisure', name: 'WorkLeisure.md', type: 'text', content: '# WorkLeisure\nBooking and membership platform for restaurants that double as workspaces.\nExpress/MongoDB API with Socket.IO, a React 18 portal serving six user roles, and a Flutter mobile wrapper.\n\nLive: https://www.workleisure.in' },
      { id: 'file-tribecart', name: 'TribeCart.md', type: 'text', content: '# TribeCart\npnpm/Turbo monorepo: three Next.js apps (customer, seller, admin) over five Go microservices talking gRPC through shared protobuf contracts.\n\nSource: https://github.com/abhi-deotech/TribeCart' },
      { id: 'project-benchmark', name: 'Benchmark.exe', type: 'executable', content: 'Quantum Benchmarking Tool' },
    ]
  },
  {
    id: 'root-downloads',
    name: 'Downloads',
    children: [
      { id: 'download-lumina-src', name: 'lumina-os-source.zip', type: 'archive', content: 'Lumina OS Source Code Archive' },
      { id: 'download-demo-video', name: 'portfolio-demo.mp4', type: 'video', url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-loop-with-glowing-lines-41130-large.mp4' },
      { id: 'download-wallpaper', name: 'lumina-wallpaper.jpg', type: 'image', url: '/src/assets/hero.png' },
    ]
  },
  {
    id: 'root-desktop',
    name: 'Desktop',
    children: [
      { id: 'desktop-shortcut-about', name: 'About Me.url', type: 'shortcut', content: 'Shortcut to About Me application' },
      { id: 'desktop-shortcut-terminal', name: 'Terminal.url', type: 'shortcut', content: 'Shortcut to Terminal application' },
      { id: 'desktop-shortcut-settings', name: 'Settings.url', type: 'shortcut', content: 'Shortcut to Settings application' },
    ]
  },
  {
    id: 'root-pictures',
    name: 'Pictures',
    children: [
      { id: 'pic-hero', name: 'Hero_Shot.jpg', type: 'image', url: '/src/assets/hero.png' },
      { id: 'pic-wallpaper-1', name: 'sunset-glow.jpg', type: 'image', url: '/src/assets/hero.png' },
      { id: 'pic-wallpaper-2', name: 'cyber-grid.jpg', type: 'image', url: '/src/assets/hero.png' },
    ]
  },
  {
    id: 'root-music',
    name: 'Music',
    children: [
      { id: 'music-ambient', name: 'Ambient_Vibe.mp3', type: 'audio', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
      { id: 'music-electronic', name: 'Cyber_Wave.mp3', type: 'audio', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    ]
  },
  {
    id: 'root-videos',
    name: 'Videos',
    children: [
      { id: 'video-portfolio', name: 'Portfolio_Demo.mp4', type: 'video', url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-loop-with-glowing-lines-41130-large.mp4' },
      { id: 'video-tutorial', name: 'OS_Tutorial.mp4', type: 'video', url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-loop-with-glowing-lines-41130-large.mp4' },
    ]
  },
  {
    id: 'root-program-files',
    name: 'Program Files',
    children: [
      {
        id: 'pf-lumina-os',
        name: 'Lumina OS',
        children: [
          { id: 'pf-os-executable', name: 'lumina-os.exe', type: 'executable', content: 'Lumina OS Main Executable v1.0.0' },
          { id: 'pf-os-config', name: 'config.json', type: 'text', content: '{\n  "version": "1.0.0",\n  "theme": "purple",\n  "wallpaper": "linux-default",\n  "transparency": true\n}' },
          { id: 'pf-os-manifest', name: 'manifest.json', type: 'text', content: '{\n  "name": "Lumina OS",\n  "version": "1.0.0",\n  "description": "Interactive Portfolio OS",\n  "author": "Abhimanyu Saxena"\n}' },
        ]
      },
      {
        id: 'pf-games',
        name: 'Games',
        children: [
          { id: 'pf-snake-exe', name: 'snake.exe', type: 'executable', content: 'Snake Game Executable' },
          { id: 'pf-memory-exe', name: 'memory.exe', type: 'executable', content: 'Memory Game Executable' },
          { id: 'pf-trivia-exe', name: 'trivia.exe', type: 'executable', content: 'Trivia Game Executable' },
        ]
      },
      {
        id: 'pf-utilities',
        name: 'Utilities',
        children: [
          { id: 'pf-terminal-exe', name: 'terminal.exe', type: 'executable', content: 'Terminal Application' },
          { id: 'pf-file-explorer-exe', name: 'explorer.exe', type: 'executable', content: 'File Explorer Application' },
          { id: 'pf-settings-exe', name: 'settings.exe', type: 'executable', content: 'Settings Application' },
        ]
      },
    ]
  },
  {
    id: 'root-system',
    name: 'System',
    children: [
      { id: 'sys-kernel', name: 'kernel.log', type: 'text', content: '[INFO] Lumina Kernel v1.0.0 starting...\n[OK] Neural Link established.\n[OK] Quantum Particles initialized.\n[OK] Desktop Environment loaded\n[OK] Window System initialized\n[WARNING] Unauthorized SSH attempt detected from 127.0.0.1\n[INFO] All systems operational' },
      { id: 'sys-boot', name: 'boot.log', type: 'text', content: '[0.000000] Linux version 6.8.0-lumina (build@os-portfolio) (gcc 12.3.0)\n[0.000000] Command line: initrd=\\initramfs-linux.img root=PARTUUID=os-root-123 rw\n[0.124512] x86/fpu: Supporting XSAVE feature 0x001: \'x87 floating point registers\'\n[1.542100] usb 1-1: New USB device found, idVendor=046d, idProduct=c52b\n[2.891200] EXT4-fs (vda2): mounted filesystem with ordered data mode.\n[3.210041] systemd[1]: Reached target Graphical Interface.' },
      { id: 'sys-registry', name: 'registry.sys', type: 'text', content: 'Lumina OS Registry\n===================\n\n[HKEY_CURRENT_USER\\Software\\LuminaOS]\n"Theme"="purple"\n"Wallpaper"="linux-default"\n"Transparency"=dword:00000001\n\n[HKEY_LOCAL_MACHINE\\System\\CurrentControlSet]\n"KernelVersion"="1.0.0"\n"BootTime"="2024-01-15 10:30:00"\n"Uptime"=dword:01234567' },
      { id: 'sys-audit', name: 'security.audit', type: 'text', content: '=== LUMINA SECURITY AUDIT ===\nDATE: 2024-03-29\nSTATUS: SECURE\n\nVulnerabilities detected: 0\nActive firewalls: 3 (Neural, Quantum, Packet)\nEncryption: AES-256-GCM\nIdentity: Verified Guest Session' },
      { id: 'sys-secrets', name: 'secrets.txt', type: 'text', content: 'Lumina OS Secrets\n================\n\nThe Konami code unlocked more than just a game.\nTry "matrix" after installing the package.\n\nEaster eggs:\n- Type "neofetch" in terminal\n- Try installing hackertools\n- Double-click the desktop rapidly\n- Hold Shift while opening apps\n- Use "magic" command in terminal' },
      { id: 'sys-config', name: 'system.ini', type: 'text', content: '[system]\nkernel_version=1.0.0\ndebug_mode=false\nboot_animation=true\n\n[display]\nresolution=2560x1440\nrefresh_rate=60\ndpi_scale=1.0\n\n[audio]\nenabled=true\nvolume=0.7\necho_cancellation=true' },
      { id: 'sys-env', name: 'environment.sh', type: 'text', content: 'export PATH=$PATH:/usr/local/bin:/opt/lumina/bin\nexport EDITOR=notepad\nexport THEME=purple\nexport USER=guest\nexport HOST=lumina-os' },
      {
        id: 'sys-drivers', name: 'drivers', type: 'folder', children: [
          { id: 'driver-display', name: 'display.sys', type: 'text', content: 'Display Driver v2.1.0\nGPU: Virtual Renderer\nResolution: Adaptive\nRefresh Rate: 60Hz' },
          { id: 'driver-audio', name: 'audio.sys', type: 'text', content: 'Audio Driver v1.5.2\nDevice: Virtual Audio Controller\nSample Rate: 48kHz\nChannels: Stereo' },
          { id: 'driver-network', name: 'network.sys', type: 'text', content: 'Network Driver v3.0.1\nInterface: Virtual Ethernet\nStatus: Connected\nSpeed: 1 Gbps' },
        ]
      },
    ]
  },
  {
    id: 'root-temp',
    name: 'Temp',
    children: [
      { id: 'temp-cache', name: 'cache.tmp', type: 'text', content: 'Temporary cache file\nCreated: ' + new Date().toISOString() + '\nSize: 1.2 MB' },
      { id: 'temp-log', name: 'install.log', type: 'text', content: 'Installation Log\n================\n\n[2024-01-15 10:30:00] Starting installation...\n[2024-01-15 10:30:15] Extracting files...\n[2024-01-15 10:30:45] Installing components...\n[2024-01-15 10:31:00] Configuration complete...\n[2024-01-15 10:31:15] Installation successful!' },
    ]
  },
];
