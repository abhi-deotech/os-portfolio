import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, User, ChevronUp, ChevronDown, 
  Code, SlidersHorizontal, FileText, Monitor, Wallpaper, Music, 
  Gamepad2, HardDrive, Settings as SettingsIcon, Home, Power
} from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';

const renderLauncherAppIcon = (app, size = 20) => {
  if (app.id === 'terminal') {
    return <div className={`font-mono font-bold text-os-onSurfaceVariant ${size > 20 ? 'text-sm' : 'text-xs'}`}>{'>_'}</div>;
  }
  
  const iconElement = app.icon;
  if (!iconElement) return null;

  // Case 1: Direct CustomIcon
  if (iconElement.type === CustomIcon) {
    return <CustomIcon icon={iconElement.props.icon} size={size} color={iconElement.props.color} />;
  }

  // Case 2: Wrapped in a div (e.g., Resume with badge)
  if (iconElement.props && iconElement.props.children) {
    const childrenArray = React.Children.toArray(iconElement.props.children);
    const customIcon = childrenArray.find(child => child && child.type === CustomIcon);
    if (customIcon) {
      return <CustomIcon icon={customIcon.props.icon} size={size} color={customIcon.props.color} />;
    }
  }

  return <div className="scale-75 origin-center">{iconElement}</div>;
};

const Taskbar = ({ desktopIcons }) => {
  const isMobile = useIsMobile();
  const [time, setTime] = useState(new Date());

  const openWindows = useOSStore(state => state.openWindows);
  const activeWindow = useOSStore(state => state.activeWindow);
  const openWindow = useOSStore(state => state.openWindow);
  const toggleControlCenter = useOSStore(state => state.toggleControlCenter);
  const isControlCenterOpen = useOSStore(state => state.isControlCenterOpen);
  const toggleAppLauncher = useOSStore(state => state.toggleAppLauncher);
  const isAppLauncherOpen = useOSStore(state => state.isAppLauncherOpen);
  const transparencyEffects = useOSStore(state => state.transparencyEffects);
  const logout = useOSStore(state => state.logout);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pinnedApps = [
    { id: 'projects', icon: Code, color: 'text-os-secondary', shadow: '#00d2fd' },
    { id: 'skills',   icon: SlidersHorizontal, color: 'text-[#00f5a0]', shadow: '#10b981' },
    { id: 'cv',       icon: FileText, color: 'text-[#ff86c3]', shadow: '#ff86c3' },
    { id: 'media',    icon: Monitor, color: 'text-[#00d2fd]', shadow: '#0ea5e9' },
    { id: 'photos',   icon: Wallpaper, color: 'text-[#ff86c3]', shadow: '#f472b6' },
    { id: 'music',    icon: Music, color: 'text-os-primary', shadow: 'rgba(var(--os-primary-rgb), 1)' },
    { id: 'terminal', icon: null, text: '>_', shadow: '#ffffff' },
    { id: 'games',    icon: Gamepad2, color: 'text-os-tertiary', shadow: 'rgba(var(--os-tertiary-rgb), 1)' },
    { id: 'files',    icon: HardDrive, color: 'text-[#ffc86b]', shadow: '#f59e0b' },
    { id: 'settings', icon: SettingsIcon, color: 'text-[#9effc8]', shadow: '#10b981' },
  ];

  const pinnedAppIds = pinnedApps.map(app => app.id);
  const unpinnedOpenApps = openWindows
    .filter(id => !pinnedAppIds.includes(id) && id !== 'about')
    .map(id => {
      const appInfo = desktopIcons.find(icon => icon.id === id);
      if (!appInfo) return null;
      
      let appIcon = null;
      let appColor = 'text-os-onSurface';
      
      if (appInfo.icon) {
        if (appInfo.icon.type === CustomIcon) {
          appIcon = appInfo.icon.props.icon;
          appColor = appInfo.icon.props.color;
        } else if (appInfo.icon.props && appInfo.icon.props.children) {
          const childrenArray = React.Children.toArray(appInfo.icon.props.children);
          const customIcon = childrenArray.find(child => child && child.type === CustomIcon);
          if (customIcon) {
            appIcon = customIcon.props.icon;
            appColor = customIcon.props.color;
          }
        }
      }

      return {
        id,
        icon: appIcon,
        color: appColor,
        shadow: 'rgba(var(--os-primary-rgb), 1)',
        text: id === 'terminal' ? '>_' : null
      };
    })
    .filter(app => app !== null);

  const allDockApps = [...pinnedApps, ...unpinnedOpenApps];

  const featuredApps = desktopIcons.filter(app => ['about', 'cv', 'projects', 'terminal'].includes(app.id));
  const otherApps = desktopIcons.filter(app => !['about', 'cv', 'projects', 'terminal'].includes(app.id));

  return (
    <>
      <div 
        className={`fixed ${isMobile ? 'bottom-safe-bottom left-0 right-0 w-full mb-1 h-20 rounded-t-3xl border-t' : 'bottom-6 left-1/2 -translate-x-1/2 h-16 rounded-3xl border min-w-[400px]'} bg-white/5 ${transparencyEffects ? 'backdrop-blur-3xl' : ''} border-white/10 flex items-center px-4 justify-between z-50 shadow-2xl transition-all duration-500`}
      >
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

        <div className="h-8 w-px bg-os-outline/20 mx-2 md:mr-4" />

        <div className={`flex items-center ${isMobile ? 'space-x-1 overflow-x-auto scrollbar-hide flex-grow' : 'space-x-1 flex-grow justify-center px-2'}`}>
          {allDockApps.map(({ id, icon: IconComponent, color, shadow, text }) => {
            const isOpen = openWindows.includes(id);
            const isActive = activeWindow === id;

            return (
              <div
                key={id}
                onClick={() => openWindow(id)}
                className={`relative p-2.5 transition-all duration-300 cursor-pointer group flex items-center justify-center rounded-2xl ${isActive ? 'bg-white/10 shadow-[inset_0_0_12px_rgba(255,255,255,0.05)]' : 'hover:bg-os-surfaceContainerLow/50'}`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105 group-active:scale-95'}`}>
                  {IconComponent ? (
                    <CustomIcon 
                      icon={IconComponent} 
                      size={isMobile ? 18 : 22} 
                      color={color} 
                      glow={isActive ? shadow : false} 
                    />
                  ) : (
                    <div className={`font-mono font-bold text-os-onSurfaceVariant px-1 ${isMobile ? 'text-sm' : ''}`}>{text}</div>
                  )}
                </div>
                
                {isOpen && (
                  <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full transition-all duration-500 ${isActive ? 'w-2 h-1 animate-pulse' : 'w-1 h-1'}`}
                    style={{ 
                      backgroundColor: shadow || 'rgba(var(--os-primary-rgb), 1)', 
                      boxShadow: `0 0 10px ${shadow || 'rgba(var(--os-primary-rgb), 1)'}`,
                      opacity: 0.8
                    }} 
                  />
                )}
              </div>
            );
          })}
        </div>

        {!isMobile && <div className="h-8 w-px bg-os-outline/20 ml-4 mr-4" />}

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

      <AnimatePresence>
        {isAppLauncherOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={toggleAppLauncher} />
            <motion.div
              initial={isMobile ? { y: '100%', opacity: 0 } : { y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={isMobile ? { y: '100%', opacity: 0 } : { y: 20, opacity: 0, scale: 0.95 }}
              className={`fixed ${isMobile ? 'bottom-safe-bottom left-0 right-0 w-full mb-1 h-[85vh] rounded-t-[3rem]' : 'bottom-24 left-8 w-[400px] rounded-[2.5rem]'} bg-white/10 ${transparencyEffects ? 'backdrop-blur-[40px]' : ''} border border-white/10 p-6 z-[70] shadow-2xl overflow-hidden`}
            >
              <div className="absolute -top-24 -left-24 w-[300px] h-[300px] bg-os-primary/10 blur-[100px] rounded-full -z-10" />
              <div className="flex flex-col space-y-4 h-full">
                <div className="flex justify-between items-center px-2">
                  <h2 className="text-xl font-extrabold text-os-onSurface">Launcher</h2>
                  <div className="px-3 py-1 bg-os-primary/10 rounded-full border border-os-primary/20">
                    <span className="text-[10px] font-bold text-os-primary uppercase tracking-widest">v1.0.0</span>
                  </div>
                </div>
                
                <div className="space-y-3 flex-grow overflow-hidden flex flex-col">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-widest text-os-primary opacity-60">
                      <div className="w-1 h-1 rounded-full bg-os-primary shadow-[0_0_8px_var(--os-primary)] animate-pulse" />
                      <span>Featured Apps</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {featuredApps.map((app) => (
                        <div
                          key={app.id}
                          onClick={() => { openWindow(app.id); toggleAppLauncher(); }}
                          className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-all cursor-pointer group"
                        >
                          <div className="p-3 bg-os-primary/10 rounded-2xl border border-os-primary/20 group-hover:bg-os-primary/20 group-hover:border-os-primary/40 transition-all mb-1 flex items-center justify-center">
                            {renderLauncherAppIcon(app, 22)}
                          </div>
                          <span className="text-[10px] text-os-primary font-black text-center truncate w-full">{app.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-white/5 mx-2" />

                  <div className="space-y-1.5 flex-grow overflow-hidden flex flex-col">
                    <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-widest text-os-onSurfaceVariant opacity-40">
                      <span>General</span>
                    </div>
                    <div className={`grid grid-cols-4 gap-3 overflow-y-auto pr-1 flex-grow pb-2 scrollbar-hide`}>
                      {otherApps.map((app) => (
                        <div
                          key={app.id}
                          onClick={() => { openWindow(app.id); toggleAppLauncher(); }}
                          className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/5 active:bg-white/10 transition-all cursor-pointer group"
                        >
                          <div className="p-2.5 bg-os-surfaceContainerLow/30 rounded-xl border border-white/5 group-hover:border-os-primary/30 transition-all mb-1">
                            {renderLauncherAppIcon(app, 18)}
                          </div>
                          <span className="text-[10px] text-os-onSurfaceVariant font-bold text-center truncate w-full">{app.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
    </>
  );
};

export default Taskbar;
