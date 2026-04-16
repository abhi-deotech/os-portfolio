import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, FileText, Code, HardDrive, Gamepad2, Monitor, Music, Wallpaper, 
  Activity, Mail, MessageSquare, Settings as SettingsIcon, Trophy, Globe, Brain, Book, SlidersHorizontal 
} from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';

const Desktop = ({ onIconContextMenu }) => {
  const isMobile = useIsMobile();
  const openWindow = useOSStore(state => state.openWindow);
  const iconPositions = useOSStore(state => state.iconPositions);
  const setIconPosition = useOSStore(state => state.setIconPosition);
  const setIsDragging = useOSStore(state => state.setIsDragging);

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
    { id: 'settings', title: 'Settings',     icon: <CustomIcon icon={SettingsIcon} size={isMobile ? 32 : 28}   color="text-[#9effc8]" glow="rgba(158,255,200,0.3)" strokeWidth={2.5} /> },
    { id: 'notepad',  title: 'Notepad',      icon: <CustomIcon icon={FileText} size={isMobile ? 32 : 28}      color="text-cyan-400" glow="rgba(34,211,238,0.3)" strokeWidth={2.5} /> },
    { id: 'taskmanager', title: 'Monitor',   icon: <CustomIcon icon={Activity} size={isMobile ? 32 : 28}      color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'achievements', title: 'Honors',   icon: <CustomIcon icon={Trophy} size={isMobile ? 32 : 28}        color="text-yellow-400" glow="rgba(250,204,21,0.3)" strokeWidth={2.5} /> },
    { id: 'browser',    title: 'Flow-Net',   icon: <CustomIcon icon={Globe} size={isMobile ? 32 : 28}         color="text-[#00d2fd]" glow="rgba(0,210,253,0.3)" strokeWidth={2.5} /> },
    { id: 'aichat',     title: 'Lumina AI',  icon: <CustomIcon icon={Brain} size={isMobile ? 32 : 28}        color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> },
    { id: 'documentation', title: 'Documentation', icon: <CustomIcon icon={Book} size={isMobile ? 32 : 28}     color="text-[#9effc8]" glow="rgba(158,255,200,0.3)" strokeWidth={2.5} /> },
    { id: 'skills',     title: 'Skills',      icon: <CustomIcon icon={SlidersHorizontal} size={isMobile ? 32 : 28} color="text-[#00f5a0]" glow="rgba(0,245,160,0.3)" strokeWidth={2.5} /> },
  ];

  return (
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
              onContextMenu={(e) => onIconContextMenu(e, icon.id)}
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
    </div>
  );
};

export default Desktop;
