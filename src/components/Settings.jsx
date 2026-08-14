import React, { useState } from 'react';
import Appearance from './settings/Appearance';
import DesignLanguage from './sdl/DesignLanguage';
import DL_SECTIONS from './sdl/sections';
import { SDL_VERSION, SDL_AUTHOR } from '../theme/registry';
import {
  Settings as SettingsIcon,
  Palette,
  User,
  Cpu,
  Sun,
  ChevronLeft,
  RefreshCw,
  Download,
  Upload,
  Cloud
} from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import useSystemMetrics from '../hooks/useSystemMetrics';

const Settings = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('appearance');
  const [showSidebar, setShowSidebar] = useState(true);
  const {
    isPuterSignedIn,
    puterUser,
    isPuterConnecting,
    signInWithPuter,
    signOutPuter,
    syncFilesToPuter,
    loadFilesFromPuter,
    syncPrefsToPuter,
    loadPrefsFromPuter,
    lastSyncTime
  } = useOSStore();
  const metrics = useSystemMetrics();

  // Two labelled groups rather than four flat tabs. The Design Language group is the showcase;
  // it shares the same store and the same controls as Appearance — it documents the thing you are
  // actually operating, rather than sitting beside it as a museum wing.
  //
  // "Desktop" is gone. It was a second personalization pane that duplicated wallpaper AND
  // transparency, and still offered the four pre-SDL accent swatches that sixteen colorways had
  // made meaningless. Everything real about it now lives in Appearance, exactly once.
  const tabGroups = [
    {
      id: 'system', label: 'System', items: [
        { id: 'appearance', icon: Palette, label: 'Appearance' },
        { id: 'system', icon: Cpu, label: 'System' },
        { id: 'user', icon: User, label: 'Account & Sync' },
      ],
    },
    {
      id: 'dl', label: 'Design Language', items: DL_SECTIONS.map((sec) => ({ id: sec.id, icon: Sun, label: sec.label })),
    },
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (isMobile) setShowSidebar(false);
  };

  const renderSystem = () => {
    // metrics are now passed from the top-level scope
    
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-2">System</h2>
          <p className="text-os-onSurfaceVariant text-sm">Hardware utilization and OS architecture details.</p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <section className="p-6 md:p-8 rounded-[2rem] bg-os-surfaceContainerLow/30 border border-os-outline/10 backdrop-blur-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-full md:w-[400px] h-full bg-gradient-to-l from-sdl-accent/5 to-transparent pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-8">
                      <div className="flex flex-col">
                        <span className="text-2xl md:text-3xl font-black font-display text-sdl-accent">Lumina OS</span>
                        <span className="text-xs md:text-sm font-semibold text-os-onSurfaceVariant">Version 1.0.0</span>
                      </div>
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-os-primary/20 to-os-secondary/20 border border-os-outline/10 flex items-center justify-center shadow-[0_0_30px_rgb(var(--sdl-accent-rgb)/0.15)]">
                          <CustomIcon icon={Cpu} size={isMobile ? 24 : 28} color="text-os-onSurface" glow="rgb(var(--os-primary-rgb) / 0.3)" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-os-surfaceContainerHighest/50">
                          <span className="block text-xs text-os-onSurfaceVariant mb-1">Architecture</span>
                          <span className="block text-sm font-semibold">Web-Native Edge</span>
                      </div>
                      <div className="p-4 rounded-xl bg-os-surfaceContainerHighest/50">
                          <span className="block text-xs text-os-onSurfaceVariant mb-1">Rendering Engine</span>
                          <span className="block text-sm font-semibold">React + Vite + WebGL</span>
                      </div>
                  </div>
              </section>

              <section className="p-6 rounded-[2rem] bg-os-surfaceContainerLow/30 border border-os-outline/10 backdrop-blur-md">
                 <h3 className="text-lg font-bold mb-6">Device Specifications</h3>
                 <div className="space-y-4">
                     <div className="flex flex-col md:flex-row border-b border-os-outline/5 pb-4 last:border-0 last:pb-0 gap-1 md:gap-0">
                         <div className="w-full md:w-1/3 text-xs md:text-sm text-os-onSurfaceVariant font-medium">Processor</div>
                         <div className="w-full md:w-2/3 text-xs md:text-sm font-semibold">{metrics.cores} Core Web-Optimized CPU</div>
                     </div>
                     <div className="flex flex-col md:flex-row border-b border-os-outline/5 pb-4 last:border-0 last:pb-0 gap-1 md:gap-0">
                         <div className="w-full md:w-1/3 text-xs md:text-sm text-os-onSurfaceVariant font-medium">Installed RAM</div>
                         <div className="w-full md:w-2/3 text-xs md:text-sm font-semibold">{metrics.ramGb}.0 GB (Physical Memory)</div>
                     </div>
                     <div className="flex flex-col md:flex-row border-b border-os-outline/5 pb-4 last:border-0 last:pb-0 gap-1 md:gap-0">
                         <div className="w-full md:w-1/3 text-xs md:text-sm text-os-onSurfaceVariant font-medium">System Type</div>
                         <div className="w-full md:w-2/3 text-xs md:text-sm font-semibold">{metrics.agent} Architecture</div>
                     </div>
                 </div>
              </section>
          </div>

          <div className="space-y-6">
              <section className="p-6 rounded-[2rem] bg-gradient-to-b from-os-surfaceContainerLow/50 to-os-surfaceContainerLowest/80 border border-os-outline/10 backdrop-blur-xl relative">
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-sdl-accent shadow-[0_0_8px_rgb(var(--sdl-accent-rgb))] animate-pulse" />
                  <h3 className="text-sm font-semibold text-os-onSurfaceVariant mb-4 uppercase tracking-wider">Performance</h3>
                  
                  <div className="mb-4">
                      <div className="flex items-end gap-2 mb-1">
                          <span className="text-4xl md:text-5xl font-display font-black tracking-tighter text-os-secondary">{metrics.cpu}</span>
                          <span className="text-xl font-bold text-os-onSurfaceVariant pb-1">%</span>
                      </div>
                      <span className="text-xs text-os-onSurfaceVariant font-bold uppercase tracking-widest">CPU Load</span>
                  </div>

                  <div className="mb-8">
                      <div className="flex items-end flex-wrap gap-x-1 mb-1">
                          <span className="text-4xl md:text-5xl font-display font-black tracking-tighter text-os-tertiary leading-none">{metrics.ramUsedMb}</span>
                          <span className="text-xl font-bold text-os-onSurfaceVariant leading-none pb-0.5">MB</span>
                          <span className="text-sm text-os-onSurfaceVariant/50 font-bold leading-none ml-1 pb-1">/ {metrics.ramLimitMb} MB</span>
                      </div>
                      <span className="text-xs text-os-onSurfaceVariant font-bold uppercase tracking-widest">RAM Usage ({metrics.ram}%)</span>
                  </div>

                  <div className="h-24 md:h-32 flex items-end gap-1 mb-4">
                      {Array.from({ length: 15 }).map((_, i) => {
                          const val = (i === 14) ? metrics.ram : (Math.random() * 20 + 40);
                          return (
                            <div 
                              key={i} 
                              className={`flex-1 rounded-t-sm transition-all duration-300 ${i === 14 ? 'bg-os-tertiary' : 'bg-os-tertiary/20'}`}
                              style={{ height: `${val}%` }}
                            />
                          );
                      })}
                  </div>
              </section>
          </div>
      </div>
    </div>
    );
  };



  return (
    <div className="flex h-full w-full bg-os-surface/80 text-os-onSurface rounded-2xl overflow-hidden font-sans backdrop-blur-2xl relative">
      
      {/* Settings Navigation Sidebar */}
      <div className={`${isMobile ? (showSidebar ? 'w-full absolute inset-0' : 'hidden') : 'w-64 border-r'} bg-os-surfaceContainerLow/50 backdrop-blur-3xl border-os-outline/10 flex flex-col p-4 shadow-xl z-20 transition-all`}>
        <div className="flex items-center space-x-3 mb-8 md:mb-10 px-2 mt-2">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-os-surfaceContainerHighest to-os-surfaceContainerLow flex items-center justify-center border border-os-outline/10 shadow-inner">
            <CustomIcon icon={SettingsIcon} size={16} color="text-os-onSurface" className="relative z-10" glow="rgb(var(--os-primary-rgb) / 0.5)" />
            <div className="absolute inset-0 bg-sdl-accent/20 blur-md rounded-lg"></div>
          </div>
          <span className="font-display font-bold text-lg tracking-wide">Settings</span>
        </div>

        <nav className="space-y-4 flex-1 overflow-y-auto scrollbar-hide">
          {tabGroups.map((group) => (
            <div key={group.id}>
              <div className="px-3 mb-1.5">
                <div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: 'var(--sdl-sec)', fontWeight: 650 }}>
                  {group.label}
                </div>
                {group.id === 'dl' && (
                  <div className="text-[10px] mt-0.5 tabular-nums" style={{ color: 'var(--sdl-sec)' }}>
                    Sarva Design Language · {SDL_VERSION} · {SDL_AUTHOR}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {group.items.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sdl-sm transition-colors duration-hover ease-sdl focus-visible:outline-none focus-visible:ring-2"
                      style={{
                        background: isActive ? 'var(--sdl-soft)' : 'transparent',
                        color: isActive ? 'var(--sdl-aink)' : 'var(--sdl-sec)',
                        boxShadow: isActive ? 'var(--sdl-hairline)' : 'none',
                        fontWeight: isActive ? 650 : 550,
                      }}
                    >
                      <Icon size={16} strokeWidth={2} />
                      <span className="text-[13px] text-left">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        
        <div className="mt-auto px-3 py-4 text-[10px] leading-relaxed" style={{ color: 'var(--sdl-sec)' }}>
          <div>Lumina OS 1.0.0</div>
          <div>Design language: SDL {SDL_VERSION} — {SDL_AUTHOR}</div>
        </div>
      </div>

      {/* Settings Main Content Area */}
      <div className={`flex-1 overflow-y-auto p-6 md:p-8 lg:p-12 relative z-0 ${isMobile && showSidebar ? 'hidden' : ''}`}>
        {/* Mobile Back Button */}
        {isMobile && (
          <button 
            onClick={() => setShowSidebar(true)}
            className="flex items-center space-x-2 text-os-primary font-bold mb-6 active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} />
            <span>Settings</span>
          </button>
        )}

        {/* Ambient OS glow */}
        <div className="absolute top-[-20%] left-[20%] w-[50vw] h-[50vw] bg-sdl-accent/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-sdl-soft/30 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="h-full">
            {activeTab === 'appearance' && <Appearance />}
            {DL_SECTIONS.some((sec) => sec.id === activeTab) && (
              <div className="max-w-4xl mx-auto"><DesignLanguage section={activeTab} /></div>
            )}
            {activeTab === 'system' && renderSystem()}
            {activeTab === 'user' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-2">Account</h2>
                  <p className="text-os-onSurfaceVariant text-sm">Manage your digital identity and data persistence.</p>
                </div>

                <section className="p-8 rounded-[2rem] bg-os-surfaceContainerLow/30 border border-os-outline/10 backdrop-blur-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-os-primary/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                  {isPuterSignedIn ? (
                    <div className="space-y-8">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-os-primary to-os-secondary border border-hairline/10 flex items-center justify-center text-4xl shadow-2xl text-sdl-onAccent font-black uppercase">
                          {puterUser?.username?.[0] || 'P'}
                        </div>
                        <div className="flex-1 text-center sm:text-left space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h3 className="text-xl font-black text-sdl-ink">{puterUser?.username || 'Puter Cloud User'}</h3>
                            <span className="self-center px-2.5 py-0.5 rounded-full bg-sdl-done/20 text-sdl-done border border-sdl-done/30 text-[9px] font-black uppercase tracking-widest">
                              Connected
                            </span>
                          </div>
                          <p className="text-xs text-os-onSurfaceVariant">Linked with Puter.com Ecosystem</p>
                        </div>
                        <button
                          onClick={signOutPuter}
                          className="px-5 py-2 rounded-xl bg-veil/5 border border-hairline/10 hover:bg-sdl-alert/20 hover:text-sdl-alert hover:border-sdl-alert/30 text-xs font-semibold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                        >
                          Disconnect
                        </button>
                      </div>

                      <div className="p-6 rounded-2xl bg-sdl-done/10 border border-sdl-done/20 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-sdl-done/20 rounded-lg text-sdl-done">
                              <Cloud size={18} />
                            </div>
                            <div>
                              <span className="block font-bold text-sm text-sdl-ink">Puter Cloud Sync Active</span>
                              <span className="block text-[10px] text-sdl-done/80 font-black uppercase tracking-widest">
                                {lastSyncTime ? `Last Synced: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Connected and Synchronized'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-sdl-sec leading-relaxed">
                          Your virtual file system, system settings, accent colors, and unlocked achievements are securely synced in the cloud. Changes made here are saved instantly.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl bg-os-surfaceContainerHigh/30 border border-os-outline/5 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-os-primary">File System Sync</h4>
                          <p className="text-[11px] text-os-onSurfaceVariant">Manually push or pull your virtual disk documents.</p>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={syncFilesToPuter}
                              className="flex-1 py-2 rounded-xl bg-os-primary/10 border border-os-primary/20 text-os-primary text-xs font-bold uppercase tracking-wider hover:bg-os-primary/20 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                            >
                              <Upload size={13} />
                              Push Files
                            </button>
                            <button
                              onClick={loadFilesFromPuter}
                              className="flex-1 py-2 rounded-xl bg-veil/5 border border-hairline/10 text-sdl-sec text-xs font-bold uppercase tracking-wider hover:bg-veil/10 hover:text-sdl-ink transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                            >
                              <Download size={13} />
                              Pull Files
                            </button>
                          </div>
                        </div>

                        <div className="p-5 rounded-2xl bg-os-surfaceContainerHigh/30 border border-os-outline/5 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-os-secondary">Settings & Achievements Sync</h4>
                          <p className="text-[11px] text-os-onSurfaceVariant">Manually push or pull system settings & wallpapers.</p>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={syncPrefsToPuter}
                              className="flex-1 py-2 rounded-xl bg-os-secondary/10 border border-os-secondary/20 text-os-secondary text-xs font-bold uppercase tracking-wider hover:bg-os-secondary/20 transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                            >
                              <Upload size={13} />
                              Push Settings
                            </button>
                            <button
                              onClick={loadPrefsFromPuter}
                              className="flex-1 py-2 rounded-xl bg-veil/5 border border-hairline/10 text-sdl-sec text-xs font-bold uppercase tracking-wider hover:bg-veil/10 hover:text-sdl-ink transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                            >
                              <Download size={13} />
                              Pull Settings
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 text-center sm:text-left">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="w-20 h-20 rounded-3xl bg-veil/5 border border-hairline/10 flex items-center justify-center text-4xl shadow-2xl">
                          👤
                        </div>
                        <div className="flex-1 space-y-2">
                          <h3 className="text-xl font-black text-sdl-ink">Offline/Guest Mode</h3>
                          <p className="text-xs text-os-onSurfaceVariant">
                            You are logged in as a local guest. Your changes are saved to this browser&apos;s IndexedDB and will not persist across different browsers or machines.
                          </p>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-os-surfaceContainerHigh/30 border border-os-outline/5 space-y-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3 text-left">
                            <div className="p-2 bg-os-primary/10 rounded-lg text-os-primary">
                              <Cloud size={18} />
                            </div>
                            <div>
                              <span className="block font-bold text-sm text-sdl-ink">Connect with Puter Cloud</span>
                              <span className="block text-[10px] text-os-onSurfaceVariant font-medium">Link your Puter.com account for cross-device sync.</span>
                            </div>
                          </div>
                          <button
                            onClick={signInWithPuter}
                            disabled={isPuterConnecting}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-os-primary to-os-secondary text-sdl-onAccent font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_20px_rgb(var(--os-primary-rgb)_/_0.3)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                          >
                            {isPuterConnecting ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Cloud size={14} />
                            )}
                            Sync with Puter Cloud
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

