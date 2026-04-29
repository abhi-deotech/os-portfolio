import React from 'react';
import { 
  User, FileText, Code, HardDrive, Gamepad2, Monitor, Music, Image as Wallpaper, 
  Activity, Mail, MessageSquare, Settings as SettingsIcon, Trophy, Globe, Brain, Book, SlidersHorizontal 
} from 'lucide-react';
import CustomIcon from '../components/common/CustomIcon';

/**
 * Centralized application configuration for Lumina OS.
 * All apps should be defined here to ensure consistency across Desktop, Taskbar, and App Launcher.
 */
export const APPS = [
  { 
    id: 'about',    
    title: 'About Me',     
    icon: (size, color) => <CustomIcon icon={User} size={size} color={color || "text-os-primary"} glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} />,
    featured: true,
    pinned: false 
  },
  { 
    id: 'cv',       
    title: 'Resume',       
    icon: (size) => (
      <div className="relative">
        <CustomIcon icon={FileText} size={size} color="text-[#ff86c3]" glow="rgba(255,134,195,0.6)" strokeWidth={2.5} />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-os-primary rounded-full border-2 border-os-surfaceContainerLow animate-pulse"></div>
      </div>
    ),
    featured: true,
    pinned: true,
    shadow: '#ff86c3'
  },
  { 
    id: 'projects', 
    title: 'Projects',     
    icon: (size, color) => <CustomIcon icon={Code} size={size} color={color || "text-os-secondary"} glow="rgba(var(--os-secondary-rgb), 0.3)" strokeWidth={2.5} />,
    featured: true,
    pinned: true,
    shadow: '#00d2fd'
  },
  { 
    id: 'terminal', 
    title: 'Terminal',     
    icon: (size) => <div className={`font-mono font-bold text-os-onSurfaceVariant ${size > 28 ? 'text-2xl' : 'text-xl'}`}>{'>_'}</div>,
    featured: true,
    pinned: true,
    shadow: '#ffffff'
  },
  { 
    id: 'files',    
    title: 'Files',        
    icon: (size) => <CustomIcon icon={HardDrive} size={size} color="text-[#ffc86b]" glow="rgba(255,200,107,0.3)" strokeWidth={2.5} />,
    pinned: true,
    shadow: '#f59e0b'
  },
  { 
    id: 'games',    
    title: 'Game Center',  
    icon: (size) => <CustomIcon icon={Gamepad2} size={size} color="text-os-tertiary" glow="rgba(var(--os-tertiary-rgb), 0.3)" strokeWidth={2.5} />,
    pinned: true,
    shadow: 'rgba(var(--os-tertiary-rgb), 1)'
  },
  { 
    id: 'media',    
    title: 'Media',        
    icon: (size) => <CustomIcon icon={Monitor} size={size} color="text-[#00d2fd]" glow="rgba(0,210,253,0.3)" strokeWidth={2.5} />,
    pinned: true,
    shadow: '#0ea5e9'
  },
  { 
    id: 'music',    
    title: 'Music',        
    icon: (size) => <CustomIcon icon={Music} size={size} color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} />,
    pinned: true,
    shadow: 'rgba(var(--os-primary-rgb), 1)'
  },
  { 
    id: 'photos',   
    title: 'Photos',       
    icon: (size) => <CustomIcon icon={Wallpaper} size={size} color="text-[#ff86c3]" glow="rgba(255,134,195,0.3)" strokeWidth={2.5} />,
    pinned: true,
    shadow: '#f472b6'
  },
  { 
    id: 'benchmark', 
    title: 'Benchmark',    
    icon: (size) => <CustomIcon icon={Activity} size={size} color="text-[#00f5a0]" glow="rgba(0,245,160,0.3)" strokeWidth={2.5} /> 
  },
  { 
    id: 'mail',     
    title: 'Mail',         
    icon: (size) => <CustomIcon icon={Mail} size={size} color="text-[#00f5a0]" glow="rgba(0,245,160,0.3)" strokeWidth={2.5} /> 
  },
  { 
    id: 'chat',     
    title: 'Guestbook',    
    icon: (size) => <CustomIcon icon={MessageSquare} size={size} color="text-[#cc97ff]" glow="rgba(204,151,255,0.3)" strokeWidth={2.5} /> 
  },
  { 
    id: 'retroarcade', 
    title: 'Retro Arcade', 
    icon: (size) => <CustomIcon icon={Gamepad2} size={size} color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> 
  },
  { 
    id: 'settings', 
    title: 'Settings',     
    icon: (size) => <CustomIcon icon={SettingsIcon} size={size} color="text-[#9effc8]" glow="rgba(158,255,200,0.3)" strokeWidth={2.5} />,
    pinned: true,
    shadow: '#10b981'
  },
  { 
    id: 'notepad',  
    title: 'Notepad',      
    icon: (size) => <CustomIcon icon={FileText} size={size} color="text-cyan-400" glow="rgba(34,211,238,0.3)" strokeWidth={2.5} /> 
  },
  { 
    id: 'taskmanager', 
    title: 'Monitor',   
    icon: (size) => <CustomIcon icon={Activity} size={size} color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> 
  },
  { 
    id: 'achievements', 
    title: 'Honors',   
    icon: (size) => <CustomIcon icon={Trophy} size={size} color="text-yellow-400" glow="rgba(250,204,21,0.3)" strokeWidth={2.5} /> 
  },
  { 
    id: 'browser',    
    title: 'Flow-Net',   
    icon: (size) => <CustomIcon icon={Globe} size={size} color="text-[#00d2fd]" glow="rgba(0,210,253,0.3)" strokeWidth={2.5} /> 
  },
  { 
    id: 'aichat',     
    title: 'Lumina AI',  
    icon: (size) => <CustomIcon icon={Brain} size={size} color="text-os-primary" glow="rgba(var(--os-primary-rgb), 0.3)" strokeWidth={2.5} /> 
  },
  { 
    id: 'documentation', 
    title: 'Documentation', 
    icon: (size) => <CustomIcon icon={Book} size={size} color="text-[#9effc8]" glow="rgba(158,255,200,0.3)" strokeWidth={2.5} /> 
  },
  { 
    id: 'skills',     
    title: 'Skills',      
    icon: (size) => <CustomIcon icon={SlidersHorizontal} size={size} color="text-[#00f5a0]" glow="rgba(0,245,160,0.3)" strokeWidth={2.5} />,
    pinned: true,
    shadow: '#10b981'
  },
];
