import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  ImageIcon, 
  Monitor, 
  Palette, 
  Wifi, 
  User, 
  Cpu, 
  HardDrive,
  Moon,
  Sun,
  Droplets,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Signal,
  Globe,
  Shield,
  Activity,
  Download,
  Upload,
  Zap,
  RotateCcw
} from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import useSystemMetrics from '../hooks/useSystemMetrics';
import useNetworkInfo from '../hooks/useNetworkInfo';

const Settings = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('personalization');
  const [showSidebar, setShowSidebar] = useState(true);
  const { 
    wallpaper, 
    setWallpaper, 
    activeAccent, 
    setActiveAccent,
    transparencyEffects,
    setTransparencyEffects,
    brightness,
    setBrightness,
    accentIntensity,
    setAccentIntensity,
    lowPerformance,
    setLowPerformance,
    resetSettingsToDefault,
    unlockAchievement
  } = useOSStore();
  const metrics = useSystemMetrics();
  const network = useNetworkInfo();
  
  // Network scan states
  const [isScanning, setIsScanning] = useState(false);
  const [mockNetworks, setMockNetworks] = useState([
    { id: 'current', name: 'Nexus-5G', signal: 95, secure: true, connected: true },
    { id: 1, name: 'Lumina-Corp', signal: 78, secure: true, connected: false },
    { id: 2, name: 'CoffeeHub_Guest', signal: 45, secure: false, connected: false },
    { id: 3, name: 'CyberCafe_2.4G', signal: 62, secure: true, connected: false },
  ]);

  const handleNetworkScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const newNetworks = [
        { id: 'current', name: 'Nexus-5G', signal: Math.floor(Math.random() * 20 + 80), secure: true, connected: true },
        { id: 1, name: 'Lumina-Corp', signal: Math.floor(Math.random() * 30 + 60), secure: true, connected: false },
        { id: 2, name: 'CoffeeHub_Guest', signal: Math.floor(Math.random() * 40 + 30), secure: false, connected: false },
        { id: Math.random(), name: 'Neural-Link_' + Math.floor(Math.random() * 999), signal: Math.floor(Math.random() * 50 + 40), secure: true, connected: false },
        { id: Math.random(), name: 'Quantum-Net', signal: Math.floor(Math.random() * 30 + 20), secure: true, connected: false },
      ];
      setMockNetworks(newNetworks);
      setIsScanning(false);
    }, 2000);
  };

  const handleWallpaperUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setWallpaper(reader.result);
        unlockAchievement('decorator');
      };
      reader.readAsDataURL(file);
    }
  };

  const wallpapers = [
    { id: 'neon-nebula', name: 'Neon Nebula', type: 'live', color: 'from-[#cc97ff] to-[#00d2fd]' },
    { id: 'cyber-grid', name: 'Cyber Grid', type: 'live', color: 'from-[#00f5a0] to-[#00d2fd]' },
    { id: 'abstract-blue', name: 'Abstract Blue', type: 'image', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=40&w=400&auto=format&fit=crop' },
    { id: 'dark-mountain', name: 'Dark Mountain', type: 'image', url: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=40&w=400&auto=format&fit=crop' },
    { id: 'cyber-vibes', name: 'Cyber Vibes', type: 'image', url: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=40&w=400&auto=format&fit=crop' },
    { id: 'tech-minimal', name: 'Minimal Tech', type: 'image', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=40&w=400&auto=format&fit=crop' },
    { id: 'sunset-glow', name: 'Sunset Glow', type: 'live', color: 'from-[#ff4d4d] to-[#ffaf40]' },
    { id: 'quantum-flow', name: 'Quantum Flow', type: 'live', color: 'from-[#cc97ff] to-[#60a5fa]' }
  ];

  const accentColors = [
    { id: 'purple', shadow: 'rgba(204,151,255,0.4)', hex: '#cc97ff' },
    { id: 'cyan', shadow: 'rgba(0,210,253,0.4)', hex: '#00d2fd' },
    { id: 'magenta', shadow: 'rgba(255,104,240,0.4)', hex: '#ff68f0' },
    { id: 'green', shadow: 'rgba(0,245,160,0.4)', hex: '#00f5a0' },
  ];

  const tabs = [
    { id: 'personalization', icon: Palette, label: 'Personalization' },
    { id: 'system', icon: Cpu, label: 'System' },
    { id: 'network', icon: Wifi, label: 'Network' },
    { id: 'user', icon: User, label: 'User Account' },
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (isMobile) setShowSidebar(false);
  };

  const renderPersonalization = () => (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-2">Personalization</h2>
          <p className="text-os-onSurfaceVariant text-sm">Customize the look and feel of your workspace.</p>
        </div>
        {!isMobile && (
          <div className="px-4 py-2 rounded-full bg-os-surfaceContainerHigh/50 border border-os-outline/10 backdrop-blur-md flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#cc97ff] animate-pulse"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#cc97ff]">Active Profile</span>
          </div>
        )}
      </div>

      {/* Wallpaper Preview Section */}
      <section className="relative p-4 md:p-6 rounded-[2rem] bg-os-surfaceContainerLowest/20 border border-os-outline/10 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#cc97ff]/5 to-[#00d2fd]/5 opacity-50"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center">
<div 
              className={`w-full md:w-1/2 h-40 md:h-48 rounded-2xl shadow-2xl overflow-hidden relative border border-white/10 transition-all duration-700 ${!wallpaper.startsWith('data:image') && wallpapers.find(w => w.id === wallpaper)?.type === 'live' ? `bg-gradient-to-br ${wallpapers.find(w => w.id === wallpaper)?.color}` : ''}`}
              style={
                wallpaper.startsWith('data:image') 
                  ? { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : wallpapers.find(w => w.id === wallpaper)?.type === 'image' 
                    ? { backgroundImage: `url(${wallpapers.find(w => w.id === wallpaper)?.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : {}
              }
            >
                <div className="absolute top-4 left-4 right-4 flex gap-2">
                    <div className="w-16 h-4 bg-white/20 backdrop-blur-md rounded-full"></div>
                    <div className="w-8 h-4 bg-white/20 backdrop-blur-md rounded-full"></div>
                </div>
                <div className="absolute bottom-4 right-4 w-24 md:w-32 h-16 md:h-24 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 flex flex-col p-2 gap-2">
                     <div className="w-full h-1 md:h-2 bg-white/20 rounded-full"></div>
                     <div className="w-3/4 h-1 md:h-2 bg-white/20 rounded-full"></div>
                </div>
            </div>
            <div className="w-full md:w-1/2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg md:text-xl font-bold flex items-center space-x-2">
                      <CustomIcon icon={ImageIcon} size={20} color="text-[#cc97ff]" glow="#cc97ff" />
                      <span>Live Wallpaper</span>
                  </h3>
                  <label className="cursor-pointer p-2 rounded-xl bg-os-surfaceContainerHighest/50 hover:bg-os-primary/20 hover:text-os-primary transition-all border border-os-outline/10">
                    <Upload size={16} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleWallpaperUpload} />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {wallpapers.map((wp) => (
                    <div 
                      key={wp.id}
                      onClick={() => { setWallpaper(wp.id); unlockAchievement('decorator'); }}
                      className={`cursor-pointer rounded-xl h-12 md:h-14 border transition-all duration-300 relative overflow-hidden group/tile ${
                        wallpaper === wp.id 
                          ? 'border-[#cc97ff] shadow-[0_0_15px_rgba(204,151,255,0.3)]' 
                          : 'border-os-outline/20 hover:border-os-outline/40'
                      }`}
                    >
                      {wp.type === 'live' ? (
                        <div className={`absolute inset-0 bg-gradient-to-br ${wp.color} opacity-80`} />
                      ) : (
                        <img src={wp.url} alt={wp.name} className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      
                      {wallpaper === wp.id && (
                          <div className="absolute inset-0 bg-[#cc97ff]/20 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]" />
                          </div>
                      )}
                    </div>
                  ))}
                </div>
            </div>
        </div>
      </section>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance Card */}
        <section className="p-6 rounded-[2rem] bg-os-surfaceContainerLow/40 border border-os-outline/10 backdrop-blur-xl space-y-6">
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <CustomIcon icon={Sun} size={18} color="text-os-onSurfaceVariant" />
              <span>Appearance</span>
            </h3>
            
            <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-os-surfaceContainerHigh/30 hover:bg-os-surfaceContainerHigh/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <CustomIcon icon={Droplets} size={16} color="text-[#cc97ff]" glow="#cc97ff" />
                        <div>
                            <span className="block font-semibold text-sm">Transparency Effects</span>
                            <span className="block text-xs text-os-onSurfaceVariant">Mica glassmorphism style</span>
                        </div>
                    </div>
                    {/* Mock Toggle */}
                    <div 
                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${transparencyEffects ? 'bg-[#cc97ff]' : 'bg-os-surfaceContainerHighest'}`}
                        onClick={() => setTransparencyEffects(!transparencyEffects)}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${transparencyEffects ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-os-surfaceContainerHigh/30 hover:bg-os-surfaceContainerHigh/50 transition-colors border border-os-outline/5">
                    <div className="flex items-center gap-3">
                        <CustomIcon icon={Zap} size={16} color="text-os-secondary" glow="rgba(var(--os-secondary-rgb), 0.3)" />
                        <div>
                            <span className="block font-semibold text-sm">Performance Mode</span>
                            <span className="block text-xs text-os-onSurfaceVariant">Disable 3D wallpaper & effects</span>
                        </div>
                    </div>
                    <div 
                        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${lowPerformance ? 'bg-os-secondary' : 'bg-os-surfaceContainerHighest'}`}
                        onClick={() => setLowPerformance(!lowPerformance)}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${lowPerformance ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                </div>
            </div>
        </section>

        {/* Colors & Sliders Card */}
        <section className="p-6 rounded-[2rem] bg-os-surfaceContainerLow/40 border border-os-outline/10 backdrop-blur-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-[-50%] right-[-20%] w-[200px] h-[200px] bg-[#cc97ff]/5 blur-[60px] rounded-full pointer-events-none" />
            
            <h3 className="text-lg font-bold flex items-center space-x-2">
              <CustomIcon icon={Palette} size={18} color="text-os-onSurfaceVariant" />
              <span>Accents</span>
            </h3>

            <div>
                <span className="block text-sm font-semibold mb-3">Accent Color</span>
                <div className="flex gap-4">
                    {accentColors.map(color => (
                        <div 
                            key={color.id}
                            onClick={() => { setActiveAccent(color.id); unlockAchievement('decorator'); }}
                            className={`w-8 h-8 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center`}
                            style={{ 
                                backgroundColor: color.hex,
                                boxShadow: activeAccent === color.id ? `0 0 20px ${color.shadow}` : 'none',
                                transform: activeAccent === color.id ? 'scale(1.2)' : 'scale(1)'
                            }}
                        >
                            {activeAccent === color.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-6 pt-2">
                <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                        <span>Luminosity</span>
                        <span className="text-[#00d2fd]">{brightness}%</span>
                    </div>
                    <div className="h-4 md:h-1 bg-os-surfaceContainerHighest rounded-full relative overflow-hidden cursor-pointer" onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       setBrightness(Math.round(((e.clientX - rect.left) / rect.width) * 100));
                    }}>
                       <div className="absolute top-0 left-0 h-full bg-[#00d2fd] transition-all" style={{ width: `${brightness}%` }} />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                        <span>Accent Intensity</span>
                        <span className="text-[#cc97ff]">{accentIntensity}%</span>
                    </div>
                    <div className="h-4 md:h-1 bg-os-surfaceContainerHighest rounded-full relative overflow-hidden cursor-pointer" onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       setAccentIntensity(Math.round(((e.clientX - rect.left) / rect.width) * 100));
                    }}>
                       <div className="absolute top-0 left-0 h-full bg-[#cc97ff] transition-all" style={{ width: `${accentIntensity}%` }} />
                    </div>
                </div>
            </div>
        </section>
      </div>

      {/* Reset to Default Section */}
      <section className="p-6 rounded-[2rem] bg-os-surfaceContainerLow/40 border border-os-outline/10 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <RotateCcw size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Reset Personalization</h3>
              <p className="text-xs text-os-onSurfaceVariant">Restore all appearance settings to factory defaults</p>
            </div>
          </div>
          <button
            onClick={resetSettingsToDefault}
            className="px-6 py-2.5 rounded-xl bg-os-surfaceContainerHigh hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-os-outline/20 transition-all duration-300 text-sm font-semibold flex items-center gap-2 group"
          >
            <RotateCcw size={16} className="group-hover:-rotate-180 transition-transform duration-500" />
            Reset to Default
          </button>
        </div>
      </section>
    </div>
  );

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
                  <div className="absolute top-0 right-0 w-full md:w-[400px] h-full bg-gradient-to-l from-[#cc97ff]/5 to-transparent pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-8">
                      <div className="flex flex-col">
                        <span className="text-2xl md:text-3xl font-black font-display text-[#cc97ff]">Lumina OS</span>
                        <span className="text-xs md:text-sm font-semibold text-os-onSurfaceVariant">Version 2026.1 (Build 8821)</span>
                      </div>
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-os-primary/20 to-os-secondary/20 border border-os-outline/10 flex items-center justify-center shadow-[0_0_30px_rgba(204,151,255,0.15)]">
                          <CustomIcon icon={Cpu} size={isMobile ? 24 : 28} color="text-os-onSurface" glow="rgba(var(--os-primary-rgb), 0.3)" />
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
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#00f5a0] shadow-[0_0_8px_#00f5a0] animate-pulse" />
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

  const renderNetwork = () => {
    const getConnectionTypeIcon = () => {
      if (!network.isOnline) return <Signal size={16} className="text-red-400" />;
      if (network.connectionType === 'wifi') return <Wifi size={16} className="text-os-primary" />;
      if (network.connectionType === 'cellular') return <Signal size={16} className="text-os-secondary" />;
      return <Globe size={16} className="text-os-tertiary" />;
    };

    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-2">Network</h2>
          <p className="text-os-onSurfaceVariant text-sm">Monitor connection status and manage network interfaces.</p>
        </div>

        {/* Connection Status Card */}
        <section className="p-6 rounded-[2rem] bg-os-surfaceContainerLow/40 border border-os-outline/10 backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CustomIcon icon={Activity} size={18} color="text-os-onSurfaceVariant" />
              Connection Status
            </h3>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${network.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {network.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-os-surfaceContainerHigh/30 space-y-2">
              <div className="flex items-center gap-2 text-os-onSurfaceVariant">
                {getConnectionTypeIcon()}
                <span className="text-[10px] font-bold uppercase tracking-widest">Type</span>
              </div>
              <span className="block text-sm font-bold text-white capitalize">{network.connectionType}</span>
            </div>

            <div className="p-4 rounded-2xl bg-os-surfaceContainerHigh/30 space-y-2">
              <div className="flex items-center gap-2 text-os-onSurfaceVariant">
                <Download size={16} className="text-os-secondary" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Downlink</span>
              </div>
              <span className="block text-sm font-bold text-white">{network.downlink > 0 ? network.downlink + ' Mbps' : '--'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-os-surfaceContainerHigh/30 space-y-2">
              <div className="flex items-center gap-2 text-os-onSurfaceVariant">
                <Zap size={16} className="text-os-tertiary" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Latency</span>
              </div>
              <span className="block text-sm font-bold text-white">{network.rtt > 0 ? network.rtt + ' ms' : '--'}</span>
            </div>

            <div className="p-4 rounded-2xl bg-os-surfaceContainerHigh/30 space-y-2">
              <div className="flex items-center gap-2 text-os-onSurfaceVariant">
                <Shield size={16} className="text-os-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Data Saver</span>
              </div>
              <span className="block text-sm font-bold text-white">{network.saveData ? 'On' : 'Off'}</span>
            </div>
          </div>
        </section>

        {/* WiFi Networks */}
        <section className="p-6 rounded-[2rem] bg-os-surfaceContainerLow/40 border border-os-outline/10 backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CustomIcon icon={Wifi} size={18} color="text-os-onSurfaceVariant" />
              Available Networks
            </h3>
            <button 
              onClick={handleNetworkScan}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-os-surfaceContainerHigh/50 hover:bg-os-surfaceContainerHighest transition-colors text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
              {isScanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>

          <div className="space-y-2">
            {mockNetworks.map((net) => (
              <div 
                key={net.id} 
                className={`flex items-center justify-between p-4 rounded-2xl transition-all ${net.connected ? 'bg-os-primary/10 border border-os-primary/20' : 'bg-os-surfaceContainerHigh/30 hover:bg-os-surfaceContainerHigh/50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${net.connected ? 'bg-os-primary/20 text-os-primary' : 'bg-white/5 text-os-onSurfaceVariant'}`}>
                    {net.secure ? <Shield size={18} /> : <Wifi size={18} />}
                  </div>
                  <div>
                    <span className={`block font-bold text-sm ${net.connected ? 'text-os-primary' : 'text-white'}`}>
                      {net.name}
                      {net.connected && <span className="ml-2 text-[10px] font-normal opacity-60">(Connected)</span>}
                    </span>
                    <span className="text-[10px] text-os-onSurfaceVariant font-medium">
                      {net.secure ? 'WPA3 Secured' : 'Open Network'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((bar) => (
                      <div 
                        key={bar} 
                        className={`w-1 rounded-full ${net.signal >= bar * 25 ? 'bg-os-primary' : 'bg-os-outline/20'}`}
                        style={{ height: `${bar * 4}px` }}
                      />
                    ))}
                  </div>
                  {!net.connected && (
                    <button className="px-3 py-1.5 rounded-lg bg-os-primary/10 text-os-primary text-[10px] font-bold uppercase tracking-wider hover:bg-os-primary/20 transition-colors">
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  const renderPlaceholder = (title, desc) => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in duration-500 py-10 px-4">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-os-surfaceContainerHigh/30 rounded-3xl flex items-center justify-center mb-4">
            <CustomIcon icon={SlidersHorizontal} size={isMobile ? 24 : 32} color="text-os-outline" />
        </div>
        <h2 className="text-xl md:text-2xl font-display font-bold leading-tight">{title}</h2>
        <p className="text-os-onSurfaceVariant max-w-sm text-sm">{desc}</p>
        <button className="px-6 py-2 mt-4 rounded-xl bg-os-surfaceContainerHigh text-sm font-semibold hover:bg-os-surfaceContainerHighest transition-colors">
            Configure Later
        </button>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-os-surface/80 text-os-onSurface rounded-2xl overflow-hidden font-sans backdrop-blur-2xl relative">
      
      {/* Settings Navigation Sidebar */}
      <div className={`${isMobile ? (showSidebar ? 'w-full absolute inset-0' : 'hidden') : 'w-64 border-r'} bg-os-surfaceContainerLow/50 backdrop-blur-3xl border-os-outline/10 flex flex-col p-4 shadow-xl z-20 transition-all`}>
        <div className="flex items-center space-x-3 mb-8 md:mb-10 px-2 mt-2">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-os-surfaceContainerHighest to-os-surfaceContainerLow flex items-center justify-center border border-os-outline/10 shadow-inner">
            <CustomIcon icon={SettingsIcon} size={16} color="text-os-onSurface" className="relative z-10" glow="rgba(var(--os-primary-rgb), 0.5)" />
            <div className="absolute inset-0 bg-[#cc97ff]/20 blur-md rounded-lg"></div>
          </div>
          <span className="font-display font-bold text-lg tracking-wide">Settings</span>
        </div>

        <nav className="space-y-1.5 flex-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full group flex items-center justify-between px-4 py-4 md:px-3 md:py-3 rounded-[1rem] transition-all duration-300 relative overflow-hidden ${
                  isActive && !isMobile
                    ? 'bg-gradient-to-r from-os-surfaceContainerHigh/80 to-transparent' 
                    : 'hover:bg-os-surfaceContainerHigh/30 text-os-onSurfaceVariant hover:text-os-onSurface'
                }`}
              >
                {/* Active Indicator Light Bar */}
                {isActive && !isMobile && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-gradient-to-b from-[#cc97ff] to-[#00d2fd] rounded-r-full shadow-[0_0_10px_#cc97ff]"></div>
                )}
                
                <div className="flex items-center space-x-4 md:space-x-3 relative z-10 pl-1">
                  <CustomIcon icon={Icon} size={20} color={isActive ? 'text-[#cc97ff]' : ''} glow={isActive ? '#cc97ff' : false} />
                  <span className={`font-semibold text-base md:text-sm ${isActive ? 'text-os-onSurface' : ''}`}>{tab.label}</span>
                </div>

                <CustomIcon icon={ChevronRight} size={14} color="text-os-onSurfaceVariant/50" className="mr-1" animate={false} />
              </button>
            )
          })}
        </nav>
        
        <div className="mt-auto px-4 py-4 text-[10px] text-os-onSurfaceVariant/40 text-center font-bold uppercase tracking-widest">
            Lumina Engine v2.0
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
        <div className="absolute top-[-20%] left-[20%] w-[50vw] h-[50vw] bg-[#cc97ff]/5 blur-[120px] rounded-full pointer-events-none -z-10 mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#00d2fd]/5 blur-[100px] rounded-full pointer-events-none -z-10 mix-blend-screen" />

        <div className="h-full">
            {activeTab === 'personalization' && renderPersonalization()}
            {activeTab === 'system' && renderSystem()}
            {activeTab === 'network' && renderNetwork()}
            {activeTab === 'user' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-2">Account</h2>
                  <p className="text-os-onSurfaceVariant text-sm">Manage your digital identity and data persistence.</p>
                </div>

                <section className="p-8 rounded-[2rem] bg-os-surfaceContainerLow/30 border border-os-outline/10 backdrop-blur-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-os-primary/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-2xl">
                       🚀
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{useOSStore.getState().userRole === 'admin' ? 'Abhimanyu Saxena' : 'Guest User'}</h3>
                      <p className="text-xs font-bold text-os-primary uppercase tracking-widest">{useOSStore.getState().userRole} Priority Account</p>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-os-primary/10 border border-os-primary/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-os-primary/20 rounded-lg text-os-primary">
                          <RefreshCw size={18} className="animate-spin-slow" />
                        </div>
                        <div>
                          <span className="block font-bold text-sm text-white">Cloud Sync Persistence</span>
                          <span className="block text-[10px] text-os-primary/60 font-black uppercase tracking-widest">Active via LocalStorage</span>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-os-primary text-black text-[10px] font-black rounded-lg uppercase tracking-wider">Synced</div>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Lumina OS uses edge persistence to save your wallpaper, terminal history, and window states. 
                      Your settings are currently backed up to the browser's local node.
                    </p>
                  </div>
                </section>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

