import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, MousePointer2, Home, Trophy, Settings, Ghost, Sparkles, ChevronRight, Play, LayoutGrid, ChevronLeft, Brain, Hash } from 'lucide-react';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';

const Games = () => {
  const isMobile = useIsMobile();
  const { openWindow, unlockAchievement } = useOSStore();
  const [activeTab, setActiveTab] = useState('home');
  const [showSidebar, setShowSidebar] = useState(true);
  const [hasTriggeredAchievement, setHasTriggeredAchievement] = useState(false);

  const launchGame = (gameId) => {
    if (gameId === 'retroarcade') {
      useOSStore.getState().setRetroGame(null);
    }
    openWindow(gameId);
    unlockAchievement('gamer');
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (isMobile) setShowSidebar(false);
  };

  return (
    <div className="flex h-full w-full bg-[#0e0e0e] text-os-onSurface overflow-hidden rounded-2xl font-sans relative">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#cc97ff]/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-[#00d2fd]/20 blur-[100px] rounded-full pointer-events-none" />

      {/* Sidebar Navigation */}
      <div className={`${isMobile ? (showSidebar ? 'w-full absolute inset-0' : 'hidden') : 'w-64 border-r'} bg-[#131313]/80 backdrop-blur-3xl border-os-outline/10 flex flex-col z-20 transition-all`}>
        <div className="p-6 flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#cc97ff] to-[#be8af0] flex items-center justify-center shadow-[0_0_20px_rgba(204,151,255,0.4)]">
            <Gamepad2 size={24} className="text-[#360061]" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Nexus<span className="text-[#cc97ff]">X</span></span>
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
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center justify-between px-4 py-4 md:py-3 rounded-xl transition-all relative overflow-hidden group ${
                activeTab === item.id && !isMobile
                  ? 'bg-os-surfaceContainerHighest/50 text-[#cc97ff]' 
                  : 'text-os-onSurfaceVariant hover:bg-os-surfaceContainerHigh/30 hover:text-os-onSurface'
              }`}
            >
              <div className="flex items-center space-x-3">
                {activeTab === item.id && !isMobile && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#9effc8] rounded-r-full shadow-[0_0_10px_#9effc8]" />
                )}
                <item.icon size={20} className={activeTab === item.id ? 'text-[#cc97ff]' : ''} />
                <span className="font-semibold text-base md:text-sm">{item.label}</span>
              </div>
              <ChevronRight size={16} className="opacity-50" />
            </button>
          ))}
        </nav>

        {/* User Summary Card */}
        <div className="p-4 mx-4 mb-6 mt-auto bg-os-surfaceContainerHigh/40 backdrop-blur-xl rounded-2xl border border-os-outline/10 relative overflow-hidden">
           <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#00d2fd]/20 blur-xl rounded-full" />
           <p className="text-[10px] text-os-onSurfaceVariant uppercase tracking-widest font-bold mb-1">Player Rank</p>
           <div className="flex items-center space-x-2">
             <span className="text-xl font-display font-black text-white">LVL 42</span>
             <Sparkles size={14} className="text-[#00d2fd]" />
           </div>
           <div className="mt-3 h-1 w-full bg-os-surfaceContainerHighest rounded-full overflow-hidden">
             <div className="h-full bg-gradient-to-r from-[#00d2fd] to-[#cc97ff] w-[75%] shadow-[0_0_10px_#cc97ff]" />
           </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 relative z-10 scrollbar-hide ${isMobile && showSidebar ? 'hidden' : ''}`}>
        
        {/* Mobile Back Button */}
        {isMobile && (
          <button 
            onClick={() => setShowSidebar(true)}
            className="flex items-center space-x-2 text-[#cc97ff] font-bold mb-6 active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} />
            <span>Games</span>
          </button>
        )}

        {/* Tab Content */}
        {activeTab === 'home' || activeTab === 'all' ? (
          <>
            {/* Hero Section */}
            <div className="mb-8 md:mb-12">
              <div className="flex items-center space-x-2 text-[#9effc8] mb-4 text-[10px] md:text-sm font-bold tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-[#9effc8] animate-pulse shadow-[0_0_8px_#9effc8]" />
                <span>Now Playing</span>
              </div>

              <div 
                onClick={() => launchGame('snake')}
                className="group relative w-full h-60 md:h-80 rounded-[2rem] overflow-hidden cursor-pointer border border-os-outline/10 hover:border-[#cc97ff]/50 transition-all duration-500 shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a103c] via-[#060e20] to-[#030712] transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/50 to-transparent">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <h1 className="font-display text-3xl md:text-5xl font-black text-white mb-1 md:mb-2 drop-shadow-lg group-hover:text-[#cc97ff] transition-colors">Snake Retro</h1>
                      <p className="text-os-onSurfaceVariant font-medium text-sm md:text-lg max-w-md line-clamp-2 md:line-clamp-none">Classic arcade experience reborn with kinetic glass aesthetics.</p>
                    </div>
                    
                    <button className="flex items-center justify-center space-x-2 px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-[#cc97ff] to-[#be8af0] text-[#360061] font-bold rounded-2xl shadow-[0_0_20px_rgba(204,151,255,0.4)] group-hover:scale-105 active:scale-95 transition-all w-full md:w-auto">
                      <Play fill="currentColor" size={18} />
                      <span>Launch</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Games */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl md:text-2xl font-bold">Library</h2>
                <button className="text-xs md:text-sm font-bold text-os-onSurfaceVariant hover:text-white flex items-center space-x-1 group">
                  <span>See All</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="flex space-x-4 md:space-x-6 overflow-x-auto pb-6 scrollbar-hide">
                {/* Retro Arcade */}
                <div onClick={() => launchGame('retroarcade')} className="min-w-[260px] md:min-w-[300px] h-40 md:h-48 rounded-3xl bg-gradient-to-br from-os-primary/20 to-os-secondary/20 border border-os-primary/30 hover:border-os-primary/60 transition-all p-5 md:p-6 relative overflow-hidden cursor-pointer group shadow-xl flex flex-col justify-between">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-os-primary/20 blur-2xl rounded-full group-hover:bg-os-primary/40 transition-all" />
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-os-primary/20 flex items-center justify-center border border-os-primary/30 shadow-[0_0_15px_rgba(204,151,255,0.3)]">
                    <Gamepad2 size={isMobile ? 20 : 24} className="text-os-primary" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-display font-black text-lg md:text-xl mb-1 text-white group-hover:text-os-primary transition-colors">Retro Arcade</h3>
                    <p className="text-xs md:text-sm text-white/60 font-medium">Classic NES/GB Emulation Hub.</p>
                  </div>
                </div>

                {/* Memory Match */}
                <div onClick={() => launchGame('memory')} className="min-w-[260px] md:min-w-[300px] h-40 md:h-48 rounded-3xl bg-[#131313] border border-os-outline/10 hover:border-[#00d2fd]/50 transition-all p-5 md:p-6 relative overflow-hidden cursor-pointer group shadow-lg flex flex-col justify-between">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#00d2fd]/10 blur-2xl rounded-full group-hover:bg-[#00d2fd]/20 transition-all" />
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#00677e]/30 flex items-center justify-center border border-[#00d2fd]/20">
                    <MousePointer2 size={isMobile ? 20 : 24} className="text-[#00d2fd]" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-display font-bold text-lg md:text-xl mb-1 group-hover:text-[#00d2fd] transition-colors">Memory Match</h3>
                    <p className="text-xs md:text-sm text-os-onSurfaceVariant font-medium">Test your visual recall.</p>
                  </div>
                </div>

                {/* Trivia Quest */}
                <div onClick={() => launchGame('trivia')} className="min-w-[260px] md:min-w-[300px] h-40 md:h-48 rounded-3xl bg-[#131313] border border-os-outline/10 hover:border-[#ff86c3]/50 transition-all p-5 md:p-6 relative overflow-hidden cursor-pointer group shadow-lg flex flex-col justify-between">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#ff86c3]/10 blur-2xl rounded-full group-hover:bg-[#ff86c3]/20 transition-all" />
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#610037]/30 flex items-center justify-center border border-[#ff86c3]/20">
                    <Brain size={isMobile ? 20 : 24} className="text-[#ff86c3]" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-display font-bold text-lg md:text-xl mb-1 group-hover:text-[#ff86c3] transition-colors">Trivia Quest</h3>
                    <p className="text-xs md:text-sm text-os-onSurfaceVariant font-medium">Daily knowledge challenges.</p>
                  </div>
                </div>

                {/* 2048 */}
                <div onClick={() => launchGame('2048')} className="min-w-[260px] md:min-w-[300px] h-40 md:h-48 rounded-3xl bg-[#131313] border border-os-outline/10 hover:border-[#9effc8]/50 transition-all p-5 md:p-6 relative overflow-hidden cursor-pointer group shadow-lg flex flex-col justify-between">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#9effc8]/10 blur-2xl rounded-full group-hover:bg-[#9effc8]/20 transition-all" />
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#004d26]/30 flex items-center justify-center border border-[#9effc8]/20">
                    <LayoutGrid size={isMobile ? 20 : 24} className="text-[#9effc8]" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-display font-bold text-lg md:text-xl mb-1 group-hover:text-[#9effc8] transition-colors">2048 Retro</h3>
                    <p className="text-xs md:text-sm text-os-onSurfaceVariant font-medium">Merge tiles to reach 2048.</p>
                  </div>
                </div>

                {/* Sudoku */}
                <div onClick={() => launchGame('sudoku')} className="min-w-[260px] md:min-w-[300px] h-40 md:h-48 rounded-3xl bg-[#131313] border border-os-outline/10 hover:border-[#00d2fd]/50 transition-all p-5 md:p-6 relative overflow-hidden cursor-pointer group shadow-lg flex flex-col justify-between">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#00d2fd]/10 blur-2xl rounded-full group-hover:bg-[#00d2fd]/20 transition-all" />
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#00677e]/30 flex items-center justify-center border border-[#00d2fd]/20">
                    <Hash size={isMobile ? 20 : 24} className="text-[#00d2fd]" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-display font-bold text-lg md:text-xl mb-1 group-hover:text-[#00d2fd] transition-colors">Sudoku Master</h3>
                    <p className="text-xs md:text-sm text-os-onSurfaceVariant font-medium">Train your logical thinking.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'achievements' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div>
               <h2 className="font-display text-3xl font-black mb-2">Trophy Room</h2>
               <p className="text-os-onSurfaceVariant">Track your progress across the NexusX library.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Snake Charmer', desc: 'Reach a length of 50 in Snake Retro.', progress: 80, color: '#cc97ff', icon: Gamepad2 },
                  { title: 'Grandmaster', desc: 'Solve a Sudoku puzzle in under 5 minutes.', progress: 100, color: '#00d2fd', icon: Hash, completed: true },
                  { title: 'Merge King', desc: 'Reach the 4096 tile in 2048.', progress: 35, color: '#9effc8', icon: LayoutGrid },
                  { title: 'Quick Witt', desc: 'Answer 10 trivia questions correctly in a row.', progress: 60, color: '#ff86c3', icon: Brain },
                ].map((ach, i) => (
                  <div key={i} className="p-6 rounded-3xl bg-[#131313] border border-os-outline/10 relative overflow-hidden group">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5`} style={{ backgroundColor: `${ach.color}20` }}>
                        <ach.icon size={24} style={{ color: ach.color }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {ach.title}
                          {ach.completed && <Sparkles size={16} className="text-yellow-400" />}
                        </h3>
                        <p className="text-xs text-os-onSurfaceVariant">{ach.desc}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-os-onSurfaceVariant">
                        <span>Progress</span>
                        <span>{ach.progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${ach.progress}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className="h-full rounded-full shadow-[0_0_10px_currentColor]" 
                          style={{ backgroundColor: ach.color, color: ach.color }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        ) : (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8">
             <Ghost size={64} className="text-os-onSurfaceVariant/20 mb-6" />
             <h2 className="text-2xl font-black mb-2">Settings Hub</h2>
             <p className="text-os-onSurfaceVariant max-w-xs mx-auto">Configure your gaming profile and system preferences.</p>
             <button className="mt-8 px-8 py-3 bg-os-surfaceContainerLow border border-os-outline/10 rounded-2xl font-bold hover:bg-os-surfaceContainerHigh transition-all">
                System Config
             </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Games;
