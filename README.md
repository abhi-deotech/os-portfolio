# Lumina OS Portfolio

An interactive, OS-style portfolio website built with React. Experience a fully functional desktop environment with draggable windows, a terminal, games, media player, and more—all running in the browser.

## Quick Start

```bash
npm install
npm run dev
```

Default login password: `guest`

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + Vite |
| State Management | Zustand (persisted) |
| Styling | Tailwind CSS 3.4 |
| Animations | Framer Motion |
| Icons | Lucide React |

## Features

- **Desktop Environment**: Draggable icons, window management, context menus
- **Terminal**: 8 themes, virtual filesystem, package manager
- **Applications**: File Explorer, Music App, Browser, Settings, Task Manager
- **Games**: Snake, Memory Match, Trivia, 2048, Sudoku
- **Personalization**: 4 accent colors, live wallpapers, glassmorphism

## Project Structure

```
src/
├── App.jsx              # Main app component
├── store/osStore.js     # Zustand state management
├── hooks/               # Custom React hooks
├── components/          # UI components
│   ├── games/           # Game components
│   └── common/          # Shared components
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [TERMINAL.md](./TERMINAL.md) - Terminal commands reference
- [STYLING.md](./STYLING.md) - Theming system

## Deployment

```bash
npm run build
# Deploy dist/ folder to any static host
```

## Credits

Built by **Abhimanyu Saxena**

## License

MIT License
