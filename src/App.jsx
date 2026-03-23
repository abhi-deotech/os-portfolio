import React, { useState, useEffect, useRef } from 'react';
import {
  User, Code, FileText, LayoutGrid, Gamepad2, MousePointer2,
  Settings as SettingsIcon, ChevronUp, ChevronDown, HardDrive,
  Wallpaper, FolderPlus, RefreshCw
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
import Settings from './components/Settings';
import LiveWallpaper from './components/LiveWallpaper';
import FileExplorer from './components/FileExplorer';
import useOSStore from './store/osStore';
import './index.css';

const DESKTOP_MENU_ID = 'desktop-context-menu';
const ICON_MENU_ID = 'icon-context-menu';

function App() {
  const {
    openWindows, openWindow, toggleControlCenter, isControlCenterOpen,
    toggleAppLauncher, isAppLauncherOpen, activeAccent,
    iconPositions, setIconPosition, resetIconPositions,
    createFolder, setIsDragging,
  } = useOSStore();

  const [time, setTime] = useState(new Date());
  const [hoveredIconId, setHoveredIconId] = useState(null);
  const contextMenuIconRef = useRef(null);

  const { show: showDesktopMenu } = useContextMenu({ id: DESKTOP_MENU_ID });
  const { show: showIconMenu } = useContextMenu({ id: ICON_MENU_ID });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const desktopIcons = [
    { id: 'about',    title: 'About Me',     icon: <CustomIcon icon={User} size={28}           color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" /> },
    { id: 'projects', title: 'Projects',     icon: <CustomIcon icon={Code} size={28}           color="text-os-secondary" glow="rgba(var(--os-secondary-rgb), 0.3)" /> },
    { id: 'terminal', title: 'Terminal',     icon: <div className="font-mono font-bold text-os-onSurfaceVariant text-xl">{'>_'}</div> },
    { id: 'games',    title: 'Games',        icon: <CustomIcon icon={Gamepad2} size={28}       color="text-os-tertiary" glow="rgba(var(--os-tertiary-rgb), 0.3)" /> },
    { id: 'snake',    title: 'Snake Retro',  icon: <CustomIcon icon={Gamepad2} size={28}       color="text-[#cc97ff]" glow="rgba(204,151,255,0.3)" /> },
    { id: 'memory',   title: 'Memory Match', icon: <CustomIcon icon={MousePointer2} size={28}  color="text-[#00d2fd]" glow="rgba(0,210,253,0.3)" /> },
    { id: 'settings', title: 'Settings',     icon: <CustomIcon icon={SettingsIcon} size={28}   color="text-[#9effc8]" glow="rgba(158,255,200,0.3)" /> },
    { id: 'cv',       title: 'Resume',       icon: <CustomIcon icon={FileText} size={28}       color="text-[#ff86c3]" glow="rgba(255,134,195,0.3)" /> },
    { id: 'files',    title: 'Files',        icon: <CustomIcon icon={HardDrive} size={28}      color="text-[#ffc86b]" glow="rgba(255,200,107,0.3)" /> },
  ];

  const accentColorsMap = {
    purple:  { primary: '204, 151, 255', secondary: '0, 210, 253',   tertiary: '0, 245, 160'   },
    cyan:    { primary: '0, 210, 253',   secondary: '204, 151, 255', tertiary: '255, 104, 240' },
    magenta: { primary: '255, 104, 240', secondary: '204, 151, 255', tertiary: '0, 210, 253'   },
    green:   { primary: '0, 245, 160',   secondary: '0, 210, 253',   tertiary: '204, 151, 255' },
  };

  const currentAccent = accentColorsMap[activeAccent] || accentColorsMap.purple;

  const handleDesktopContextMenu = (e) => {
    e.preventDefault();
    showDesktopMenu({ event: e });
  };

  const handleIconContextMenu = (e, iconId) => {
    e.preventDefault();
    e.stopPropagation();
    contextMenuIconRef.current = iconId;
    showIconMenu({ event: e });
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden font-sans select-none flex flex-col relative text-os-onSurface transition-all duration-500"
      style={{
        '--os-primary-rgb':   currentAccent.primary,
        '--os-secondary-rgb': currentAccent.secondary,
        '--os-tertiary-rgb':  currentAccent.tertiary,
      }}
      onContextMenu={handleDesktopContextMenu}
    >
      <LiveWallpaper />

      {/* Context Menus — Desktop */}
      <Menu id={DESKTOP_MENU_ID} animation="fade" theme="dark" className="os-context-menu">
        <Item onClick={() => openWindow('settings')}>
          <CustomIcon icon={SettingsIcon} size={13} color="text-os-onSurfaceVariant" className="mr-2" animate={false} /> Change Wallpaper…
        </Item>
        <Item onClick={() => createFolder(`New Folder`)}>
          <CustomIcon icon={FolderPlus} size={13} color="text-os-onSurfaceVariant" className="mr-2" animate={false} /> New Folder
        </Item>
        <Separator />
        <Item onClick={resetIconPositions}>
          <CustomIcon icon={RefreshCw} size={13} color="text-os-onSurfaceVariant" className="mr-2" animate={false} /> Reset Icon Layout
        </Item>
      </Menu>

      {/* Context Menus — Icon */}
      <Menu id={ICON_MENU_ID} animation="fade" theme="dark" className="os-context-menu">
        <Item onClick={() => openWindow(contextMenuIconRef.current)}>
          Open
        </Item>
      </Menu>

      {/* Ambient Neo-Glows */}
      <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-os-primaryDim/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-os-secondaryDim/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* Desktop - Draggable Icons */}
      <div className="flex-grow relative z-0 overflow-hidden">
        {desktopIcons.map((icon, index) => {
          // Default grid: 2 columns, each cell 128px wide x 120px tall, starting at (40, 40)
          const col = Math.floor(index / 5); // 5 rows per column
          const row = index % 5;
          const defaultX = 40 + col * 128;
          const defaultY = 40 + row * 120;

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
                // info.point is absolute screen coords; we add the drag offset to the start
                const newX = startX + info.offset.x;
                const newY = startY + info.offset.y;
                setIconPosition(icon.id, { x: newX, y: newY });
              }}
              whileDrag={{ scale: 1.1, zIndex: 100, cursor: 'grabbing' }}
              onDoubleClick={() => openWindow(icon.id)}
              onContextMenu={(e) => handleIconContextMenu(e, icon.id)}
              onHoverStart={() => setHoveredIconId(icon.id)}
              onHoverEnd={() => setHoveredIconId(null)}
              className="absolute flex flex-col items-center justify-start p-2 rounded-xl hover:bg-os-surfaceContainerHighest/40 transition-colors cursor-grab w-28 text-center"
            >
              <div className="mb-3 p-4 bg-os-surfaceContainerLow/30 backdrop-blur-md rounded-2xl border border-os-outline/10 hover:border-os-outline/30 shadow-lg transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                {icon.icon}
              </div>
              <AnimatePresence>
                {hoveredIconId === icon.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                    className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-os-surfaceContainerHighest/90 backdrop-blur-md text-os-onSurface text-[10px] font-medium px-2 py-1 rounded-lg border border-white/10 shadow-lg whitespace-nowrap pointer-events-none z-50"
                  >
                    {icon.title}
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="text-xs text-os-onSurfaceVariant font-medium drop-shadow-md px-2 py-0.5 rounded hover:bg-os-surfaceContainerHighest/50 hover:text-os-onSurface transition-colors">
                {icon.title}
              </span>
            </motion.div>
          );
        })}
      </div>


      {/* Windows Layer */}
      <div className="absolute inset-0 pointer-events-none z-10 p-24 flex items-center justify-center">
        <div className="relative w-full h-full pointer-events-none flex items-center justify-center">

          {openWindows.includes('about') && (
            <Window id="about" title="About Me" width={950} height={650}>
              <div className="flex flex-col h-full relative p-8">
                <h1 className="font-display text-4xl font-extrabold mb-2 bg-gradient-to-r from-os-primary to-os-secondary bg-clip-text text-transparent w-fit">
                  Abhimanyu Saxena.
                </h1>
                <p className="text-os-onSurfaceVariant text-lg max-w-2xl leading-relaxed mb-6 font-light">
                  Passionate and versatile Software Engineer | Team Lead with nearly 3 years in end-to-end application development.
                </p>
                <h3 className="font-display font-bold text-os-onSurface mb-3 text-sm uppercase tracking-widest opacity-50">Core Arsenal</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["JavaScript", "React.js", "C++", "Python", "Docker", "Git", "IoT"].map(skill => (
                    <div key={skill} className="px-3 py-1 rounded-full text-xs font-semibold bg-transparent border border-os-secondary/30 text-os-secondary shadow-[0_0_10px_rgba(0,210,253,0.1)]">
                      {skill}
                    </div>
                  ))}
                </div>
                <h3 className="font-display font-bold text-os-onSurface mb-3 text-sm uppercase tracking-widest opacity-50">Experience</h3>
                <div className="flex flex-col space-y-3 overflow-y-auto pr-2 pb-4">
                  {[
                    { company: 'Deotechsolutions', role: 'Software Engineer | Team Lead', period: '2025 - Present' },
                    { company: 'LendFoundry', role: 'Software Engineer', period: '2021 - 2024' },
                  ].map((exp) => (
                    <div key={exp.company} className="bg-os-surfaceContainerLow/30 p-4 rounded-xl border border-os-outline/10">
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-os-onSurface">{exp.company}</h4>
                        <span className="text-xs text-os-primary font-mono bg-os-primary/10 px-2 py-0.5 rounded">{exp.period}</span>
                      </div>
                      <p className="text-sm text-os-onSurfaceVariant">{exp.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Window>
          )}

          {openWindows.includes('projects') && (
            <Window id="projects" title="Projects" width={1050} height={700}>
              <div className="grid grid-cols-2 gap-6 h-full p-8">
                {[
                  { title: "Vibe OS", stack: "React, Tailwind, Framer", color: "os-primary" },
                  { title: "MERN Dashboard", stack: "MongoDB, Express, React, Node", color: "os-secondary" },
                  { title: "IoT Controller", stack: "Python, MQTT, C++", color: "os-tertiary" },
                  { title: "Smart Home UI", stack: "Vite, Next.js, HSL", color: "os-secondary" }
                ].map((p, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -8 }}
                    className="os-card-glow bg-os-surfaceContainerLow/50 backdrop-blur-md rounded-2xl border border-os-outline/10 hover:border-os-primary/50 hover:bg-os-surfaceContainerHighest/80 transition-all p-6 flex flex-col justify-end group cursor-pointer shadow-lg aspect-video h-48 relative overflow-hidden"
                  >
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent z-0" />
                    <div className="relative z-10">
                      <h3 className={`font-display font-extrabold text-xl mb-1 text-os-onSurface group-hover:text-${p.color} transition-colors`}>{p.title}</h3>
                      <p className="text-xs text-os-onSurfaceVariant font-medium uppercase tracking-wider">{p.stack}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Window>
          )}

          {openWindows.includes('terminal') && (
            <Window id="terminal" title="Vibe Terminal" width={850} height={550}>
              <div className="p-8 h-full">
                <Terminal />
              </div>
            </Window>
          )}

          {openWindows.includes('games') && (
            <Window id="games" title="Game Center" width={1200} height={800}>
              <div className="h-full w-full"><Games /></div>
            </Window>
          )}

          {openWindows.includes('snake') && (
            <Window id="snake" title="Snake Retro" width={750} height={750}>
              <div className="h-full w-full">
                <Snake onBack={() => useOSStore.getState().closeWindow('snake')} />
              </div>
            </Window>
          )}

          {openWindows.includes('memory') && (
            <Window id="memory" title="Memory Match" width={950} height={700}>
              <div className="h-full w-full">
                <MemoryGame onBack={() => useOSStore.getState().closeWindow('memory')} />
              </div>
            </Window>
          )}

          {openWindows.includes('settings') && (
            <Window id="settings" title="System Settings" width={950} height={650}>
              <div className="h-full w-full"><Settings /></div>
            </Window>
          )}

          {openWindows.includes('cv') && (
            <Window id="cv" title="Resume.pdf" width={900} height={800}>
              <div className="h-full w-full bg-white flex items-center justify-center overflow-hidden">
                <iframe src="/Abhimanyu.pdf" title="Abhimanyu Saxena Resume" className="w-full h-full border-0" />
              </div>
            </Window>
          )}

          {openWindows.includes('files') && (
            <Window id="files" title="File Explorer" width={780} height={560}>
              <div className="h-full w-full">
                <FileExplorer />
              </div>
            </Window>
          )}

        </div>
      </div>

      {/* The Taskbar (Bottom Dock) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 h-16 bg-os-surfaceContainerHighest/50 backdrop-blur-[40px] border border-os-outline/10 rounded-3xl flex items-center px-4 justify-between z-50 shadow-2xl min-w-[400px]">
        {/* System & App Launcher Group (Left) */}
        <div className="flex items-center bg-black/20 rounded-2xl p-1 gap-1 border border-white/5 mr-4">
          <div
            onClick={toggleAppLauncher}
            className={`p-2.5 rounded-xl transition-all cursor-pointer group relative ${isAppLauncherOpen ? 'bg-os-primary/10 border border-os-primary/30' : 'hover:bg-os-surfaceContainerLow/50 border border-transparent'}`}
          >
            <CustomIcon icon={LayoutGrid} size={20} color={isAppLauncherOpen ? 'text-os-primary' : 'text-os-onSurface group-hover:text-os-primary'} glow={isAppLauncherOpen ? 'rgba(var(--os-primary-rgb), 0.5)' : false} />
            {isAppLauncherOpen && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-os-primary shadow-[0_0_8px_#cc97ff]" />}
          </div>

          <div
            onClick={() => openWindow('about')}
            className={`p-2.5 rounded-xl transition-all cursor-pointer group relative ${openWindows.includes('about') ? 'bg-os-secondary/10 border border-os-secondary/30' : 'hover:bg-os-surfaceContainerLow/50 border border-transparent'}`}
          >
            <CustomIcon icon={User} size={20} color={openWindows.includes('about') ? 'text-os-secondary' : 'text-os-onSurface group-hover:text-os-secondary'} glow={openWindows.includes('about') ? 'rgba(var(--os-secondary-rgb), 0.5)' : false} />
          </div>

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
        <div className="h-8 w-px bg-os-outline/20 mr-4" />

        {/* Apps Group (Center) */}
        <div className="flex items-center space-x-1 flex-grow justify-center px-2">
          {[
            { id: 'projects', icon: Code, color: 'text-os-secondary', shadow: '#00d2fd' },
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
                  size={22} 
                  color={color} 
                  glow={openWindows.includes(id) ? shadow : false} 
                />
              ) : (
                <div className="font-mono font-bold text-os-onSurfaceVariant px-1">{text}</div>
              )}
              {openWindows.includes(id) && (
                <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full`}
                  style={{ backgroundColor: shadow, boxShadow: `0 0 8px ${shadow}` }} />
              )}
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="h-8 w-px bg-os-outline/20 ml-4 mr-4" />

        {/* Time (Right) */}
        <div className="flex flex-col items-center justify-center min-w-[70px] cursor-default select-none pr-2">
          <span className="text-sm font-bold text-os-onSurface leading-none mb-0.5">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-[10px] text-os-onSurfaceVariant font-bold tracking-tight uppercase leading-none">
            {time.toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* App Launcher Flyout */}
      <AnimatePresence>
        {isAppLauncherOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={toggleAppLauncher} />
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              className="fixed bottom-24 left-8 w-[400px] bg-os-surfaceContainerHighest/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 z-[70] shadow-2xl overflow-hidden"
            >
              <div className="absolute -top-24 -left-24 w-[300px] h-[300px] bg-os-primary/10 blur-[100px] rounded-full -z-10" />
              <div className="flex flex-col space-y-6">
                <div className="flex justify-between items-center px-2">
                  <h2 className="text-xl font-extrabold text-os-onSurface">Launcher</h2>
                  <div className="px-3 py-1 bg-os-primary/10 rounded-full border border-os-primary/20">
                    <span className="text-[10px] font-bold text-os-primary uppercase tracking-widest">v1.0.0</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {desktopIcons.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => { openWindow(app.id); toggleAppLauncher(); }}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group"
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
                <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
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
                    <div className="ml-auto p-2 hover:bg-white/10 rounded-xl transition-all cursor-pointer" onClick={() => openWindow('settings')}>
                      <CustomIcon icon={SettingsIcon} size={16} color="text-os-onSurfaceVariant" />
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
    </div>
  );
}

export default App;
