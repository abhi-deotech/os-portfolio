import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Default virtual file system structure.
 * Organized into folders with text files, media, and system files.
 *
 * @constant {Array<Object>}
 */
const DEFAULT_FILE_SYSTEM = [
  {
    id: 'root-documents',
    name: 'Documents',
    children: [
      { id: 'file-readme', name: 'README.md', type: 'text', content: '# Lumina OS Portfolio\n\nAn interactive, OS-style portfolio website built with React. Experience a fully functional desktop environment with draggable windows, a terminal, games, media player, and more—all running in the browser.\n\n## Quick Start\n\n```bash\nnpm install\nnpm run dev\n```\n\nDefault login password: `guest`\n\n## Tech Stack\n\n| Category | Technology |\n|----------|------------|\n| Framework | React 19 + Vite |\n| State Management | Zustand (persisted) |\n| Styling | Tailwind CSS 3.4 |\n| Animations | Framer Motion |\n| Icons | Lucide React |\n\n## Features\n\n- **Desktop Environment**: Draggable icons, window management, context menus\n- **Terminal**: 8 themes, virtual filesystem, package manager\n- **Applications**: File Explorer, Music App, Browser, Settings, Task Manager\n- **Games**: Snake, Memory Match, Trivia, 2048, Sudoku\n- **Personalization**: 4 accent colors, live wallpapers, glassmorphism\n\n## Project Structure\n\n```\nsrc/\n├── App.jsx              # Main app component\n├── store/osStore.js     # Zustand state management\n├── hooks/               # Custom React hooks\n├── components/          # UI components\n│   ├── games/           # Game components\n│   └── common/          # Shared components\n```\n\n## Documentation\n\n- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture\n- [TERMINAL.md](./TERMINAL.md) - Terminal commands reference\n- [STYLING.md](./STYLING.md) - Theming system\n\n## Deployment\n\n```bash\nnpm run build\n# Deploy dist/ folder to any static host\n```\n\n## Credits\n\nBuilt by **Abhimanyu Saxena**\n\n## License\n\nMIT License' },
      { id: 'file-architecture', name: 'ARCHITECTURE.md', type: 'text', content: '# Lumina OS Architecture\n\nThis document describes the system architecture, state management, and data flow of the Lumina OS portfolio application.\n\n## Overview\n\nLumina OS is a single-page application (SPA) that simulates a desktop operating system in the browser. It uses a centralized state management approach with Zustand and implements a windowing system, virtual file system, and multiple interactive applications.\n\n## Architecture Diagram\n\n```\n┌─────────────────────────────────────────────────────────────┐\n│                         App.jsx                              │\n│  ┌─────────────────────────────────────────────────────────┐ │\n│  │                  Window Manager Layer                    │ │\n│  │              (Zustand: openWindows[])                  │ │\n│  ├─────────────────────────────────────────────────────────┤ │\n│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │ │\n│  │  │ Terminal │ │  Music   │ │ Settings│ │  Games  │   │ │\n│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │ │\n│  └─────────────────────────────────────────────────────────┘ │\n├─────────────────────────────────────────────────────────────┤\n│                    Zustand Store Layer                       │\n│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐ │\n│  │ Window State │ │  File System │ │   User Preferences  │ │\n│  └──────────────┘ └──────────────┘ └─────────────────────┘ │\n├─────────────────────────────────────────────────────────────┤\n│                   Persistence Layer                          │\n│              localStorage (via Zustand)                      │\n└─────────────────────────────────────────────────────────────┘\n```\n\n## State Management\n\n### Zustand Store Structure\n\nThe application uses Zustand with persistence middleware. The store is defined in `src/store/osStore.js`.\n\n#### Window State\n\n```javascript\n{\n  openWindows: [\'terminal\', \'music\'],     // Array of open window IDs\n  activeWindow: \'terminal\',                 // Currently focused window\n  isControlCenterOpen: false,             // Control center visibility\n  isAppLauncherOpen: false,               // App launcher visibility\n  isSpotlightOpen: false                  // Spotlight search visibility\n}\n```\n\n#### User Preferences\n\n```javascript\n{\n  activeAccent: \'purple\',                 // \'purple\' | \'cyan\' | \'magenta\' | \'green\'\n  wallpaper: \'sunset-glow\',               // Wallpaper ID\n  transparencyEffects: true,              // Glassmorphism toggle\n  brightness: 100,                        // Screen brightness (0-100)\n  accentIntensity: 80                     // Accent color intensity (0-100)\n}\n```\n\n## Key Files\n\n| File | Purpose |\n|------|---------|\n| `src/store/osStore.js` | Central state management |\n| `src/App.jsx` | Main application shell |\n| `src/components/Window.jsx` | Window container component |\n| `src/hooks/useSystemMetrics.js` | Performance monitoring |\n| `src/hooks/useSoundEffects.js` | Audio feedback |\n\n## Extension Points\n\nTo add a new application:\n\n1. Create component in `src/components/MyApp.jsx`\n2. Add window rendering case in `App.jsx`\n3. Add icon to `desktopIcons` array in `App.jsx`\n4. (Optional) Add terminal command in `Terminal.jsx`' },
      { id: 'file-terminal', name: 'TERMINAL.md', type: 'text', content: '# Terminal Commands Reference\n\nThe Lumina OS terminal provides a simulated shell environment with file system navigation, system commands, and Easter eggs.\n\n## Basic Commands\n\n### help\nDisplays available commands list.\n```\n$ help\nAvailable commands:\n  help, clear, ls, cd, cat, neofetch, whoami, date, matrix\n  ssh, lumina-get, theme, man, lumina-ai\n```\n\n### clear\nClears the terminal screen and history.\n```\n$ clear\n[Terminal cleared]\n```\n\n### whoami\nShows current user identity.\n```\n$ whoami\nguest@lumina-os\n```\n\n### date\nDisplays current date and time.\n```\n$ date\nSat Mar 29 2025 12:30:00 GMT+0530 (India Standard Time)\n```\n\n## File System Commands\n\n### ls [directory]\nLists contents of current or specified directory.\n```\n$ ls\nProjects/  Documents/  Media/  sys/\n\n$ ls Projects/\nSystem.md  MERN-Dashboard.md  IoT-Controller.md  Benchmark.exe\n```\n\n### cd <directory>\nChanges current directory.\n```\n$ cd Projects\n~/Projects\n\n$ cd ..\n~\n\n$ cd ~\n~\n```\n\n### cat <filename>\nDisplays file contents.\n```\n$ cat System.md\n# Lumina OS\nVersion 1.0.0\n\nWelcome to my interactive portfolio OS...\n```\n\n## System Commands\n\n### neofetch\nDisplays system information in ASCII art style.\n```\n$ neofetch\nOS: Lumina Desktop v1.0.0\nKernel: 6.8.0-lumina-os\nUptime: 3 years, 2 months\nPackages: 1337 (npm)\nShell: zsh 5.9\nResolution: 2560x1440\nDE: Lumina\nWM: Framer-Motion\nTerminal: Lumina-Term\nCPU: M3 Max (8) @ 4.06GHz\nMemory: 64GB\n```\n\n## Package Manager\n\n### lumina-get install <package>\nAPT-style package manager for installing apps.\n\n**Available packages:**\n| Package | Unlocks | Description |\n|---------|---------|-------------|\n| `matrix-mode` | matrix command | Matrix rain Easter egg |\n| `task-monitor` | TaskManager | System monitoring app |\n| `cloud-sync` | Settings | Cloud settings sync |\n| `quantum-bench` | Benchmark | Performance testing |\n\n```\n$ lumina-get install matrix-mode\nReading package lists... Done\nBuilding dependency tree... Done\nDownloading matrix-mode... [100%]\nSetting up matrix-mode (v1.0.0)... Done\nApplication "matrix-mode" is now available in your launcher.\n```\n\n## Terminal Themes\n\n### theme [name]\nChanges terminal color scheme.\n\n**Available themes:**\n| Theme | Background | Text Colors |\n|-------|------------|-------------|\n| `default` | Dark gray | Purple/Cyan accents |\n| `dracula` | #282a36 | Purple/Green |\n| `solarized` | #002b36 | Blue/Green |\n| `monokai` | #272822 | Pink/Green |\n| `retro` | Black | Green monochrome |\n| `cyberpunk` | #050505 | Yellow/Magenta |\n| `matrix-glow` | #000d00 | Green glow |\n| `ocean` | #001b2b | Cyan/Teal |\n\n```\n$ theme dracula\nTheme changed to dracula.\n\n$ theme\nAvailable themes: default, dracula, solarized, monokai, retro, cyberpunk, matrix-glow, ocean\n```\n\n## Easter Eggs\n\n### matrix\nActivates Matrix mode (requires `matrix-mode` package).\n```\n$ lumina-get install matrix-mode\n$ matrix\nWake up, Neo...\n[Opens Matrix rain animation]\n```\n\n## Tips\n\n1. **Tab completion is not implemented** - type full command names\n2. **File names are case-insensitive** - `cat system.md` works\n3. **Paths use forward slashes** - consistent with Unix systems\n4. **Hidden files** - check `sys/secrets.txt` for hints\n5. **Konami code** - The secrets file hints at hidden features' },
      { id: 'file-styling', name: 'STYLING.md', type: 'text', content: '# Styling and Theming Guide\n\nLumina OS uses a comprehensive theming system built on CSS custom properties and Tailwind CSS.\n\n## Color System\n\n### CSS Custom Properties\n\nThe OS uses RGB format for colors to enable opacity support via `rgba()`:\n\n```css\n:root {\n  /* Primary accent colors (RGB for alpha support) */\n  --os-primary-rgb: 204, 151, 255;    /* Purple - main accent */\n  --os-secondary-rgb: 0, 210, 253;    /* Cyan - secondary accent */\n  --os-tertiary-rgb: 0, 245, 160;     /* Green - tertiary accent */\n  \n  /* Utility colors */\n  --blue-500-rgb: 59, 130, 246;\n  --red-500-rgb: 239, 68, 68;\n  --yellow-500-rgb: 234, 179, 8;\n  \n  /* Surfaces */\n  --os-background: #060e20;\n  --os-surface: #060e20;\n  --os-surface-container-low: #091328;\n  --os-surface-container-high: #141f38;\n  --os-surface-container-highest: #192540;\n  \n  /* Text colors */\n  --os-on-surface: #dee5ff;\n  --os-on-surface-variant: #a3aac4;\n  --os-outline-rgb: 109, 117, 140;\n  \n  /* Dimmed accent variants */\n  --os-primary-dim: #9c48ea;\n  --os-secondary-dim: #00c3eb;\n  \n  /* Background gradient */\n  --desktop-gradient: radial-gradient(circle at 50% -20%, #1a103c 0%, #060e20 60%, #030712 100%);\n}\n```\n\n### Accent Color Schemes\n\nThe application supports 4 accent color presets:\n\n| Theme | Primary | Secondary | Tertiary |\n|-------|---------|-----------|----------|\n| `purple` (default) | `204, 151, 255` | `0, 210, 253` | `0, 245, 160` |\n| `cyan` | `0, 210, 253` | `204, 151, 255` | `255, 104, 240` |\n| `magenta` | `255, 104, 240` | `204, 151, 255` | `0, 210, 253` |\n| `green` | `0, 245, 160` | `0, 210, 253` | `204, 151, 255` |\n\n## Tailwind Configuration\n\n### Custom Colors\n\nThe Tailwind config extends the default theme with OS-specific colors:\n\n```javascript\n// tailwind.config.js\ncolors: {\n  os: {\n    background: "var(--os-background)",\n    surface: "var(--os-surface)",\n    surfaceContainerLow: "var(--os-surface-container-low)",\n    surfaceContainerHigh: "var(--os-surface-container-high)",\n    surfaceContainerHighest: "var(--os-surface-container-highest)",\n    \n    // RGB colors support opacity via / modifier\n    primary: "rgb(var(--os-primary-rgb) / <alpha-value>)",\n    secondary: "rgb(var(--os-secondary-rgb) / <alpha-value>)",\n    tertiary: "rgb(var(--os-tertiary-rgb) / <alpha-value>)",\n    \n    // Dimmer variants\n    primaryDim: "var(--os-primary-dim)",\n    secondaryDim: "var(--os-secondary-dim)",\n    \n    // Text colors\n    onSurface: "var(--os-on-surface)",\n    onSurfaceVariant: "var(--os-on-surface-variant)",\n    outline: "rgb(var(--os-outline-rgb) / <alpha-value>)",\n  }\n}\n```\n\n## Usage Examples\n\n### Basic Colors\n\n```jsx\n// Solid colors\n<div className="text-os-primary">Primary text</div>\n<div className="bg-os-surface">Surface background</div>\n\n// With opacity (using Tailwind\'s / modifier)\n<div className="bg-os-primary/20">20% opacity primary</div>\n<div className="text-os-secondary/80">80% opacity secondary text</div>\n<div className="border-os-outline/50">50% opacity border</div>\n```\n\n### Dynamic Theming\n\n```jsx\n// App.jsx injects CSS variables based on active accent\n<div style={{\n  \'--os-primary-rgb\': currentAccent.primary,\n  \'--os-secondary-rgb\': currentAccent.secondary,\n  \'--os-tertiary-rgb\': currentAccent.tertiary,\n  \'--os-accent-intensity\': accentIntensity / 100,\n  filter: `brightness(${brightness}%)`,\n}}>\n```\n\n## Best Practices\n\n1. **Always use RGB format** for colors that need opacity support\n2. **Use Tailwind\'s `/` modifier** for opacity: `bg-os-primary/20`\n3. **Prefer utility classes** over inline styles for consistency\n4. **Use CSS variables** for values that change dynamically (themes)\n5. **Use `backdrop-blur`** sparingly - it impacts performance' },
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
          { id: 'pf-os-config', name: 'config.json', type: 'text', content: '{\n  "version": "1.0.0",\n  "theme": "purple",\n  "wallpaper": "sunset-glow",\n  "transparency": true\n}' },
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
      { id: 'sys-registry', name: 'registry.sys', type: 'text', content: 'Lumina OS Registry\n===================\n\n[HKEY_CURRENT_USER\\Software\\LuminaOS]\n"Theme"="purple"\n"Wallpaper"="sunset-glow"\n"Transparency"=dword:00000001\n\n[HKEY_LOCAL_MACHINE\\System\\CurrentControlSet]\n"KernelVersion"="1.0.0"\n"BootTime"="2024-01-15 10:30:00"\n"Uptime"=dword:01234567' },
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

const useOSStore = create(
  persist(
    /**
     * Zustand store for Lumina OS state management.
     * Provides centralized state for windows, file system, preferences, and more.
     * Uses persist middleware to save state to localStorage.
     *
     * State Categories:
     * - Window Management: openWindows, activeWindow, control/app launcher states
     * - User Preferences: accent color, wallpaper, transparency, brightness
     * - File System: Virtual file tree with CRUD operations
     * - Desktop: Icon positions, drag state
     * - Music Player: Playback state, current track, volume
     * - Terminal: Command history, theme, installed packages
     * - Achievements: Unlocked badges, notification queue
     * - System: Metrics override, widgets visibility
     *
     * @param {Function} set - Zustand set function for updating state
     * @param {Function} get - Zustand get function for reading state
     * @returns {Object} Store state and action methods
     */
    (set, get) => ({
      openWindows: [],
      activeWindow: null,
      isControlCenterOpen: false,
      isAppLauncherOpen: false,
      activeAccent: 'purple',
      wallpaper: 'sunset-glow',
      transparencyEffects: true,
      brightness: 100,
      accentIntensity: 80,
      isDragging: false,
      isAuthenticated: false,
      userRole: 'admin', // 'admin' | 'guest'
      isSpotlightOpen: false,
      isBSOD: false,
      achievements: [],
      achievementQueue: [],
      terminalTheme: 'default',
      installedApps: [],
      recentFiles: [],
      activeNotepadFile: null,
      activeDocFile: null,
      activeMediaFile: null,
      activePhotoFile: null,
      activeMusicFile: null,
      activeRetroGame: null,
      setRetroGame: (game) => set({ activeRetroGame: game }),
      terminalHistory: [
        { type: 'input', text: 'neofetch' },
        { type: 'output', text: 'OS: Lumina Desktop v1.0.0\nKernel: 6.8.0-lumina-os\nUptime: 3 years, 2 months\nPackages: 1337 (npm)\nShell: zsh 5.9\nResolution: 2560x1440\nDE: Lumina\nWM: Framer-Motion\nTerminal: Lumina-Term\nCPU: M3 Max (8) @ 4.06GHz\nMemory: 64GB' }
      ],

      // Desktop Widgets
      widgets: {
        weather: true,
        system: true,
        notes: true
      },
      toggleWidget: (name) => set((state) => ({
        widgets: { ...state.widgets, [name]: !state.widgets[name] }
      })),

      // System Metrics
      systemMetrics: {
        cpu: 12,
        ram: 4.2,
        temp: 42,
        power: 15,
        isOverridden: false
      },
      updateMetrics: (newMetrics) => set((state) => ({
        systemMetrics: { ...state.systemMetrics, ...newMetrics }
      })),

      // Music Player State
      music: {
        isPlaying: false,
        currentTrack: {
          id: 'metro-niagara',
          youtubeId: 'v9l4yv3w-0w',
          title: 'Niagara Falls (Foot or 2)',
          artist: 'Metro Boomin, Travis Scott, 21 Savage',
          album: 'HEROES & VILLAINS',
          cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/v9l4yv3w-0w/hqdefault.jpg',
          duration: 207
        },
        volume: 0.7,
        currentTime: 0,
        likedSongs: [], // Track IDs of liked songs
        activeView: 'Home' // Current UI view (Home, Library, etc)
      },
      setMusicIsPlaying: (isPlaying) => set((state) => ({
        music: { ...state.music, isPlaying }
      })),
      setMusicTrack: (track) => set((state) => ({
        music: { ...state.music, currentTrack: track, currentTime: 0, isPlaying: true }
      })),
      syncMusicTrack: (track) => set((state) => ({
        music: { ...state.music, currentTrack: { ...state.music.currentTrack, ...track } }
      })),
      setMusicCurrentTime: (currentTime) => set((state) => ({
        music: { ...state.music, currentTime }
      })),
      toggleLikeSong: (trackId) => set((state) => {
        const likedSongs = state.music.likedSongs || [];
        const isLiked = likedSongs.includes(trackId);
        const newLikedSongs = isLiked 
          ? likedSongs.filter(id => id !== trackId)
          : [...likedSongs, trackId];
        return {
          music: { ...state.music, likedSongs: newLikedSongs }
        };
      }),
      setMusicView: (view) => set((state) => ({
        music: { ...state.music, activeView: view }
      })),

      // Sticky Notes
      notes: 'Welcome to Lumina OS!\n- Explore the apps\n- Check the terminal\n- Have fun!',
      setNotes: (content) => set({ notes: content }),

      // Icon positions: { [iconId]: { x, y } }
      iconPositions: {},
      setIconPosition: (id, position) =>
        set((state) => ({
          iconPositions: { ...state.iconPositions, [id]: position },
        })),
      resetIconPositions: () => set({ iconPositions: {} }),

      // Virtual file system
      fileSystem: DEFAULT_FILE_SYSTEM,
      setFileSystem: (tree) => set({ fileSystem: tree }),
      createFolder: (name, parentId = null) =>
        set((state) => {
          const newFolder = { id: `folder-${Date.now()}`, name, children: [] };
          if (!parentId) return { fileSystem: [...state.fileSystem, newFolder] };
          
          const addToParent = (nodes) =>
            nodes.map((n) => {
              if (n.id === parentId) return { ...n, children: [...(n.children || []), newFolder] };
              if (n.children) return { ...n, children: addToParent(n.children) };
              return n;
            });
          return { fileSystem: addToParent(state.fileSystem) };
        }),

      createFile: (name, content = '', parentId = null) =>
        set((state) => {
          const newFile = { id: `file-${Date.now()}`, name, content };
          if (!parentId) return { fileSystem: [...state.fileSystem, newFile] };
          
          const addToParent = (nodes) =>
            nodes.map((n) => {
              if (n.id === parentId) return { ...n, children: [...(n.children || []), newFile] };
              if (n.children) return { ...n, children: addToParent(n.children) };
              return n;
            });
          return { fileSystem: addToParent(state.fileSystem) };
        }),

      moveNode: (id, parentId, index = 0) =>
        set((state) => {
          let movedNode = null;
          
          // 1. Remove node from its current position
          const removeFromTree = (nodes) => {
            const filtered = [];
            for (const node of nodes) {
              if (node.id === id) {
                movedNode = node;
                continue;
              }
              if (node.children) {
                filtered.push({ ...node, children: removeFromTree(node.children) });
              } else {
                filtered.push(node);
              }
            }
            return filtered;
          };

          const treeWithoutNode = removeFromTree(state.fileSystem);
          if (!movedNode) return state;

          // 2. Add node to its new position
          const addToTree = (nodes) => {
            // Adding to root
            if (!parentId) {
              const newRoot = [...nodes];
              newRoot.splice(index, 0, movedNode);
              return newRoot;
            }

            return nodes.map((node) => {
              if (node.id === parentId) {
                const newChildren = [...(node.children || [])];
                newChildren.splice(index, 0, movedNode);
                return { ...node, children: newChildren };
              }
              if (node.children) {
                return { ...node, children: addToTree(node.children) };
              }
              return node;
            });
          };

          return { fileSystem: addToTree(treeWithoutNode) };
        }),
      deleteNode: (id) =>
        set((state) => {
          const removeNode = (nodes) =>
            nodes
              .filter((n) => n.id !== id)
              .map((n) => ({
                ...n,
                children: n.children ? removeNode(n.children) : undefined,
              }));
          return { fileSystem: removeNode(state.fileSystem) };
        }),
      renameNode: (id, newName) =>
        set((state) => {
          const renameInTree = (nodes) =>
            nodes.map((n) => {
              if (n.id === id) return { ...n, name: newName };
              if (n.children) return { ...n, children: renameInTree(n.children) };
              return n;
            });
          return { fileSystem: renameInTree(state.fileSystem) };
        }),

      updateFileContent: (fileId, content) =>
        set((state) => {
          const updateInTree = (nodes) =>
            nodes.map((n) => {
              if (n.id === fileId) return { ...n, content };
              if (n.children) return { ...n, children: updateInTree(n.children) };
              return n;
            });
          return { fileSystem: updateInTree(state.fileSystem) };
        }),

      openNotepad: (fileId) =>
        set((state) => {
          const windows = state.openWindows.includes('notepad')
            ? state.openWindows
            : [...state.openWindows, 'notepad'];
          return {
            openWindows: windows,
            activeWindow: 'notepad',
            activeNotepadFile: fileId,
            isAppLauncherOpen: false,
            isControlCenterOpen: false,
          };
        }),

      toggleSpotlight: (isOpen) =>
        set((state) => ({
          isSpotlightOpen: isOpen !== undefined ? isOpen : !state.isSpotlightOpen,
        })),

      triggerBSOD: () => set({ isBSOD: true }),

      openWindow: (id, fileId = null) =>
        set((state) => {
          const windows = state.openWindows.includes(id)
            ? state.openWindows
            : [...state.openWindows, id];
          
          const newState = {
            openWindows: windows,
            activeWindow: id,
            isControlCenterOpen: false,
            isAppLauncherOpen: false,
          };

          // If a fileId is provided, track it for the specific app
          if (fileId) {
            if (id === 'notepad') newState.activeNotepadFile = fileId;
            if (id === 'documentation') newState.activeDocFile = fileId;
            if (id === 'media') newState.activeMediaFile = fileId;
            if (id === 'photos') newState.activePhotoFile = fileId;
            if (id === 'mail') newState.activeMailId = fileId;
            if (id === 'music') {
              // Opening music might need more logic but let's just track the ID for now
              newState.activeMusicFile = fileId;
            }
            // Track in recent files
            state.trackRecentFile(fileId);
          }

          return newState;
        }),

      trackRecentFile: (fileId) => 
        set((state) => {
          const filtered = (state.recentFiles || []).filter(id => id !== fileId);
          return { recentFiles: [fileId, ...filtered].slice(0, 10) };
        }),

      closeWindow: (id) =>
        set((state) => ({
          openWindows: state.openWindows.filter((w) => w !== id),
          activeWindow: state.activeWindow === id ? null : state.activeWindow,
        })),

      focusWindow: (id) =>
        set({ activeWindow: id, isControlCenterOpen: false, isAppLauncherOpen: false }),

      toggleControlCenter: () =>
        set((state) => ({
          isControlCenterOpen: !state.isControlCenterOpen,
          isAppLauncherOpen: false,
        })),

      toggleAppLauncher: () =>
        set((state) => ({
          isAppLauncherOpen: !state.isAppLauncherOpen,
          isControlCenterOpen: false,
        })),

      setActiveAccent: (accent) => set({ activeAccent: accent }),
      setWallpaper: (wp) => set({ wallpaper: wp }),
      setTransparencyEffects: (enabled) => set({ transparencyEffects: enabled }),
      setBrightness: (value) => set({ brightness: value }),
      setMusicVolume: (value) => set((state) => ({
        music: { ...state.music, volume: value }
      })),
      setAccentIntensity: (value) => set({ accentIntensity: value }),

      resetSettingsToDefault: () => set({
        wallpaper: 'sunset-glow',
        activeAccent: 'purple',
        transparencyEffects: true,
        brightness: 100,
        accentIntensity: 80,
      }),

      resetFileSystem: () => set({ fileSystem: DEFAULT_FILE_SYSTEM }),

      // Documentation sync state
      isSyncing: false,
      lastSyncTime: null,
      syncError: null,
      setIsSyncing: (isSyncing) => set({ isSyncing }),
      setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
      setSyncError: (syncError) => set({ syncError }),

      syncDocumentation: (files) =>
        set((state) => {
          const updateFileContent = (nodes) =>
            nodes.map((n) => {
              if (n.children) {
                return { ...n, children: updateFileContent(n.children) };
              }
              // Check if this file should be updated
              const fileToUpdate = files.find(f => f.id === n.id);
              if (fileToUpdate) {
                return { ...n, content: fileToUpdate.content };
              }
              return n;
            });

          return {
            fileSystem: updateFileContent(state.fileSystem),
            lastSyncTime: Date.now(),
            syncError: null
          };
        }),

      addTerminalEntry: (entry) =>
        set((state) => ({
          terminalHistory: [...state.terminalHistory, entry],
        })),

      setTerminalTheme: (theme) => set({ terminalTheme: theme }),

      terminalCommandCount: 0,
      incrementCommandCount: () => set((state) => ({ terminalCommandCount: state.terminalCommandCount + 1 })),

      installApp: (appId) =>
        set((state) => ({
          installedApps: [...state.installedApps, appId],
        })),

      clearTerminalHistory: () => set({ terminalHistory: [] }),

      unlockAchievement: (achievementId) =>
        set((state) => {
          if (state.achievements.includes(achievementId)) return state;
          return { 
            achievements: [...state.achievements, achievementId],
            achievementQueue: [...state.achievementQueue, achievementId]
          };
        }),

      removeAchievementToast: (achievementId) =>
        set((state) => ({
          achievementQueue: state.achievementQueue.filter(id => id !== achievementId)
        })),

      setIsDragging: (isDragging) => set({ isDragging }),

      login: (role = 'admin') => set({ isAuthenticated: true, userRole: role }),
      logout: () => set({ 
        isAuthenticated: false, 
        openWindows: [], 
        activeWindow: null, 
        isControlCenterOpen: false, 
        isAppLauncherOpen: false, 
        isSpotlightOpen: false, 
        isDragging: false,
        achievementQueue: [],
        userRole: 'admin' 
      }),

      // Filtered filesystem for UI
      getFilteredFileSystem: () => {
        const state = get();
        if (state.userRole === 'admin') return state.fileSystem;
        // Guest mode: Hide sensitive folders or files if needed
        return state.fileSystem.map(node => {
          if (node.name === 'Documents') {
            return { ...node, children: node.children.filter(c => !c.name.includes('Resume')) };
          }
          return node;
        });
      },

      // Helper to find a node by ID recursively
      findNodeById: (id, nodes = null) => {
        const state = get();
        const tree = nodes || state.fileSystem;
        for (const node of tree) {
          if (node.id === id) return node;
          if (node.children) {
            const found = state.findNodeById(id, node.children);
            if (found) return found;
          }
        }
        return null;
      },

      // Helper to get the full path to a node
      getPathFromId: (id) => {
        const state = get();
        const findPath = (targetId, nodes, path = []) => {
          for (const node of nodes) {
            const currentPath = [...path, node.name];
            if (node.id === targetId) return currentPath;
            if (node.children) {
              const subPath = findPath(targetId, node.children, currentPath);
              if (subPath) return subPath;
            }
          }
          return null;
        };
        return findPath(id, state.fileSystem);
      },

      // Global search for files
      searchFiles: (query) => {
        if (!query || query.length < 2) return [];
        const state = get();
        const results = [];
        const search = (nodes, path = []) => {
          nodes.forEach(node => {
            const currentPath = [...path, node.name];
            if (node.name.toLowerCase().includes(query.toLowerCase())) {
              results.push({ ...node, path: currentPath });
            }
            if (node.children) search(node.children, currentPath);
          });
        };
        search(state.fileSystem);
        return results;
      }
    }),
    {
      name: 'os-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeAccent: state.activeAccent,
        wallpaper: state.wallpaper,
        transparencyEffects: state.transparencyEffects,
        brightness: state.brightness,
        accentIntensity: state.accentIntensity,
        terminalHistory: state.terminalHistory,
        openWindows: state.openWindows,
        activeWindow: state.activeWindow,
        iconPositions: state.iconPositions,
        fileSystem: state.fileSystem,
        widgets: state.widgets,
        notes: state.notes,
        music: state.music,
        isAuthenticated: state.isAuthenticated,
        userRole: state.userRole,
        activeNotepadFile: state.activeNotepadFile,
        activeDocFile: state.activeDocFile,
        activeMediaFile: state.activeMediaFile,
        activePhotoFile: state.activePhotoFile,
        activeMusicFile: state.activeMusicFile,
        recentFiles: state.recentFiles,
        terminalTheme: state.terminalTheme,
        installedApps: state.installedApps,
        achievements: state.achievements,
        systemMetrics: state.systemMetrics,
        lastSyncTime: state.lastSyncTime,
        syncError: state.syncError,
        achievementQueue: [] // Don't persist queue
      }),
    }
  )
);

export default useOSStore;
