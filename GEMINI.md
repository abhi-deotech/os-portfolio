# ♊ Lumina OS Portfolio - Project Context

Lumina OS is a sophisticated, interactive OS-style portfolio website built with **React 19** and **Vite**. It simulates a complete desktop environment in the browser, featuring draggable windows, a persistent virtual file system, a terminal with custom commands, and a suite of internal applications and games.

## 🏗️ System Architecture

The project follows a modular architecture centered around a unified state management layer.

- **State Management:** Powered by **Zustand** using a modular slice-based approach (`src/store/slices/`). State is persisted to `localStorage` using Zustand's persistence middleware.
- **UI & Layout:**
  - **Desktop:** The main shell (`src/components/Desktop.jsx`) manages icon placement and interaction.
  - **Window Manager:** A custom system (`src/components/Window.jsx` and `windowSlice.js`) handles window lifecycle (open, focus, minimize, maximize, close).
  - **Taskbar:** Provides application launching, window switching, and system controls.
- **Styling:** **Tailwind CSS 3.4** for styling, with a dynamic theming system based on CSS custom properties for accent colors and transparency effects.
- **Animations:** **Framer Motion** for all window transitions, desktop interactions, and UI feedback.
- **Rendering:** `WindowContentRenderer.jsx` utilizes `React.lazy()` and `Suspense` for efficient code-splitting and on-demand application loading.

## 🚀 Key Features

- **Virtual File System:** A hierarchical file system stored in Zustand and persisted locally. Supported by `FileExplorer` and `Terminal`.
- **Advanced Terminal:** Supports custom commands, themes, and includes a built-in **Vim emulator** for editing virtual files.
- **System Simulation:** Realistic boot sequence, BSOD triggers, and a performance monitoring system.
- **Interactive Apps:** Music player (with YouTube integration), Mail client, Browser, Guestbook (real-time tab sync), and a suite of games (Snake, 2048, etc.).
- **High Performance Gaming Mode:** Automatically activated when a Retro Arcade game is launched. It suspends heavy background processes including:
  - **Quantum Core Widget:** Disables the 3D Canvas/WebGL rendering.
  - **Presence Layer:** Suspends network-based cursor synchronization.
  - **System Metrics:** Pauses real-time performance polling to free up the main thread.
- **AI Integration:** Features `Lumina AI` and `Arcade AI` powered by Google Generative AI and Hugging Face Transformers.
- **Benchmark:** Off-thread performance testing using Web Workers.

## 🛠️ Building and Running

| Task | Command |
|------|---------|
| Install Dependencies | `npm install` |
| Development Server | `npm run dev` |
| Build for Production | `npm run build` |
| Lint Code | `npm run lint` |
| Preview Production Build | `npm run preview` |

## 📐 Development Conventions

- **State Management:** New global state should be added as a slice in `src/store/slices/` and integrated into `src/store/osStore.js`. Use granular selectors in components to optimize performance.
- **Component Structure:**
  - `src/components/apps/`: Main application components.
  - `src/components/common/`: Reusable UI primitives.
  - `src/components/games/`: Game-specific components.
- **Lazy Loading:** All new applications should be added to `WindowContentRenderer.jsx` using `React.lazy()` to maintain performance.
- **Styling:** Use Tailwind utility classes. For theme-dependent colors, use the `var(--os-primary-rgb)` and similar CSS variables.
- **Icons:** Use `lucide-react` icons wrapped in the `CustomIcon` component for consistent styling and glow effects.
- **File System:** Interact with the file system exclusively through the `fileSystemSlice` actions to ensure persistence and state integrity.

## 📁 Key File Map

| Path | Description |
|------|-------------|
| `src/App.jsx` | Main system entry point and core layout. |
| `src/store/osStore.js` | The root Zustand store. |
| `src/store/slices/` | Modular state logic (Windows, FS, System, etc.). |
| `src/components/Window.jsx` | The generic window wrapper component. |
| `src/components/Desktop.jsx` | The desktop grid and icon manager. |
| `src/components/WindowContentRenderer.jsx` | Logic for lazy-loading and rendering apps. |
| `ARCHITECTURE.md` | Detailed system documentation. |
| `TERMINAL.md` | Reference for all terminal commands. |
| `STYLING.md` | Documentation for the design system and theming. |
