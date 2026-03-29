import React, { useState, useEffect, useRef } from 'react';
import {
  User, Code, FileText, LayoutGrid, Gamepad2, MousePointer2,
  Settings as SettingsIcon, ChevronUp, ChevronDown, HardDrive,
  Wallpaper, FolderPlus, RefreshCw, Home, SlidersHorizontal, Cpu, X, Monitor, Music, Power, Brain, Hash, Activity, Trophy, Globe, RotateCcw, Book
} from 'lucide-react';
import CustomIcon from './components/common/CustomIcon';
import {
  Menu,
  Item,
  Separator,
  useContextMenu,
} from 'react-contexify';
import 'react-contexify/ReactContexify.css';
import { motion, AnimatePresence } from 'framer-motion';

import Window from './components/Window';
import Terminal from './components/Terminal';
import ControlCenter from './components/ControlCenter';
import Games from './components/Games';
import Snake from './components/games/Snake';
import MemoryGame from './components/games/MemoryGame';
import TriviaGame from './components/games/TriviaGame';
import Game2048 from './components/games/Game2048';
import Sudoku from './components/games/Sudoku';
import Settings from './components/Settings';
import LiveWallpaper from './components/LiveWallpaper';
import FileExplorer from './components/FileExplorer';
import Widgets from './components/Widgets';
import MediaPlayer from './components/MediaPlayer';
import PhotoViewer from './components/PhotoViewer';
import MusicApp from './components/MusicApp';
import LoginScreen from './components/LoginScreen';
import Benchmark from './components/Benchmark';
import Spotlight from './components/Spotlight';
import Notepad from './components/Notepad';
import TaskManager from './components/TaskManager';
import Achievements from './components/Achievements';
import Browser from './components/Browser';
import AIChat from './components/AIChat';
import DocumentationApp from './components/DocumentationApp';
import AchievementToast from './components/AchievementToast';
import Screensaver from './components/Screensaver';
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
  const {
    openWindows, openWindow, toggleControlCenter, isControlCenterOpen,
    toggleAppLauncher, isAppLauncherOpen, activeAccent,
    iconPositions, setIconPosition, resetIconPositions,
    createFolder, setIsDragging, closeWindow,
    isAuthenticated, logout, toggleSpotlight, isSpotlightOpen, openNotepad,
    achievementQueue, removeAchievementToast,
    transparencyEffects, brightness, accentIntensity, resetSettingsToDefault
  } = useOSStore();

  const { playSound } = useSoundEffects();
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef(null);

  const isMobile = useIsMobile();
  const [time, setTime] = useState(new Date());
  const contextMenuIconRef = useRef(null);

  const { show: showDesktopMenu } = useContextMenu({ id: DESKTOP_MENU_ID });
  const { show: showIconMenu } = useContextMenu({ id: ICON_MENU_ID });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    { id: 'settings', title: 'Settings',     icon: <CustomIcon icon={SettingsIcon} size={isMobile ? 32 : 28}   color="text-[#9effc8]" glow="rgba(158,255,200,0.3)" strokeWidth={2.5} /> },
    { id: 'notepad',  title: 'Notepad',      icon: <CustomIcon icon={FileText} size={isMobile ? 32 : 28}      color="text-cyan-400" glow="rgba(34,211,238,0.3)" strokeWidth={2.5} /> },
    { id: 'taskmanager', title: 'Monitor',   icon: <CustomIcon icon={Activity} size={isMobile ? 32 : 28}      color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'achievements', title: 'Honors',   icon: <CustomIcon icon={Trophy} size={isMobile ? 32 : 28}        color="text-yellow-400" glow="rgba(250,204,21,0.3)" strokeWidth={2.5} /> },
    { id: 'browser',    title: 'Flow-Net',   icon: <CustomIcon icon={Globe} size={isMobile ? 32 : 28}         color="text-[#00d2fd]" glow="rgba(0,210,253,0.3)" strokeWidth={2.5} /> },
    { id: 'aichat',     title: 'Lumina AI',  icon: <CustomIcon icon={Brain} size={isMobile ? 32 : 28}        color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'documentation', title: 'Documentation', icon: <CustomIcon icon={Book} size={isMobile ? 32 : 28}     color="text-[#9effc8]" glow="rgba(158,255,200,0.3)" strokeWidth={2.5} /> },
  ];

  useEffect(() => {
    const handleActivity = () => {
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

      {/* Desktop - Draggable Icons */}
      <div className={`flex-grow relative z-0 ${isMobile ? 'overflow-y-auto pt-8 pb-32 px-4' : 'overflow-hidden'}`}>
        <div className={isMobile ? "grid grid-cols-3 gap-y-8 gap-x-4" : "relative h-full w-full"}>
          {desktopIcons.map((icon, index) => {
            if (isMobile) {
              return (
                <motion.div
                  key={icon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => openWindow(icon.id)}
                  className="flex flex-col items-center justify-start p-2 rounded-2xl active:bg-white/10 transition-colors group"
                >
                  <div className="mb-2 p-4 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-lg relative active:scale-95 transition-all overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="transition-transform group-hover:scale-110">
                      {icon.icon}
                    </div>
                  </div>
                  <span className="text-[10px] text-white font-bold text-center leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,0.8)] px-2 transition-all">
                    {icon.title}
                  </span>
                </motion.div>
              );
            }

            // Desktop draggable logic
            const col = Math.floor(index / 5);
            const row = index % 5;
            const defaultX = 40 + col * 120;
            const defaultY = 40 + row * 128;

            const savedPos = iconPositions[icon.id];
            const startX = savedPos ? savedPos.x : defaultX;
            const startY = savedPos ? savedPos.y : defaultY;

            return (
              <motion.div
                key={icon.id}
                drag
                dragMomentum={false}
                dragElastic={0}
                style={{ x: startX, y: startY, position: 'absolute', left: 0, top: 0 }}
                animate={{ x: startX, y: startY }}
                transition={{ 
                  type: 'spring', stiffness: 300, damping: 30,
                }}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={(e, info) => {
                  setIsDragging(false);
                  const newX = startX + info.offset.x;
                  const newY = startY + info.offset.y;
                  setIconPosition(icon.id, { x: newX, y: newY });
                }}
                whileDrag={{ scale: 1.05, zIndex: 100, cursor: 'grabbing' }}
                onDoubleClick={() => openWindow(icon.id)}
                onContextMenu={(e) => handleIconContextMenu(e, icon.id)}
                className="absolute flex flex-col items-center justify-start p-2 rounded-2xl hover:bg-white/5 transition-all cursor-grab w-28 text-center group"
              >
                <div className="mb-2 p-4 bg-white/10 backdrop-blur-3xl rounded-[1.75rem] border border-white/5 group-hover:border-white/20 shadow-xl transition-all relative overflow-hidden group-hover:scale-105 group-active:scale-95 group-hover:bg-white/15">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="transition-transform duration-300">
                    {icon.icon}
                  </div>
                </div>
                <span className="text-[11px] md:text-[13px] text-white font-semibold tracking-wide [text-shadow:0_1px_8px_rgba(0,0,0,0.8)] px-3 py-1 transition-all group-hover:scale-105">
                  {icon.title}
                </span>
              </motion.div>
            );
          })}
        </div>
        {isMobile && (
          <div className="mt-12 mb-20 px-4">
             <Widgets />
          </div>
        )}
      </div>


      {/* Windows Layer */}
      <div className={`absolute inset-0 pointer-events-none z-10 flex items-center justify-center ${isMobile ? 'p-0' : 'p-24'}`}>
        <div className="relative w-full h-full pointer-events-none flex items-center justify-center">
          <AnimatePresence>
            {openWindows.includes('about') && (
              <Window key="about" id="about" title="About Me" width={950} height={650}>
                <div className="flex flex-col h-full relative p-6 md:p-10">
                  <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-os-primary to-os-secondary p-1 shrink-0 shadow-2xl shadow-os-primary/20">
                      <div className="w-full h-full rounded-[1.25rem] bg-os-surfaceContainerLow flex items-center justify-center overflow-hidden">
                         <User size={48} className="text-os-onSurface opacity-80" />
                      </div>
                    </div>
                    <div>
                      <h1 className="font-display text-4xl md:text-5xl font-black mb-3 bg-gradient-to-r from-os-primary via-os-secondary to-os-tertiary bg-clip-text text-transparent w-fit tracking-tight">
                        Abhimanyu Saxena
                      </h1>
                      <p className="text-os-onSurfaceVariant text-lg md:text-xl max-w-2xl leading-relaxed font-medium">
                        Software Engineer & Team Lead architecting scalable, end-to-end digital experiences.
                      </p>
                      <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-os-primary uppercase tracking-widest bg-os-primary/10 px-3 py-1.5 rounded-full border border-os-primary/20">
                          <Code size={14} /> Full Stack
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-os-secondary uppercase tracking-widest bg-os-secondary/10 px-3 py-1.5 rounded-full border border-os-secondary/20">
                          <Cpu size={14} /> IoT & Embedded
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section>
                      <h3 className="font-display font-black text-os-onSurface mb-4 text-xs uppercase tracking-[0.2em] opacity-40">Professional Trajectory</h3>
                      <div className="flex flex-col space-y-4">
                        {[
                          { company: 'Deotechsolutions', role: 'Software Engineer | Team Lead', period: '2025 - Present', desc: 'Leading cross-functional teams and driving architecture for enterprise web platforms.' },
                          { company: 'LendFoundry', role: 'Software Engineer', period: '2021 - 2024', desc: 'Full-stack development for FinTech solutions focusing on scalability and performance.' },
                        ].map((exp) => (
                          <div key={exp.company} className="group p-5 rounded-2xl bg-os-surfaceContainerLow/30 border border-os-outline/10 hover:border-os-primary/30 hover:bg-os-surfaceContainerLow/50 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-os-onSurface group-hover:text-os-primary transition-colors">{exp.company}</h4>
                                <p className="text-xs text-os-onSurfaceVariant font-bold">{exp.role}</p>
                              </div>
                              <span className="text-[10px] text-os-primary font-black bg-os-primary/10 px-2.5 py-1 rounded-lg uppercase tracking-wider">{exp.period}</span>
                            </div>
                            <p className="text-xs text-os-onSurfaceVariant leading-relaxed opacity-70">{exp.desc}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                    
                    <section className="space-y-6">
                      <div>
                        <h3 className="font-display font-black text-os-onSurface mb-4 text-xs uppercase tracking-[0.2em] opacity-40">Philosophy</h3>
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-os-surfaceContainerHigh/40 to-os-surfaceContainerLow/20 border border-os-outline/10 italic text-sm text-os-onSurfaceVariant leading-relaxed relative">
                          <div className="absolute top-4 left-4 text-4xl text-os-primary/10 font-serif leading-none">"</div>
                          I believe in writing code that is not just functional, but an elegant blueprint for future scalability. Every pixel and every line of code should serve a purpose in the larger ecosystem.
                        </div>
                      </div>

                      <div className="flex justify-center md:justify-start gap-4 pt-4">
                        <button onClick={() => openWindow('cv')} className="flex items-center gap-2 px-6 py-3 bg-os-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-os-primary/20 active:scale-95 transition-all">
                          <FileText size={16} /> Get Resume
                        </button>
                        <button onClick={() => openWindow('projects')} className="flex items-center gap-2 px-6 py-3 border border-os-outline/20 text-os-onSurface text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-os-surfaceContainerHighest transition-all">
                          View Work
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              </Window>
            )}

            {openWindows.includes('projects') && (
              <Window key="projects" id="projects" title="Projects" width={1050} height={700}>
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6 h-full p-6 md:p-8`}>
                  {[
                    { title: "Lumina OS", stack: "React, Tailwind, Framer", color: "os-primary" },
                    { title: "MERN Dashboard", stack: "MongoDB, Express, React, Node", color: "os-secondary" },
                    { title: "IoT Controller", stack: "Python, MQTT, C++", color: "os-tertiary" },
                    { title: "Smart Home UI", stack: "Vite, Next.js, HSL", color: "os-secondary" }
                  ].map((p, i) => (
                    <motion.div
                      key={i}
                      whileHover={!isMobile ? { y: -8 } : {}}
                      className="os-card-glow bg-os-surfaceContainerLow/50 backdrop-blur-md rounded-2xl border border-os-outline/10 hover:border-os-primary/50 hover:bg-os-surfaceContainerHighest/80 transition-all p-6 flex flex-col justify-end group cursor-pointer shadow-lg aspect-video h-40 md:h-48 relative overflow-hidden"
                    >
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent z-0" />
                      <div className="relative z-10">
                        <h3 className={`font-display font-extrabold text-lg md:text-xl mb-1 text-os-onSurface group-hover:text-${p.color} transition-colors`}>{p.title}</h3>
                        <p className="text-[10px] md:text-xs text-os-onSurfaceVariant font-medium uppercase tracking-wider">{p.stack}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Window>
            )}

            {openWindows.includes('terminal') && (
              <Window key="terminal" id="terminal" title="Terminal" width={850} height={550}>
                <div className="p-4 md:p-8 h-full">
                  <Terminal />
                </div>
              </Window>
            )}

            {openWindows.includes('games') && (
              <Window key="games" id="games" title="Game Center" width={1200} height={800}>
                <div className="h-full w-full overflow-y-auto"><Games /></div>
              </Window>
            )}

            {openWindows.includes('snake') && (
              <Window key="snake" id="snake" title="Snake Retro" width={750} height={750}>
                <div className="h-full w-full">
                  <Snake onBack={() => useOSStore.getState().closeWindow('snake')} />
                </div>
              </Window>
            )}

            {openWindows.includes('memory') && (
              <Window key="memory" id="memory" title="Memory Match" width={950} height={700}>
                <div className="h-full w-full overflow-y-auto">
                  <MemoryGame onBack={() => useOSStore.getState().closeWindow('memory')} />
                </div>
              </Window>
            )}

            {openWindows.includes('trivia') && (
              <Window key="trivia" id="trivia" title="Trivia Quest" width={900} height={750}>
                <div className="h-full w-full overflow-hidden">
                  <TriviaGame onBack={() => useOSStore.getState().closeWindow('trivia')} />
                </div>
              </Window>
            )}

            {openWindows.includes('2048') && (
              <Window key="2048" id="2048" title="2048 Retro" width={750} height={750}>
                <div className="h-full w-full">
                  <Game2048 onBack={() => useOSStore.getState().closeWindow('2048')} />
                </div>
              </Window>
            )}

            {openWindows.includes('sudoku') && (
              <Window key="sudoku" id="sudoku" title="Sudoku Master" width={800} height={800}>
                <div className="h-full w-full">
                  <Sudoku onBack={() => useOSStore.getState().closeWindow('sudoku')} />
                </div>
              </Window>
            )}

            {openWindows.includes('settings') && (
              <Window key="settings" id="settings" title="System Settings" width={950} height={650}>
                <div className="h-full w-full overflow-y-auto"><Settings /></div>
              </Window>
            )}

            {openWindows.includes('cv') && (
              <Window key="cv" id="cv" title="Abhimanyu_Saxena_Resume.pdf" width={1000} height={850}>
                <div className="h-full w-full bg-[#f8fafc] flex flex-col items-center justify-center overflow-hidden relative">
                  {isMobile ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center space-y-8 bg-white h-full w-full">
                      <div className="relative group">
                        <div className="absolute -inset-4 bg-os-primary/20 blur-2xl rounded-full animate-pulse group-hover:bg-os-primary/40 transition-all duration-500" />
                        <div className="relative w-24 h-24 md:w-32 md:h-32 bg-os-surfaceContainerLow/50 backdrop-blur-3xl rounded-[2rem] flex items-center justify-center border border-os-outline/20 shadow-2xl">
                          <FileText size={48} className="text-os-primary group-hover:scale-110 transition-transform duration-500" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Abhimanyu Saxena</h2>
                        <p className="text-xs font-bold text-os-primary uppercase tracking-[0.2em] opacity-80">Software Engineer | Team Lead</p>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">My official curriculum vitae detailing professional experience, core skills, and academic history.</p>
                      </div>
                      <div className="flex flex-col gap-3 w-full max-w-[280px]">
                        <a 
                          href="/Abhimanyu.pdf" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-3 w-full py-4 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl active:scale-95 transition-all"
                        >
                          <Monitor size={16} /> View Online
                        </a>
                        <a 
                          href="/Abhimanyu.pdf" 
                          download
                          className="flex items-center justify-center gap-3 w-full py-4 border-2 border-gray-100 text-gray-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 active:scale-95 transition-all"
                        >
                          <HardDrive size={16} /> Download Copy
                        </a>
                      </div>
                      <div className="pt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-os-primary" /> PDF Document • 244 KB
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col">
                      <div className="h-14 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-10">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-os-primary/10 flex items-center justify-center border border-os-primary/20">
                              <FileText size={16} className="text-os-primary" />
                           </div>
                           <span className="text-sm font-bold text-gray-700">Abhimanyu_Saxena_Resume.pdf</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <a href="/Abhimanyu.pdf" download className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
                             <HardDrive size={18} />
                           </a>
                           <div className="h-6 w-px bg-gray-200 mx-1" />
                           <button onClick={() => closeWindow('cv')} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors text-gray-500">
                             <X size={18} />
                           </button>
                        </div>
                      </div>
                      <iframe src="/Abhimanyu.pdf" title="Abhimanyu Saxena Resume" className="w-full flex-grow border-0" />
                    </div>
                  )}
                </div>
              </Window>
            )}

            {openWindows.includes('skills') && (
              <Window key="skills" id="skills" title="Technical Arsenal" width={950} height={700}>
                <div className="p-6 md:p-12 space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { title: 'Frontend', skills: ['React', 'Vue', 'Tailwind', 'Next.js'], color: 'os-primary', icon: LayoutGrid },
                        { title: 'Backend', skills: ['Node.js', 'Python', 'C++', 'GraphQL'], color: 'os-secondary', icon: Cpu },
                        { title: 'Infrastructure', skills: ['Docker', 'AWS', 'Git', 'CI/CD'], color: 'os-tertiary', icon: HardDrive }
                      ].map(cat => (
                        <div key={cat.title} className="p-6 rounded-3xl bg-os-surfaceContainerLow/30 border border-os-outline/10 hover:border-os-outline/30 transition-all">
                           <div className={`w-12 h-12 rounded-2xl bg-os-surfaceContainerHighest/50 flex items-center justify-center mb-4 text-${cat.color}`}>
                              <cat.icon size={24} />
                           </div>
                           <h4 className="font-bold text-os-onSurface mb-4">{cat.title}</h4>
                           <div className="flex flex-wrap gap-2">
                              {cat.skills.map(s => (
                                <span key={s} className="px-3 py-1 bg-os-surfaceContainerHighest/50 rounded-lg text-[10px] font-black uppercase tracking-widest text-os-onSurfaceVariant">
                                   {s}
                                </span>
                              ))}
                           </div>
                        </div>
                      ))}
                   </div>

                   <section className="space-y-6">
                      <h3 className="font-display font-black text-os-onSurface text-xs uppercase tracking-[0.2em] opacity-40">Proficiency Matrix</h3>
                      <div className="space-y-6">
                         {[
                           { name: 'JavaScript / TypeScript', val: 95, color: 'os-primary' },
                           { name: 'React Ecosystem', val: 92, color: 'os-secondary' },
                           { name: 'C++ & Systems Architecture', val: 85, color: 'os-tertiary' },
                           { name: 'Python & Data Engineering', val: 80, color: 'os-primary' }
                         ].map(skill => (
                           <div key={skill.name}>
                              <div className="flex justify-between items-end mb-2">
                                 <span className="text-sm font-bold text-os-onSurface">{skill.name}</span>
                                 <span className={`text-xs font-black text-${skill.color}`}>{skill.val}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-os-surfaceContainerHighest rounded-full overflow-hidden">
                                 <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${skill.val}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className={`h-full bg-${skill.color}`}
                                 />
                              </div>
                           </div>
                         ))}
                      </div>
                   </section>
                </div>
              </Window>
            )}

            {openWindows.includes('files') && (
              <Window key="files" id="files" title="File Explorer" width={780} height={560}>
                <div className="h-full w-full overflow-y-auto">
                  <FileExplorer />
                </div>
              </Window>
            )}

            {openWindows.includes('media') && (
              <Window key="media" id="media" title="Lumina Media Player" width={850} height={600}>
                <MediaPlayer file={useOSStore.getState().fileSystem.find(f => f.id === 'root-media')?.children?.find(m => m.type === 'video')} />
              </Window>
            )}

            {openWindows.includes('photos') && (
              <Window key="photos" id="photos" title="Lumina Photos" width={900} height={650}>
                <PhotoViewer file={useOSStore.getState().fileSystem.find(f => f.id === 'root-media')?.children?.find(m => m.type === 'image')} />
              </Window>
            )}

            {openWindows.includes('music') && (
              <Window key="music" id="music" title="Lumina Music" width={1100} height={700}>
                <MusicApp />
              </Window>
            )}
            
            {openWindows.includes('benchmark') && (
              <Window key="benchmark" id="benchmark" title="Lumina Benchmark" width={850} height={600}>
                <Benchmark />
              </Window>
            )}

            {openWindows.includes('notepad') && (
              <Window key="notepad" id="notepad" title="Notepad" width={800} height={600}>
                <Notepad />
              </Window>
            )}

            {openWindows.includes('taskmanager') && (
              <Window key="taskmanager" id="taskmanager" title="Task Manager" width={900} height={650}>
                <TaskManager />
              </Window>
            )}

            {openWindows.includes('achievements') && (
              <Window key="achievements" id="achievements" title="System Achievements" width={800} height={600}>
                <Achievements />
              </Window>
            )}

            {openWindows.includes('browser') && (
              <Window key="browser" id="browser" title="Flow-Net Browser" width={1000} height={700}>
                <Browser />
              </Window>
            )}

            {openWindows.includes('aichat') && (
              <Window key="aichat" id="aichat" title="Lumina Neural Assistant" width={500} height={600}>
                <AIChat />
              </Window>
            )}

            {openWindows.includes('documentation') && (
              <Window key="documentation" id="documentation" title="OS Documentation" width={1200} height={800}>
                <DocumentationApp />
              </Window>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* The Taskbar (Bottom Dock) */}
      <div 
        className={`absolute ${isMobile ? 'bottom-0 left-0 right-0 w-full h-20 rounded-t-3xl border-t' : 'bottom-6 left-1/2 -translate-x-1/2 h-16 rounded-3xl border min-w-[400px]'} bg-white/5 ${transparencyEffects ? 'backdrop-blur-3xl' : ''} border-white/10 flex items-center px-4 justify-between z-50 shadow-2xl transition-all duration-500`}
      >
        {/* System & App Launcher Group (Left) */}
        <div className="flex items-center bg-black/20 rounded-2xl p-1 gap-1 border border-white/5 md:mr-4">
          <div
            onClick={toggleAppLauncher}
            className={`p-2.5 rounded-xl transition-all cursor-pointer group relative ${isAppLauncherOpen ? 'bg-os-primary/10 border border-os-primary/30' : 'hover:bg-os-surfaceContainerLow/50 border border-transparent'}`}
          >
            <CustomIcon icon={isMobile && openWindows.length > 0 ? Home : LayoutGrid} size={20} color={isAppLauncherOpen ? 'text-os-primary' : 'text-os-onSurface group-hover:text-os-primary'} glow={isAppLauncherOpen ? 'rgba(var(--os-primary-rgb), 0.5)' : false} />
            {isAppLauncherOpen && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-os-primary shadow-[0_0_8px_#cc97ff]" />}
          </div>

          {!isMobile && (
            <div
              onClick={() => openWindow('about')}
              className={`p-2.5 rounded-xl transition-all cursor-pointer group relative ${openWindows.includes('about') ? 'bg-os-secondary/10 border border-os-secondary/30' : 'hover:bg-os-surfaceContainerLow/50 border border-transparent'}`}
            >
              <CustomIcon icon={User} size={20} color={openWindows.includes('about') ? 'text-os-secondary' : 'text-os-onSurface group-hover:text-os-secondary'} glow={openWindows.includes('about') ? 'rgba(var(--os-secondary-rgb), 0.5)' : false} />
            </div>
          )}

          <div
            onClick={toggleControlCenter}
            className={`p-2.5 rounded-xl transition-all cursor-pointer group relative ${isControlCenterOpen ? 'bg-os-tertiary/10 border border-os-tertiary/30' : 'hover:bg-os-surfaceContainerLow/50 border border-transparent'}`}
          >
            {isControlCenterOpen ? (
              <CustomIcon icon={ChevronDown} size={20} color="text-os-tertiary" glow="rgba(var(--os-tertiary-rgb), 0.5)" />
            ) : (
              <CustomIcon icon={ChevronUp} size={20} color="text-os-onSurface group-hover:text-os-tertiary" />
            )}
            {isControlCenterOpen && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-os-tertiary shadow-[0_0_8px_var(--os-tertiary)]" />}
          </div>
        </div>

        {/* Separator */}
        <div className="h-8 w-px bg-os-outline/20 mx-2 md:mr-4" />

        {/* Apps Group (Center) */}
        <div className={`flex items-center ${isMobile ? 'space-x-0 overflow-x-auto scrollbar-hide flex-grow' : 'space-x-1 flex-grow justify-center px-2'}`}>
          {[
            { id: 'projects', icon: Code, color: 'text-os-secondary', shadow: '#00d2fd' },
            { id: 'skills',   icon: SlidersHorizontal, color: 'text-[#00f5a0]', shadow: '#00f5a0' },
            { id: 'cv',       icon: FileText, color: 'text-[#ff86c3]', shadow: '#ff86c3' },
            { id: 'media',    icon: Monitor, color: 'text-[#00d2fd]', shadow: '#00d2fd' },
            { id: 'photos',   icon: Wallpaper, color: 'text-[#ff86c3]', shadow: '#ff86c3' },
            { id: 'music',    icon: Music, color: 'text-os-primary', shadow: 'rgba(var(--os-primary-rgb), 1)' },
            { id: 'terminal', icon: null, text: '>_', shadow: 'rgba(255,255,255,0.5)' },
            { id: 'games',    icon: Gamepad2, color: 'text-os-tertiary', shadow: 'rgba(var(--os-tertiary-rgb), 1)' },
            { id: 'files',    icon: HardDrive, color: 'text-[#ffc86b]', shadow: '#ffc86b' },
            { id: 'settings', icon: SettingsIcon, color: 'text-[#9effc8]', shadow: '#9effc8' },
          ].map(({ id, icon: IconComponent, color, shadow, text }) => (
            <div
              key={id}
              onClick={() => openWindow(id)}
              className="relative p-3 hover:bg-os-surfaceContainerLow/50 rounded-2xl transition-all cursor-pointer group"
            >
              {IconComponent ? (
                <CustomIcon 
                  icon={IconComponent} 
                  size={isMobile ? 18 : 22} 
                  color={color} 
                  glow={openWindows.includes(id) ? shadow : false} 
                />
              ) : (
                <div className={`font-mono font-bold text-os-onSurfaceVariant px-1 ${isMobile ? 'text-sm' : ''}`}>{text}</div>
              )}
              {openWindows.includes(id) && (
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full`}
                  style={{ backgroundColor: shadow, boxShadow: `0 0 8px ${shadow}` }} />
              )}
            </div>
          ))}
        </div>

        {/* Separator */}
        {!isMobile && <div className="h-8 w-px bg-os-outline/20 ml-4 mr-4" />}

        {/* Time (Right) */}
        <div className={`flex flex-col items-center justify-center ${isMobile ? 'min-w-[50px] ml-2' : 'min-w-[70px] pr-2'} cursor-default select-none`}>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-bold text-os-onSurface leading-none mb-0.5`}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isMobile && (
            <span className="text-[10px] text-os-onSurfaceVariant font-bold tracking-tight uppercase leading-none">
              {time.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* App Launcher Flyout */}
      <AnimatePresence>
        {isAppLauncherOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={toggleAppLauncher} />
            <motion.div
              initial={isMobile ? { y: '100%', opacity: 0 } : { y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { y: 20, opacity: 0, scale: 0.95 }}
              className={`fixed ${isMobile ? 'bottom-0 left-0 right-0 w-full h-[85vh] rounded-t-[3rem]' : 'bottom-24 left-8 w-[400px] rounded-[2.5rem]'} bg-white/10 ${transparencyEffects ? 'backdrop-blur-[40px]' : ''} border border-white/10 p-6 z-[70] shadow-2xl overflow-hidden`}
            >
              <div className="absolute -top-24 -left-24 w-[300px] h-[300px] bg-os-primary/10 blur-[100px] rounded-full -z-10" />
              <div className="flex flex-col space-y-6 h-full">
                <div className="flex justify-between items-center px-2">
                  <h2 className="text-xl font-extrabold text-os-onSurface">Launcher</h2>
                  <div className="px-3 py-1 bg-os-primary/10 rounded-full border border-os-primary/20">
                    <span className="text-[10px] font-bold text-os-primary uppercase tracking-widest">v1.0.0</span>
                  </div>
                </div>
                
                <div className={`grid ${isMobile ? 'grid-cols-4' : 'grid-cols-4'} gap-4 overflow-y-auto pr-1`}>
                  {desktopIcons.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => { openWindow(app.id); toggleAppLauncher(); }}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-all cursor-pointer group"
                    >
                      <div className="p-3 bg-os-surfaceContainerLow/30 rounded-xl border border-white/5 group-hover:border-os-primary/30 transition-all mb-2">
                        {app.id === 'terminal' ? (
                          <div className="font-mono font-bold text-os-onSurfaceVariant text-xs">{'>_'}</div>
                        ) : (
                          <CustomIcon icon={app.icon.props.icon} size={20} color={app.icon.props.color} />
                        )}
                      </div>
                      <span className="text-[10px] text-os-onSurfaceVariant font-bold text-center truncate w-full">{app.title}</span>
                    </div>
                  ))}
                </div>
                
                <div className="h-px bg-white/5 mx-2" />
                
                <div className="mt-auto bg-white/5 rounded-3xl p-4 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-os-primary to-os-secondary p-0.5">
                      <div className="w-full h-full rounded-full bg-os-surfaceContainerHighest flex items-center justify-center overflow-hidden">
                        <User size={20} className="text-os-onSurface" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-os-onSurface">Abhimanyu Saxena</p>
                      <p className="text-[10px] text-os-onSurfaceVariant font-medium">System Administrator</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <div className="p-2 hover:bg-white/10 rounded-xl transition-all cursor-pointer" onClick={() => { openWindow('settings'); toggleAppLauncher(); }}>
                        <SettingsIcon size={16} className="text-os-onSurface" strokeWidth={2} />
                      </div>
                      <div className="p-2 hover:bg-red-500/20 rounded-xl transition-all cursor-pointer group/logout" onClick={() => { logout(); }}>
                        <Power size={16} className="text-os-onSurfaceVariant group-hover/logout:text-red-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Control Center Overlay */}
      <ControlCenter />

      {/* Screensaver */}
      <AnimatePresence>
        {isIdle && <Screensaver onDismiss={() => setIsIdle(false)} />}
      </AnimatePresence>

      {/* Spotlight Search Overlay */}
      <Spotlight />

      {/* Achievement Toasts */}
      <div className="fixed bottom-24 right-6 z-[2000] flex flex-col gap-4 items-end pointer-events-none">
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
