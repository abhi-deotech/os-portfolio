import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
  MousePointer2, FolderPlus, RefreshCw, Cpu, X, RotateCcw, Hash
} from 'lucide-react';
import {
  Menu,
  Item,
  Separator,
  useContextMenu,
} from 'react-contexify';
import 'react-contexify/ReactContexify.css';
import { AnimatePresence } from 'framer-motion';

import Window from './components/Window';
import ControlCenter from './components/ControlCenter';
import LiveWallpaper from './components/LiveWallpaper';
import Widgets from './components/Widgets';
import LoginScreen from './components/LoginScreen';
import Spotlight from './components/Spotlight';
import AchievementToast from './components/AchievementToast';
import Screensaver from './components/Screensaver';
import BootSequence from './components/BootSequence';
import BSOD from './components/BSOD';
import WindowContentRenderer from './components/WindowContentRenderer';
import Desktop from './components/Desktop';
import Taskbar from './components/Taskbar';
import PresenceLayer from './components/PresenceLayer';

import useSoundEffects from './hooks/useSoundEffects';
import useOSStore from './store/osStore';
import { useIsMobile } from './hooks/useMediaQuery';
import { APPS } from './config/apps';
import './index.css';

// Context menu IDs for desktop and icon menus
const DESKTOP_MENU_ID = 'desktop-context-menu';
const ICON_MENU_ID = 'icon-context-menu';

// Accents map hoisted to prevent unnecessary re-creation on every render
const ACCENT_COLORS_MAP = {
  purple:  { primary: '204, 151, 255', secondary: '0, 210, 253',   tertiary: '0, 245, 160'   },
  cyan:    { primary: '0, 210, 253',   secondary: '204, 151, 255', tertiary: '255, 104, 240' },
  magenta: { primary: '255, 104, 240', secondary: '204, 151, 255', tertiary: '0, 210, 253'   },
  green:   { primary: '0, 245, 160',   secondary: '0, 210, 253',   tertiary: '204, 151, 255' },
};

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
  const minimizedWindows = useOSStore(state => state.minimizedWindows || []);
  const activeWindow = useOSStore(state => state.activeWindow);
  const openWindow = useOSStore(state => state.openWindow);
  const focusWindow = useOSStore(state => state.focusWindow);
  const closeWindow = useOSStore(state => state.closeWindow);
  const activeAccent = useOSStore(state => state.activeAccent);
  const resetIconPositions = useOSStore(state => state.resetIconPositions);
  const createFolder = useOSStore(state => state.createFolder);
  const isAuthenticated = useOSStore(state => state.isAuthenticated);
  const toggleSpotlight = useOSStore(state => state.toggleSpotlight);
  const achievementQueue = useOSStore(state => state.achievementQueue);
  const removeAchievementToast = useOSStore(state => state.removeAchievementToast);
  const brightness = useOSStore(state => state.brightness);
  const accentIntensity = useOSStore(state => state.accentIntensity);
  const resetSettingsToDefault = useOSStore(state => state.resetSettingsToDefault);
  const isBSOD = useOSStore(state => state.isBSOD);
  const activeRetroGame = useOSStore(state => state.activeRetroGame);

  const { playSound } = useSoundEffects();
  const [isIdle, setIsIdle] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const idleTimer = useRef(null);

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



    useEffect(() => {    const handleActivity = () => {
      setIsIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (isAuthenticated) setIsIdle(true);
      }, 120000); // 2 minutes
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [isAuthenticated]);

  // Play sound on window toggle
  useEffect(() => {
    if (openWindows.length > 0) playSound('open');
  }, [openWindows.length, playSound]);

  // Play sound on achievement
  useEffect(() => {
    if (achievementQueue.length > 0) playSound('achievement');
  }, [achievementQueue.length, playSound]);

  const currentAccent = ACCENT_COLORS_MAP[activeAccent] || ACCENT_COLORS_MAP.purple;

  const handleDesktopContextMenu = (e) => {
    if (isMobile) return;
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
      className="h-screen w-screen overflow-hidden font-sans select-none flex flex-col relative text-os-onSurface transition-all duration-500"
      style={{
        '--os-primary-rgb':   currentAccent.primary,
        '--os-secondary-rgb': currentAccent.secondary,
        '--os-tertiary-rgb':  currentAccent.tertiary,
        '--os-accent-intensity': accentIntensity / 100,
        filter: `brightness(${brightness}%)`,
      }}
      onContextMenu={handleDesktopContextMenu}
    >
      <LiveWallpaper />
      {!activeRetroGame && <PresenceLayer />}
      {!isMobile && !activeRetroGame && <Widgets />}

      {/* Context Menus — Desktop */}
      {!isMobile && (
        <>
          <Menu id={DESKTOP_MENU_ID} animation="fade" theme="dark" className="os-context-menu">
            <Item onClick={() => openWindow('terminal')}>
              <div className="font-mono font-bold text-os-onSurfaceVariant text-xs mr-2">{'>_'}</div> Open Terminal
            </Item>
            <Item onClick={() => openWindow('about')}>
              <CustomIcon icon={User} size={13} color="text-os-onSurfaceVariant" className="mr-2" animate={false} /> About Me
            </Item>
            <Separator />
            <Item onClick={() => openWindow('settings')}>
              <CustomIcon icon={Wallpaper} size={13} color="text-os-onSurfaceVariant" className="mr-2" animate={false} /> Personalize…
            </Item>
            <Item onClick={() => createFolder(`New Folder`)}>
              <CustomIcon icon={FolderPlus} size={13} color="text-os-onSurfaceVariant" className="mr-2" animate={false} /> New Folder
            </Item>
            <Separator />
            <Item onClick={() => { resetSettingsToDefault(); closeWindow('settings'); }}>
              <CustomIcon icon={RotateCcw} size={13} color="text-os-onSurfaceVariant" className="mr-2" animate={false} /> Reset Settings
            </Item>
            <Item onClick={resetIconPositions}>
              <CustomIcon icon={RefreshCw} size={13} color="text-os-onSurfaceVariant" className="mr-2" animate={false} /> Reset Icon Layout
            </Item>
          </Menu>

          <Menu id={ICON_MENU_ID} animation="fade" theme="dark" className="os-context-menu">
            <Item onClick={() => openWindow(contextMenuIconRef.current)}>
              Open
            </Item>
          </Menu>
        </>
      )}

      {/* Ambient Neo-Glows */}
      <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-os-primaryDim/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-os-secondaryDim/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <Desktop onIconContextMenu={handleIconContextMenu} />

      {/* Windows Layer */}
      <div className={`absolute inset-0 pointer-events-none z-10 flex items-center justify-center ${isMobile ? 'p-0' : 'p-24'}`}>
        <div className="relative w-full h-full pointer-events-none flex items-center justify-center">
          <Suspense fallback={null}>
            <AnimatePresence>
              {openWindows.map((id) => (
                <Window
                  key={id}
                  id={id}
                  title={id.charAt(0).toUpperCase() + id.slice(1)}
                  isActive={activeWindow === id}
                  isMinimized={minimizedWindows.includes(id)}
                  onClose={() => closeWindow(id)}
                  onFocus={() => focusWindow(id)}
                >
                  <WindowContentRenderer id={id} />
                </Window>
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
          {achievementQueue.map((id) => (
            <AchievementToast 
              key={id} 
              achievementId={id} 
              onComplete={() => removeAchievementToast(id)} 
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
