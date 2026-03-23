import { 
  Settings as SettingsIcon, 
  Image as ImageIcon, 
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
  ChevronRight
} from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('personalization');
  const { wallpaper, setWallpaper, activeAccent, setActiveAccent } = useOSStore();
  
  // Mock local state for settings toggles
  const [transparencyEffects, setTransparencyEffects] = useState(true);
  const [accentIntensity, setAccentIntensity] = useState(80);
  const [brightness, setBrightness] = useState(100);

  const wallpapers = [
    { id: 'neon-nebula', name: 'Neon Nebula', color: 'from-[#cc97ff] to-[#00d2fd]' },
    { id: 'cyber-grid', name: 'Cyber Grid', color: 'from-[#00f5a0] to-[#00d2fd]' },
    { id: 'sunset-vibes', name: 'Sunset Vibes', color: 'from-[#ff4d4d] to-[#ffaf40]' }
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

  const renderPersonalization = () => (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-display font-black tracking-tight mb-2">Personalization</h2>
          <p className="text-os-onSurfaceVariant text-sm">Customize the look and feel of your workspace.</p>
        </div>
        <div className="px-4 py-2 rounded-full bg-os-surfaceContainerHigh/50 border border-os-outline/10 backdrop-blur-md flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#cc97ff] animate-pulse"></div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#cc97ff]">Active Profile</span>
        </div>
      </div>

      {/* Wallpaper Preview Section */}
      <section className="relative p-6 rounded-[2rem] bg-os-surfaceContainerLowest/20 border border-os-outline/10 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#cc97ff]/5 to-[#00d2fd]/5 opacity-50"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
            <div className={`w-full md:w-1/2 h-48 rounded-2xl bg-gradient-to-br ${wallpapers.find(w => w.id === wallpaper)?.color || wallpapers[0].color} shadow-2xl overflow-hidden relative border border-white/10 transition-all duration-700`}>
                {/* Mock UI elements on top of wallpaper preview */}
                <div className="absolute top-4 left-4 right-4 flex gap-2">
                    <div className="w-16 h-4 bg-white/20 backdrop-blur-md rounded-full"></div>
                    <div className="w-8 h-4 bg-white/20 backdrop-blur-md rounded-full"></div>
                </div>
                <div className="absolute bottom-4 right-4 w-32 h-24 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 flex flex-col p-2 gap-2">
                     <div className="w-full h-2 bg-white/20 rounded-full"></div>
                     <div className="w-3/4 h-2 bg-white/20 rounded-full"></div>
                </div>
            </div>
            <div className="w-full md:w-1/2 space-y-4">
                <h3 className="text-xl font-bold flex items-center space-x-2">
                    <CustomIcon icon={ImageIcon} size={20} color="text-[#cc97ff]" glow="#cc97ff" />
                    <span>Live Wallpaper</span>
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {wallpapers.map((wp) => (
                    <div 
                      key={wp.id}
                      onClick={() => setWallpaper(wp.id)}
                      className={`cursor-pointer rounded-xl h-16 border transition-all duration-300 relative overflow-hidden group/tile ${
                        wallpaper === wp.id 
                          ? 'border-[#cc97ff] shadow-[0_0_15px_rgba(204,151,255,0.3)]' 
                          : 'border-os-outline/20 hover:border-os-outline/40'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${wp.color} opacity-80`} />
                      {wallpaper === wp.id && (
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-[#cc97ff]" />
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
                            onClick={() => setActiveAccent(color.id)}
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

            <div className="space-y-4 pt-2">
                <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                        <span>Luminosity</span>
                        <span className="text-[#00d2fd]">{brightness}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="100" 
                        value={brightness} 
                        onChange={(e) => setBrightness(e.target.value)}
                        className="w-full h-1 bg-os-surfaceContainerHighest rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#00d2fd] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_#00d2fd] cursor-pointer"
                    />
                </div>
                <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                        <span>Accent Intensity</span>
                        <span className="text-[#cc97ff]">{accentIntensity}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="100" 
                        value={accentIntensity} 
                        onChange={(e) => setAccentIntensity(e.target.value)}
                        className="w-full h-1 bg-os-surfaceContainerHighest rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#cc97ff] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_#cc97ff] cursor-pointer"
                    />
                </div>
            </div>
        </section>
      </div>
    </div>
  );

  const renderSystem = () => (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div>
        <h2 className="text-4xl font-display font-black tracking-tight mb-2">System</h2>
        <p className="text-os-onSurfaceVariant text-sm">Hardware utilization and OS architecture details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <section className="p-8 rounded-[2rem] bg-os-surfaceContainerLow/30 border border-os-outline/10 backdrop-blur-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-[400px] h-full bg-gradient-to-l from-[#cc97ff]/5 to-transparent pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-8">
                      <div className="flex flex-col">
                        <span className="text-3xl font-black font-display text-[#cc97ff]">Lumina OS</span>
                        <span className="text-sm font-semibold text-os-onSurfaceVariant">Version 2026.1 (Build 8821)</span>
                      </div>
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-os-primary/20 to-os-secondary/20 border border-os-outline/10 flex items-center justify-center shadow-[0_0_30px_rgba(204,151,255,0.15)]">
                          <CustomIcon icon={Cpu} size={28} color="text-os-onSurface" glow="rgba(var(--os-primary-rgb), 0.3)" />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                     {['Processor', 'Installed RAM', 'System Type', 'Pen and Touch'].map((spec, i) => (
                         <div key={spec} className="flex border-b border-os-outline/5 pb-4 last:border-0 last:pb-0">
                             <div className="w-1/3 text-sm text-os-onSurfaceVariant font-medium">{spec}</div>
                             <div className="w-2/3 text-sm font-semibold">
                                 {i === 0 && 'Neural Processing Unit (Simulated)'}
                                 {i === 1 && '64.0 GB (63.8 GB usable)'}
                                 {i === 2 && '64-bit operating system'}
                                 {i === 3 && 'No pen or touch input is available'}
                             </div>
                         </div>
                     ))}
                 </div>
              </section>
          </div>

          <div className="space-y-6">
              <section className="p-6 rounded-[2rem] bg-gradient-to-b from-os-surfaceContainerLow/50 to-os-surfaceContainerLowest/80 border border-os-outline/10 backdrop-blur-xl relative">
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#00f5a0] shadow-[0_0_8px_#00f5a0] animate-pulse" />
                  <h3 className="text-sm font-semibold text-os-onSurfaceVariant mb-4 uppercase tracking-wider">Performance Goal</h3>
                  
                  <div className="mb-8">
                      <div className="flex items-end gap-2 mb-1">
                          <span className="text-5xl font-display font-black tracking-tighter text-[#00d2fd]">78</span>
                          <span className="text-xl font-bold text-os-onSurfaceVariant pb-1">%</span>
                      </div>
                      <span className="text-sm text-os-onSurfaceVariant">RAM Usage (Live)</span>
                  </div>

                  <div className="h-40 flex items-end gap-1 mb-4">
                      {[40, 50, 65, 45, 80, 78, 90, 85, 70, 78].map((val, i) => (
                          <div 
                            key={i} 
                            className="flex-1 bg-gradient-to-t from-[#00d2fd]/10 to-[#00d2fd]/40 rounded-t-sm transition-all duration-300 hover:opacity-100" 
                            style={{ height: `${val}%` }}
                          />
                      ))}
                  </div>
              </section>

              <section className="p-6 rounded-[2rem] bg-os-surfaceContainerLow/30 border border-os-outline/10">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-os-surfaceContainerHighest flex items-center justify-center">
                          <CustomIcon icon={HardDrive} size={18} color="text-os-onSurface" />
                      </div>
                      <div>
                          <span className="block text-sm font-bold">Local Storage</span>
                          <span className="block text-xs text-os-onSurfaceVariant">5.2 MB / 10 MB used</span>
                      </div>
                  </div>
              </section>
          </div>
      </div>
    </div>
  );

  const renderPlaceholder = (title, desc) => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-os-surfaceContainerHigh/30 rounded-3xl flex items-center justify-center mb-4">
            <CustomIcon icon={SlidersHorizontal} size={32} color="text-os-outline" />
        </div>
        <h2 className="text-2xl font-display font-bold leading-tight">{title}</h2>
        <p className="text-os-onSurfaceVariant max-w-sm">{desc}</p>
        <button className="px-6 py-2 mt-4 rounded-xl bg-os-surfaceContainerHigh text-sm font-semibold hover:bg-os-surfaceContainerHighest transition-colors">
            Configure Later
        </button>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-os-surface/80 text-os-onSurface rounded-2xl overflow-hidden font-sans backdrop-blur-2xl">
      
      {/* Settings Navigation Sidebar */}
      <div className="w-64 bg-os-surfaceContainerLow/50 backdrop-blur-3xl border-r border-os-outline/10 flex flex-col p-4 shadow-xl z-20">
        <div className="flex items-center space-x-3 mb-10 px-2 mt-2">
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
                onClick={() => setActiveTab(tab.id)}
                className={`w-full group flex items-center justify-between px-3 py-3 rounded-[1rem] transition-all duration-300 relative overflow-hidden ${
                  isActive 
                    ? 'bg-gradient-to-r from-os-surfaceContainerHigh/80 to-transparent' 
                    : 'hover:bg-os-surfaceContainerHigh/30 text-os-onSurfaceVariant hover:text-os-onSurface'
                }`}
              >
                {/* Active Indicator Light Bar */}
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-gradient-to-b from-[#cc97ff] to-[#00d2fd] rounded-r-full shadow-[0_0_10px_#cc97ff]"></div>
                )}
                
                <div className="flex items-center space-x-3 relative z-10 pl-1">
                  <CustomIcon icon={Icon} size={18} color={isActive ? 'text-[#cc97ff]' : ''} glow={isActive ? '#cc97ff' : false} />
                  <span className={`font-semibold text-sm ${isActive ? 'text-os-onSurface' : ''}`}>{tab.label}</span>
                </div>

                {isActive && <CustomIcon icon={ChevronRight} size={14} color="text-os-onSurfaceVariant/50" className="mr-1" animate={false} />}
              </button>
            )
          })}
        </nav>
        
        <div className="mt-auto px-4 py-4 text-xs text-os-onSurfaceVariant/40 text-center font-medium">
            Lumina Engine v2.0
        </div>
      </div>

      {/* Settings Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative z-0">
        {/* Ambient OS glow */}
        <div className="absolute top-[-20%] left-[20%] w-[50vw] h-[50vw] bg-[#cc97ff]/5 blur-[120px] rounded-full pointer-events-none -z-10 mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#00d2fd]/5 blur-[100px] rounded-full pointer-events-none -z-10 mix-blend-screen" />

        <div className="h-full">
            {activeTab === 'personalization' && renderPersonalization()}
            {activeTab === 'system' && renderSystem()}
            {activeTab === 'network' && renderPlaceholder('Network Config', 'Manage your virtual network connections, VPN profiles, and DNS settings.')}
            {activeTab === 'user' && renderPlaceholder('Account Settings', 'Manage your digital identity, cryptographic keys, and tied services.')}
        </div>
      </div>
    </div>
  );
};

export default Settings;

