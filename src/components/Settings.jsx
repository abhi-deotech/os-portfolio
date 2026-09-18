import React, { useState } from 'react';
import Appearance from './settings/Appearance';
import Compatibility from './settings/Compatibility';
import SystemTab from './settings/SystemTab';
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
  Cloud,
  ShieldCheck
} from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';

const Settings = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('appearance');
  const [showSidebar, setShowSidebar] = useState(true);
  // Selectors, not `useOSStore()`. A whole-store subscription re-renders this component on
  // every state change anywhere in the OS, not just the fields it reads.
  const isPuterSignedIn = useOSStore((s) => s.isPuterSignedIn);
  const puterUser = useOSStore((s) => s.puterUser);
  const isPuterConnecting = useOSStore((s) => s.isPuterConnecting);
  const signInWithPuter = useOSStore((s) => s.signInWithPuter);
  const signOutPuter = useOSStore((s) => s.signOutPuter);
  const syncFilesToPuter = useOSStore((s) => s.syncFilesToPuter);
  const loadFilesFromPuter = useOSStore((s) => s.loadFilesFromPuter);
  const syncPrefsToPuter = useOSStore((s) => s.syncPrefsToPuter);
  const loadPrefsFromPuter = useOSStore((s) => s.loadPrefsFromPuter);
  const lastSyncTime = useOSStore((s) => s.lastSyncTime);

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
        { id: 'compat', icon: ShieldCheck, label: 'Compatibility' },
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

  return (
    <div className="flex h-full w-full bg-os-surface/80 text-os-onSurface overflow-hidden font-sans backdrop-blur-2xl relative">
      
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
            {activeTab === 'system' && <SystemTab />}
            {activeTab === 'compat' && <Compatibility onOpenTab={handleTabClick} />}
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

