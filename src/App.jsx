import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
  MousePointer2, FolderPlus, RefreshCw, Cpu, X, RotateCcw, Hash,
  User, FileText, Code, HardDrive, Gamepad2, Monitor, Music, 
  Image as Wallpaper, Activity, Mail, MessageSquare, Settings as SettingsIcon, 
  Trophy, Globe, Brain, Book, SlidersHorizontal
} from 'lucide-react';
import CustomIcon from './components/common/CustomIcon';
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
import Settings from './components/Settings';
import LiveWallpaper from './components/LiveWallpaper';
import FileExplorer from './components/FileExplorer';
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
import './index.css';

// Context menu IDs for desktop and icon menus
const DESKTOP_MENU_ID = 'desktop-context-menu';
const ICON_MENU_ID = 'icon-context-menu';

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



  const desktopIcons = [
    { id: 'about',    title: 'About Me',     icon: <CustomIcon icon={User} size={isMobile ? 32 : 28}           color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'cv',       title: 'Resume',       icon: <div className="relative"><CustomIcon icon={FileText} size={isMobile ? 32 : 28} color="text-[#ff86c3]" glow="rgba(255,134,195,0.6)" strokeWidth={2.5} /><div className="absolute -top-1 -right-1 w-3 h-3 bg-os-primary rounded-full border-2 border-os-surfaceContainerLow animate-pulse"></div></div> },
    { id: 'projects', title: 'Projects',     icon: <CustomIcon icon={Code} size={isMobile ? 32 : 28}           color="text-os-secondary" glow="rgba(var(--os-secondary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'terminal', title: 'Terminal',     icon: <div className={`font-mono font-bold text-os-onSurfaceVariant ${isMobile ? 'text-2xl' : 'text-xl'}`}>{'>_'}</div> },
    { id: 'files',    title: 'Files',        icon: <CustomIcon icon={HardDrive} size={isMobile ? 32 : 28}      color="text-[#ffc86b]" glow="rgba(255,200,107,0.3)" strokeWidth={2.5} /> },
    { id: 'games',    title: 'Game Center',  icon: <CustomIcon icon={Gamepad2} size={isMobile ? 32 : 28}       color="text-os-tertiary" glow="rgba(var(--os-tertiary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'media',    title: 'Media',        icon: <CustomIcon icon={Monitor} size={isMobile ? 32 : 28}      color="text-[#00d2fd]" glow="rgba(0,210,253,0.3)" strokeWidth={2.5} /> },
    { id: 'music',    title: 'Music',        icon: <CustomIcon icon={Music} size={isMobile ? 32 : 28}        color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'photos',   title: 'Photos',       icon: <CustomIcon icon={Wallpaper} size={isMobile ? 32 : 28}    color="text-[#ff86c3]" glow="rgba(255,134,195,0.3)" strokeWidth={2.5} /> },
    { id: 'benchmark', title: 'Benchmark',    icon: <CustomIcon icon={Activity} size={isMobile ? 32 : 28}     color="text-[#00f5a0]" glow="rgba(0,245,160,0.3)" strokeWidth={2.5} /> },
    { id: 'mail',     title: 'Mail',         icon: <CustomIcon icon={Mail} size={isMobile ? 32 : 28}         color="text-[#00f5a0]" glow="rgba(0,245,160,0.3)" strokeWidth={2.5} /> },
    { id: 'chat',     title: 'Guestbook',    icon: <CustomIcon icon={MessageSquare} size={isMobile ? 32 : 28} color="text-[#cc97ff]" glow="rgba(204,151,255,0.3)" strokeWidth={2.5} /> },
    { id: 'retroarcade', title: 'Retro Arcade', icon: <CustomIcon icon={Gamepad2} size={isMobile ? 32 : 28} color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'mail',     title: 'Mail',         icon: <CustomIcon icon={Mail} size={isMobile ? 32 : 28}         color="text-[#00f5a0]" glow="rgba(0,245,160,0.3)" strokeWidth={2.5} /> },
    { id: 'chat',     title: 'Guestbook',    icon: <CustomIcon icon={MessageSquare} size={isMobile ? 32 : 28} color="text-[#cc97ff]" glow="rgba(204,151,255,0.3)" strokeWidth={2.5} /> },
    { id: 'retroarcade', title: 'Retro Arcade', icon: <CustomIcon icon={Gamepad2} size={isMobile ? 32 : 28} color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'settings', title: 'Settings',     icon: <CustomIcon icon={SettingsIcon} size={isMobile ? 32 : 28}   color="text-[#9effc8]" glow="rgba(158,255,200,0.3)" strokeWidth={2.5} /> },
    { id: 'notepad',  title: 'Notepad',      icon: <CustomIcon icon={FileText} size={isMobile ? 32 : 28}      color="text-cyan-400" glow="rgba(34,211,238,0.3)" strokeWidth={2.5} /> },
    { id: 'taskmanager', title: 'Monitor',   icon: <CustomIcon icon={Activity} size={isMobile ? 32 : 28}      color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'achievements', title: 'Honors',   icon: <CustomIcon icon={Trophy} size={isMobile ? 32 : 28}        color="text-yellow-400" glow="rgba(250,204,21,0.3)" strokeWidth={2.5} /> },
    { id: 'browser',    title: 'Flow-Net',   icon: <CustomIcon icon={Globe} size={isMobile ? 32 : 28}         color="text-[#00d2fd]" glow="rgba(0,210,253,0.3)" strokeWidth={2.5} /> },
    { id: 'aichat',     title: 'Lumina AI',  icon: <CustomIcon icon={Brain} size={isMobile ? 32 : 28}        color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'documentation', title: 'Documentation', icon: <CustomIcon icon={Book} size={isMobile ? 32 : 28}     color="text-[#9effc8]" glow="rgba(158,255,200,0.3)" strokeWidth={2.5} /> },
    { id: 'skills',     title: 'Skills',      icon: <CustomIcon icon={SlidersHorizontal} size={isMobile ? 32 : 28} color="text-[#00f5a0]" glow="rgba(0,245,160,0.3)" strokeWidth={2.5} /> },
    ];

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
  const accentColorsMap = {
    purple:  { primary: '204, 151, 255', secondary: '0, 210, 253',   tertiary: '0, 245, 160'   },
    cyan:    { primary: '0, 210, 253',   secondary: '204, 151, 255', tertiary: '255, 104, 240' },
    magenta: { primary: '255, 104, 240', secondary: '204, 151, 255', tertiary: '0, 210, 253'   },
    green:   { primary: '0, 245, 160',   secondary: '0, 210, 253',   tertiary: '204, 151, 255' },
  };

  const currentAccent = accentColorsMap[activeAccent] || accentColorsMap.purple;

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
      <PresenceLayer />
      {!isMobile && <Widgets />}

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
              {openWindows.filter(id => !minimizedWindows.includes(id)).map((id) => (
                <Window
                  key={id}
                  id={id}
                  title={id.charAt(0).toUpperCase() + id.slice(1)}
                  isActive={activeWindow === id}
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

      <Taskbar desktopIcons={desktopIcons} />

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
