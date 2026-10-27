import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
  MousePointer2, FolderPlus, RefreshCw, Cpu, X, RotateCcw, Hash,
  User, Image as Wallpaper, Shuffle, SquareTerminal as TerminalSquare, FolderOpen, LayoutDashboard
} from 'lucide-react';
import MenuRow from './components/common/MenuRow';
import {
  Menu,
  Separator,
  useContextMenu,
} from 'react-contexify';
import 'react-contexify/ReactContexify.css';
import { AnimatePresence, MotionConfig } from 'framer-motion';

import WindowSlot from './components/WindowSlot';
import ControlCenter from './components/ControlCenter';
import LiveWallpaper from './components/LiveWallpaper';
import Widgets from './components/Widgets';
import LoginScreen from './components/LoginScreen';
import Spotlight from './components/Spotlight';
import AchievementToast from './components/AchievementToast';
import Screensaver from './components/Screensaver';
import BootSequence from './components/BootSequence';
import BSOD from './components/BSOD';
import Desktop from './components/Desktop';
import MenuBar from './components/MenuBar';
import Taskbar from './components/Taskbar';

import useOSStore from './store/osStore';
import { APPEARANCE_RESET_DIALOG } from './config/dialogs';
import { osConfirm } from './utils/dialog';
import { applyTheme } from './theme/applyTheme';
import './theme/grammar.css';
import { useIsMobile } from './hooks/useMediaQuery';
import { useIdleDetection } from './hooks/useIdleDetection';
import { useImmersiveSync } from './hooks/useImmersive';
import useWallpaperMode, { enterWallpaperMode } from './hooks/useWallpaperMode';
import { IDLE_MS } from './utils/idle.js';
import { onPopoutActivity } from './utils/popout.js';
import './index.css';

// Context menu IDs for desktop and icon menus
const DESKTOP_MENU_ID = 'desktop-context-menu';
const ICON_MENU_ID = 'icon-context-menu';

/**
 * Wallpaper mode is its own lazy chunk: the entry only carries the URL check that decides whether to
 * render it (src/wallpaper/config.js), never the dashboard.
 */
const WallpaperMode = React.lazy(() => import('./components/wallpaper/WallpaperMode'));

// The accent map now lives in src/theme/applyTheme.js — it was previously duplicated in five places
// with three different encodings (here, Settings.jsx, Window.jsx, QuantumWidget.jsx, puterSlice.js).

/**
 * Main application component for Lumina OS.
 * Manages the desktop environment, window system, taskbar, and global state.
 *
 * Features:
 * - Desktop with draggable icons
 * - Multi-window system with various applications
 * - Taskbar with app launcher and control center
 * - Idle detection and screensaver
 * - Context menus for desktop and icons
 * - Spotlight search (Ctrl/Cmd + K)
 *
 * @component
 */
function App() {
  const openWindows = useOSStore(state => state.openWindows);
  const minimizedWindows = useOSStore(state => state.minimizedWindows);
  const openWindow = useOSStore(state => state.openWindow);
  const closeWindow = useOSStore(state => state.closeWindow);
  const resetIconPositions = useOSStore(state => state.resetIconPositions);
  const createFolder = useOSStore(state => state.createFolder);
  const isAuthenticated = useOSStore(state => state.isAuthenticated);
  const toggleSpotlight = useOSStore(state => state.toggleSpotlight);
  const achievementQueue = useOSStore(state => state.achievementQueue);
  const focusMode = useOSStore(state => state.focusMode);
  const removeAchievementToast = useOSStore(state => state.removeAchievementToast);
  const brightness = useOSStore(state => state.brightness);
  const accentIntensity = useOSStore(state => state.accentIntensity);
  const colorway = useOSStore(state => state.colorway);
  const density = useOSStore(state => state.density);
  const reducedMotion = useOSStore(state => state.reducedMotion);
  const transparencyEffects = useOSStore(state => state.transparencyEffects);
  const resetSettingsToDefault = useOSStore(state => state.resetSettingsToDefault);
  const randomizeAppearance = useOSStore(state => state.randomizeAppearance);
  const isBSOD = useOSStore(state => state.isBSOD);
  const idleDetection = useOSStore(state => state.idleDetection);
  const wallpaper = useOSStore(state => state.wallpaper);
  const wallpaperPrefs = useOSStore(state => state.wallpaperPrefs);

  // Wallpaper mode (Plash) is decided by the URL and Plash's own <html> class, before boot or login.
  const wallpaperMode = useWallpaperMode();

  const [isIdle, setIsIdle] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const idleTimer = useRef(null);

  // A `hasInteracted` flag and its three global listeners used to live here. Nothing ever read the
  // flag — not this file, not any other — so the effect registered and tore down three window
  // listeners to set a value with no consumer. useSoundEffects does its own AudioContext.resume()
  // on first play, which is what actually satisfies the autoplay policy.

  const isMobile = useIsMobile();
  const contextMenuIconRef = useRef(null);

  const { show: showDesktopMenu } = useContextMenu({ id: DESKTOP_MENU_ID });
  const { show: showIconMenu } = useContextMenu({ id: ICON_MENU_ID });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleSpotlight();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSpotlight]);



  useEffect(() => {
    // Re-arm at most once a second. `mousemove` fires at pointer rate (60–120/s), and this used
    // to clear and re-create the 2-minute timeout on every event. Skipping a re-arm can only make
    // the screensaver arrive up to 1 s early — the idle threshold is 120 s, so nobody can tell.
    let lastArm = 0;
    const handleActivity = () => {
      setIsIdle(false); // bails out when already false
      const now = Date.now();
      if (now - lastArm < 1000) return;
      lastArm = now;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (isAuthenticated && !wallpaperMode.active) setIsIdle(true);
      }, IDLE_MS);
    };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    // Pop-out windows report their own pointer and key activity here, so typing in a popped-out
    // app keeps the screensaver away.
    const offPopoutActivity = onPopoutActivity(handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      offPopoutActivity();
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [isAuthenticated, wallpaperMode.active]);

  // System idle detection adds transitions on top of the timer above; the timer stays in charge.
  // Only runs once the visitor switched it on in Settings → System (which asked for permission).
  useIdleDetection({
    enabled: isAuthenticated && idleDetection === 'on' && !wallpaperMode.active,
    onTransition: (transition) => setIsIdle(transition === 'show'),
  });

  // Immersive mode's truth: the store follows `fullscreenchange`, never the click that asked for it.
  useImmersiveSync();

  // Theme goes onto documentElement, not onto the JSX below. This hook sits ABOVE the early
  // returns at the end of this component, so boot, login and portaled context menus are themed too.
  //
  // Wallpaper mode paints the URL's colorway and brightness over the store's, without mirroring them
  // (see applyTheme): Plash's webview has no saved theme of its own to fall back on.
  const wpColorway = wallpaperMode.active ? (wallpaperMode.theme.colorway ?? colorway) : colorway;
  const wpBrightness = wallpaperMode.active ? wallpaperMode.prefs.bright : brightness;
  useEffect(() => {
    applyTheme(
      { colorway: wpColorway, density, transparencyEffects, brightness: wpBrightness, accentIntensity, reducedMotion },
      { mirror: !wallpaperMode.active },
    );
  }, [wpColorway, density, transparencyEffects, wpBrightness, accentIntensity, reducedMotion, wallpaperMode.active]);

  const handleDesktopContextMenu = (e) => {
    // Popped-out content is still portaled from this tree, so its right-clicks bubble here. Leave
    // those alone: the popup keeps its native menu, and no desktop menu opens unseen in this window.
    if (isMobile || e.target?.ownerDocument !== document) return;
    e.preventDefault();
    showDesktopMenu({ event: e });
  };

  const handleIconContextMenu = (e, iconId) => {
    if (isMobile) return;
    e.preventDefault();
    e.stopPropagation();
    contextMenuIconRef.current = iconId;
    showIconMenu({ event: e });
  };

  if (wallpaperMode.active) {
    return (
      <Suspense fallback={null}>
        <WallpaperMode mode={wallpaperMode} fallbackWallpaper={wallpaper} />
      </Suspense>
    );
  }

  if (isBSOD) {
    return <BSOD />;
  }

  if (!bootComplete) {
    return <BootSequence onComplete={() => setBootComplete(true)} />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div
      /* `transition-colors`, not `transition-all`: on the root element `all` meant any computed-style
         change animated every animatable property of the whole shell for 500ms. */
      className="h-screen w-screen overflow-hidden font-sans select-none flex flex-col relative text-os-onSurface transition-colors duration-500"
      onContextMenu={handleDesktopContextMenu}
    >
      <LiveWallpaper />
      {/* The `!openWindows.includes('retroarcade')` guard that used to live here existed solely so
          widgets stepped aside while the DOOM emulator ran. The emulator is disabled (see
          src/config/games.js), so the guard would now only ever hide widgets for a stale persisted
          window id — restore it alongside the registry entries if DOOM comes back. */}
      {!isMobile && <Widgets />}

      {/* Context Menus — Desktop */}
      {!isMobile && (
        <>
          <Menu id={DESKTOP_MENU_ID} animation="fade" className="os-context-menu">
            <MenuRow icon={TerminalSquare} label="Open Terminal" onClick={() => openWindow('terminal')} />
            <MenuRow icon={User} label="About Me" onClick={() => openWindow('about')} />
            <Separator />
            <MenuRow icon={Wallpaper} label="Personalize…" onClick={() => openWindow('settings')} />
            <MenuRow
              icon={LayoutDashboard}
              label="Wallpaper Mode"
              onClick={() => enterWallpaperMode(wallpaperPrefs, { colorway, wallpaper })}
            />
            <MenuRow icon={FolderPlus} label="New Folder" onClick={() => createFolder(`New Folder`)} />
            <Separator />
            {/* Above the Resets, not beside them: this rolls a look, it does not discard one. */}
            <MenuRow icon={Shuffle} label="Surprise Me" onClick={randomizeAppearance} />
            <Separator />
            <MenuRow
              icon={RotateCcw}
              label="Reset Settings"
              danger
              onClick={async () => {
                if (!(await osConfirm(APPEARANCE_RESET_DIALOG))) return;
                resetSettingsToDefault();
                closeWindow('settings');
              }}
            />
            <MenuRow icon={RefreshCw} label="Reset Icon Layout" danger onClick={resetIconPositions} />
          </Menu>

          <Menu id={ICON_MENU_ID} animation="fade" className="os-context-menu">
            <MenuRow icon={FolderOpen} label="Open" onClick={() => openWindow(contextMenuIconRef.current)} />
          </Menu>
        </>
      )}

      {/* Ambient Neo-Glows. Two radial gradients on one layer, not two `filter: blur(100px)` divs:
          a 100px Gaussian on a 40vw square is a permanently rasterised offscreen texture (over a
          megapixel each on a 2560-wide display) that the compositor re-samples under every frame of
          every window drag. A blurred disc IS a radial falloff, so the gradient reads the same and
          costs one plain paint. Centres and radii match the old boxes (a 40vw box at 25%/25%
          centres at 45%/45%; a 30vw box at 75%/75% from the bottom-right centres at 60%/60%). */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 45% 45%, rgb(var(--os-primary-dim-rgb) / 0.10) 0%, rgb(var(--os-primary-dim-rgb) / 0.04) 18vw, transparent 30vw), ' +
            'radial-gradient(circle at 60% 60%, rgb(var(--os-secondary-dim-rgb) / 0.10) 0%, rgb(var(--os-secondary-dim-rgb) / 0.04) 14vw, transparent 24vw)',
        }}
      />

      {/* First flex child: Desktop is flex-grow, so the icon coordinate space starts below the bar
          rather than underneath it. See the note in MenuBar.jsx. */}
      <MenuBar />

      <Desktop onIconContextMenu={handleIconContextMenu} />

      {/* Windows Layer */}
      <div className={`absolute inset-0 pointer-events-none z-10 flex items-center justify-center ${isMobile ? 'p-0' : 'p-24'}`}>
        <div className="relative w-full h-full pointer-events-none flex items-center justify-center">
          <Suspense fallback={null}>
            <AnimatePresence>
              {/* A slot per window: the docked frame, or the stand-in while the window is popped out.
                  Titles and geometry are looked up inside (src/config/windowTitle.js). */}
              {openWindows.map((id) => (
                <WindowSlot key={id} id={id} isMinimized={minimizedWindows.includes(id)} />
              ))}
            </AnimatePresence>
          </Suspense>
        </div>
      </div>

      <Taskbar />

      {/* Control Center Overlay */}
      <ControlCenter />

      {/* Screensaver */}
      <AnimatePresence>
        {isIdle && <Screensaver onDismiss={() => setIsIdle(false)} />}
      </AnimatePresence>

      {/* Spotlight Search Overlay */}
      <Spotlight />

      {/* Achievement Toasts Container */}
      <div className={`fixed ${isMobile ? 'bottom-[calc(6.5rem+env(safe-area-inset-bottom))]' : 'bottom-24'} right-6 z-[2000] flex flex-col gap-4 items-end pointer-events-none`}>
        <AnimatePresence>
          {/* Focus holds every non-urgent toast: it stays queued but unmounted, so its timer never
              starts, and it appears once Focus turns off. */}
          {achievementQueue.filter((entry) => !focusMode || entry?.urgent).map((entry) => {
            // Entries are either a bare achievement id or a { id, title, desc } one-off toast.
            const key = entry?.id ?? entry;
            return (
              <AchievementToast
                key={key}
                achievementId={entry}
                onComplete={() => removeAchievementToast(key)}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
