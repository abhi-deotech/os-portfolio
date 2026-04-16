import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, Play, ChevronLeft, 
  Monitor, Cpu, History, X,
  Gamepad, Loader2, AlertCircle
} from 'lucide-react';
import useOSStore from '../store/osStore';

const RETRO_GAMES = [
  {
    id: 'spacegulls',
    title: 'Spacegulls',
    system: 'nes',
    year: '2021',
    genre: 'Platformer',
    developer: 'Morphcat Games',
    description: 'A high-speed simultaneous co-op platformer. Use your wings to fly and navigate dangerous environments.',
    thumbnail: '/assets/games/spacegulls.png',
    romUrl: 'https://cdn.jsdelivr.net/gh/OpenEmu/OpenEmu-Update@master/Homebrew/NES/Spacegulls/Spacegulls.nes'
  },
  {
    id: 'streemerz',
    title: 'Streemerz',
    system: 'nes',
    year: '2012',
    genre: 'Action',
    developer: 'The New 8-bit Heroes',
    description: 'A high-octane action game where you must navigate complex levels using your grappling hook.',
    thumbnail: '/assets/games/streemerz.png',
    romUrl: 'https://cdn.jsdelivr.net/gh/OpenEmu/OpenEmu-Update@master/Homebrew/NES/Streemerz/Streemerz.nes'
  },
  {
    id: 'tobutobugirl',
    title: 'Tobu Tobu Girl',
    system: 'gb',
    year: '2017',
    genre: 'Arcade',
    developer: 'Tangram Games',
    description: 'A high-energy arcade platformer. Help Tobu Tobu Girl save her cat by bouncing on enemies!',
    thumbnail: '/assets/games/tobutobugirl.png',
    romUrl: 'https://cdn.jsdelivr.net/gh/linoscope/CAMLBOY@master/resource/games/tobu.gb'
  },
  {
    id: 'alterego',
    title: 'Alter Ego',
    system: 'nes',
    year: '2011',
    genre: 'Puzzle Platformer',
    developer: 'Denis Grachev',
    description: 'Switch between your physical and phantom self to navigate complex levels in this cult classic.',
    thumbnail: '/assets/games/alterego.png',
    romUrl: 'https://cdn.jsdelivr.net/gh/OpenEmu/OpenEmu-Update@master/Homebrew/NES/Alter%20Ego/Alter_Ego.nes'
  },
  {
    id: 'retroid',
    title: 'Retroid',
    system: 'gb',
    year: '2014',
    genre: 'Arcade',
    developer: 'Vectre',
    description: 'A polished Arkanoid-style brick breaker for the Game Boy. Smooth action and classic gameplay.',
    thumbnail: '/assets/games/retroid.png',
    romUrl: 'https://cdn.jsdelivr.net/gh/OpenEmu/OpenEmu-Update@master/Homebrew/Game%20Boy/Retroid/Retroid.gb'
  },
  {
    id: 'doom',
    title: 'Doom',
    system: 'doom',
    year: '1993',
    genre: 'FPS',
    developer: 'id Software',
    description: 'The legendary first-person shooter that defined the genre. Fight your way through the Phobos moon base.',
    thumbnail: '/assets/games/doom.png',
    romUrl: 'https://cdn.jsdelivr.net/gh/nneonneo/universal-doom@main/DOOM1.WAD'
  },
  {
    id: 'bladebuster',
    title: 'Blade Buster',
    system: 'nes',
    year: '2010',
    genre: 'Shmup',
    developer: 'HL',
    description: 'A stunning high-speed caravan-style shooter. One of the most technically impressive NES homebrews ever made.',
    thumbnail: '/assets/games/bladebuster.jpg',
    romUrl: 'https://cdn.jsdelivr.net/gh/OpenEmu/OpenEmu-Update@master/Homebrew/NES/BladeBuster/BladeBuster.nes'
  }
];

const RetroArcade = () => {
  const { activeRetroGame, setRetroGame } = useOSStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleLaunchGame = (game) => {
    setRetroGame(game);
    setLoading(true);
    setError(null);
  };

  const handleBackToLibrary = () => {
    setRetroGame(null);
    setLoading(false);
    setError(null);
  };

  // Points to our local bootstrap file which uses the EmulatorJS CDN
  const getEmulatorUrl = (game) => {
    if (!game) return '';
    const params = new URLSearchParams({
      'game': game.romUrl,
      'system': game.system,
      'game_id': game.id
    });
    return `/arcade/index.html?${params.toString()}`;
  };

  return (
    <div className="h-full w-full bg-[#050505] text-white flex flex-col relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(204,151,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(204,151,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 px-8 py-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          {activeRetroGame ? (
            <motion.button
              whileHover={{ scale: 1.1, x: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleBackToLibrary}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60 hover:text-white"
            >
              <ChevronLeft size={20} />
            </motion.button>
          ) : (
            <div className="p-3 rounded-2xl bg-os-primary/20 border border-os-primary/30">
              <Gamepad2 className="text-os-primary" size={24} />
            </div>
          )}
          <div>
            <h1 className="text-lg font-black italic tracking-tight uppercase leading-none">
              {activeRetroGame ? activeRetroGame.title : 'Quantum Arcade'}
            </h1>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mt-1">
              {activeRetroGame ? `${activeRetroGame.system.toUpperCase()} Sync v2.0` : 'Neural-Link Emulation Interface'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
             <span className="text-[10px] font-black text-os-secondary uppercase tracking-widest">System Load</span>
             <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Stable 60 FPS</span>
          </div>
          <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-os-primary">
             <Cpu size={18} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!activeRetroGame ? (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-grow p-8 overflow-y-auto z-10 custom-scrollbar"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {RETRO_GAMES.map((game) => (
                <motion.div
                  key={game.id}
                  whileHover={{ y: -5, scale: 1.02 }}
                  onClick={() => handleLaunchGame(game)}
                  className="group relative h-64 rounded-[2rem] border border-white/5 bg-white/[0.02] overflow-hidden cursor-pointer transition-all hover:border-os-primary/30 hover:bg-os-primary/[0.03] shadow-xl"
                >
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={game.thumbnail} 
                      alt={game.title} 
                      className="w-full h-full object-cover opacity-30 group-hover:opacity-60 transition-opacity duration-500 scale-105 group-hover:scale-100"
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
                  </div>

                  <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest text-os-primary">
                      {game.system}
                    </span>
                  </div>

                  <div className="absolute inset-0 p-6 flex flex-col justify-end z-10">
                    <h3 className="text-xl font-black italic tracking-tight uppercase group-hover:text-os-primary transition-colors">
                      {game.title}
                    </h3>
                    <p className="text-xs font-bold text-white/40 mt-1 line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform translate-y-2 group-hover:translate-y-0">
                      {game.description}
                    </p>
                    
                    <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 transform translate-y-2 group-hover:translate-y-0">
                       <span className="text-[9px] font-black uppercase tracking-[0.2em] text-os-primary">Launch Interface</span>
                       <div className="p-2 rounded-xl bg-os-primary text-black">
                          <Play size={14} fill="currentColor" />
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="emulator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow relative z-10 bg-black flex flex-col"
          >
            {loading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050505]">
                 <Loader2 size={48} className="text-os-primary animate-spin mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 animate-pulse">Initializing Emulator Core...</p>
              </div>
            )}

            {error ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050505] p-8 text-center">
                 <AlertCircle size={48} className="text-red-500 mb-4" />
                 <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Core Initialization Failure</h2>
                 <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-2 mb-8">External ROM link blocked by Security Protocol</p>
                 <button onClick={handleBackToLibrary} className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl">Return to Library</button>
              </div>
            ) : (
              <div className="flex-grow flex flex-col relative">
                <iframe
                  src={getEmulatorUrl(activeRetroGame)}
                  className="w-full h-full border-0"
                  allow="fullscreen; gamepad"
                  onLoad={() => setLoading(false)}
                  onError={() => setError(true)}
                  title={`Playing ${activeRetroGame.title}`}
                />
                
                {/* Control Hints Overlay */}
                <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2 pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                   <div className="px-4 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-right">
                      <p className="text-[9px] font-black uppercase tracking-widest text-os-primary mb-2">Interface Map</p>
                      <div className="space-y-1">
                         <div className="flex justify-end items-center gap-2">
                            <span className="text-[8px] text-white/40 uppercase">Action / Menu</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white">Enter / Space / Z</span>
                         </div>
                         <div className="flex justify-end items-center gap-2">
                            <span className="text-[8px] text-white/40 uppercase">Back / Cancel</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white">Esc / X</span>
                         </div>
                         <div className="flex justify-end items-center gap-2">
                            <span className="text-[8px] text-white/40 uppercase">Movement</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white">WASD / Arrows</span>
                         </div>
                         {activeRetroGame?.id === 'doom' && (
                           <>
                             <div className="flex justify-end items-center gap-2">
                                <span className="text-[8px] text-white/40 uppercase">Fire / Attack</span>
                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white">L-Click / Ctrl</span>
                             </div>
                             <div className="flex justify-end items-center gap-2">
                                <span className="text-[8px] text-white/40 uppercase">Mouse Lock</span>
                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white">F1 / ESC</span>
                             </div>
                           </>
                         )}
                      </div>
                   </div>
                   <p className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">Hover for instructions</p>
                </div>
              </div>
            )}
            
            <motion.div 
              className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent flex justify-center opacity-0 hover:opacity-100 transition-opacity z-30"
            >
               <div className="px-6 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-6">
                  <div className="flex items-center gap-2">
                     <Monitor size={14} className="text-os-secondary" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-white/60">60Hz Sync</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <button 
                    onClick={handleBackToLibrary}
                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors"
                  >
                    <X size={14} /> Exit Node
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RetroArcade;
