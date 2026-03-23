import React, { useState } from 'react';
import { Gamepad2, MousePointer2, Home, Trophy, Settings, Ghost, Sparkles, ChevronRight, Play, LayoutGrid } from 'lucide-react';
import useOSStore from '../store/osStore';

const Games = () => {
  const { openWindow } = useOSStore();
  const [activeTab, setActiveTab] = useState('home');

  const launchGame = (gameId) => {
    openWindow(gameId);
  };

  return (
    <div className="flex h-full w-full bg-[#0e0e0e] text-os-onSurface overflow-hidden rounded-2xl font-sans relative">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#cc97ff]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-[#00d2fd]/20 blur-[100px] rounded-full pointer-events-none" />

      {/* Sidebar Navigation */}
      <div className="w-64 bg-[#131313]/80 backdrop-blur-3xl border-r border-os-outline/10 flex flex-col z-10">
        <div className="p-6 flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#cc97ff] to-[#be8af0] flex items-center justify-center shadow-[0_0_20px_rgba(204,151,255,0.4)]">
            <Gamepad2 size={24} className="text-[#360061]" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Vibe<span className="text-[#cc97ff]">X</span></span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'all', icon: LayoutGrid, label: 'All Games' },
            { id: 'achievements', icon: Trophy, label: 'Achievements' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden group ${
                activeTab === item.id 
                  ? 'bg-os-surfaceContainerHighest/50 text-[#cc97ff]' 
                  : 'text-os-onSurfaceVariant hover:bg-os-surfaceContainerHigh/30 hover:text-os-onSurface'
              }`}
            >
              {activeTab === item.id && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#9effc8] rounded-r-full shadow-[0_0_10px_#9effc8]" />
              )}
              <item.icon size={20} className={activeTab === item.id ? 'text-[#cc97ff]' : ''} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Summary Card */}
        <div className="p-4 mx-4 mb-6 mt-auto bg-os-surfaceContainerHigh/40 backdrop-blur-xl rounded-2xl border border-os-outline/10 relative overflow-hidden">
           <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#00d2fd]/20 blur-xl rounded-full" />
           <p className="text-xs text-os-onSurfaceVariant uppercase tracking-widest font-bold mb-1">Player Rank</p>
           <div className="flex items-center space-x-2">
             <span className="text-2xl font-display font-black text-white">LVL 42</span>
             <Sparkles size={16} className="text-[#00d2fd]" />
           </div>
           <div className="mt-3 h-1.5 w-full bg-os-surfaceContainerHighest rounded-full overflow-hidden">
             <div className="h-full bg-gradient-to-r from-[#00d2fd] to-[#cc97ff] w-[75%] shadow-[0_0_10px_#cc97ff]" />
           </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 relative z-10 scrollbar-hide">
        
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-center space-x-2 text-[#9effc8] mb-4 text-sm font-bold tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-[#9effc8] animate-pulse shadow-[0_0_8px_#9effc8]" />
            <span>Now Playing</span>
          </div>

          <div 
            onClick={() => launchGame('snake')}
            className="group relative w-full h-80 rounded-[2rem] overflow-hidden cursor-pointer border border-os-outline/10 hover:border-[#cc97ff]/50 transition-all duration-500 shadow-2xl"
          >
            {/* Background Image / Gradient for Hero */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a103c] via-[#060e20] to-[#030712] transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#cc97ff]/20 via-transparent to-transparent opacity-50" />
            
            {/* Content */}
            <div className="absolute inset-0 p-10 flex flex-col justify-end bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/50 to-transparent">
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="font-display text-5xl font-black text-white mb-2 drop-shadow-lg group-hover:text-[#cc97ff] transition-colors">Snake Retro</h1>
                  <p className="text-os-onSurfaceVariant font-medium text-lg max-w-md">The classic arcade experience reborn with kinetic glass aesthetics.</p>
                </div>
                
                <button className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-[#cc97ff] to-[#be8af0] text-[#360061] font-bold rounded-2xl shadow-[0_0_20px_rgba(204,151,255,0.4)] group-hover:scale-105 active:scale-95 transition-all">
                  <Play fill="currentColor" size={20} />
                  <span>Launch Game</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Other Games */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold">Library</h2>
            <button className="text-sm font-bold text-os-onSurfaceVariant hover:text-white flex items-center space-x-1 group">
              <span>See All</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="flex space-x-6 overflow-x-auto pb-6 scrollbar-hide">
            
            {/* Memory Match */}
            <div 
              onClick={() => launchGame('memory')}
              className="min-w-[300px] h-48 rounded-3xl bg-[#131313] border border-os-outline/10 hover:border-[#00d2fd]/50 transition-all p-6 relative overflow-hidden cursor-pointer group hover:bg-[#20201f] shadow-lg flex flex-col justify-between"
            >
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#00d2fd]/10 blur-2xl rounded-full group-hover:bg-[#00d2fd]/20 transition-all" />
              
              <div className="w-12 h-12 rounded-xl bg-[#00677e]/30 flex items-center justify-center border border-[#00d2fd]/20">
                <MousePointer2 size={24} className="text-[#00d2fd]" />
              </div>
              
              <div className="relative z-10">
                <h3 className="font-display font-bold text-xl mb-1 group-hover:text-[#00d2fd] transition-colors">Memory Match</h3>
                <p className="text-sm text-os-onSurfaceVariant font-medium">Test your visual recall.</p>
              </div>
            </div>

            {/* Coming Soon */}
            {[1, 2].map((i) => (
              <div 
                key={i}
                className="min-w-[300px] h-48 rounded-3xl bg-[#131313] border border-os-outline/5 p-6 relative overflow-hidden flex flex-col justify-between opacity-50 grayscale"
              >
                <div className="w-12 h-12 rounded-xl bg-os-surfaceContainerHighest flex items-center justify-center">
                  <Ghost size={24} className="text-os-onSurfaceVariant" />
                </div>
                
                <div>
                  <h3 className="font-display font-bold text-xl mb-1 text-os-onSurfaceVariant">Coming Soon</h3>
                  <div className="w-24 h-2 bg-os-surfaceContainerHighest rounded-full mt-2" />
                </div>
              </div>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
};

export default Games;
