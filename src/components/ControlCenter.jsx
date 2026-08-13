import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Wifi, Bluetooth, Sun, Volume2, BatteryFull, Signal, Play, Pause, SkipForward, Settings2, X, Music } from 'lucide-react';
import CustomIcon from './common/CustomIcon';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import useSystemMetrics from '../hooks/useSystemMetrics';
import useNetworkInfo from '../hooks/useNetworkInfo';
import useSoundEffects from '../hooks/useSoundEffects';

const ControlCenter = () => {
  const { playSound } = useSoundEffects();
  const isControlCenterOpen = useOSStore(state => state.isControlCenterOpen);
  const toggleControlCenter = useOSStore(state => state.toggleControlCenter);
  const music = useOSStore(state => state.music);
  const setMusicIsPlaying = useOSStore(state => state.setMusicIsPlaying);
  const nextTrack = useOSStore(state => state.nextTrack);
  const openWindow = useOSStore(state => state.openWindow);
  const transparencyEffects = useOSStore(state => state.transparencyEffects);
  const brightness = useOSStore(state => state.brightness);
  const setBrightness = useOSStore(state => state.setBrightness);
  const setMusicVolume = useOSStore(state => state.setMusicVolume);
  const isPuterSignedIn = useOSStore(state => state.isPuterSignedIn);
  const puterUser = useOSStore(state => state.puterUser);
  // Was called in the "Link Puter" onClick without ever being pulled from the store, so the button
  // threw a ReferenceError — and it renders whenever signed out, which is the default state.
  const signInWithPuter = useOSStore(state => state.signInWithPuter);
  
  const isMobile = useIsMobile();
  const metrics = useSystemMetrics();
  const network = useNetworkInfo();
  
  const volume = Math.round(music.volume * 100);
  const [toggles, setToggles] = useState({ wifi: true, bluetooth: true, airdrop: false });

  const toggleState = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <AnimatePresence>
      {isControlCenterOpen && (
        <>
          {/* Backdrop to close on click outside */}
          <div 
            className="fixed inset-0 z-[60]" 
            onClick={toggleControlCenter}
          />
          
          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0 } : { y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed ${isMobile ? 'inset-0 w-full h-full rounded-none pt-safe-top pb-safe-bottom' : 'bottom-24 left-8 w-[380px] rounded-[2.5rem] border'} bg-[#0e0e0e]/80 ${transparencyEffects ? 'backdrop-blur-3xl' : ''} border-white/10 p-5 z-[70] shadow-[0_32px_64px_rgba(0,0,0,0.6)] flex flex-col space-y-4 select-none grayscale-0 overflow-hidden`}
          >
            {/* Ambient Lighting / Mica Effect Blob */}
            <div className="absolute -top-20 -right-20 w-[250px] h-[250px] bg-[#cc97ff]/20 blur-[80px] rounded-full pointer-events-none -z-10 mix-blend-screen" />
            <div className="absolute -bottom-20 -left-20 w-[200px] h-[200px] bg-[#00d2fd]/20 blur-[80px] rounded-full pointer-events-none -z-10 mix-blend-screen" />

            {/* Header / Status row */}
            <div className="flex justify-between items-center px-2 pt-1 pb-2">
                <div className="flex items-center space-x-2">
                  <CustomIcon icon={BatteryFull} size={16} color={metrics.ram > 80 ? "text-red-400" : "text-[#00f5a0]"} glow={metrics.ram > 80 ? "#f87171" : "#00f5a0"} />
                  <span className="text-xs font-bold text-white tracking-wide">{100 - Math.round(metrics.cpu / 10)}%</span>
                </div>
               <div className="flex items-center gap-4">
                  {!isPuterSignedIn ? (
                    <button
                      onClick={() => { signInWithPuter(); playSound('click'); }}
                      className="px-3 py-1.5 bg-os-primary/10 border border-os-primary/30 rounded-lg text-[10px] font-black text-os-primary uppercase tracking-widest hover:bg-os-primary/20 transition-all"
                    >
                      Link Puter
                    </button>
                  ) : (
                    <div className="flex flex-col items-end border-r border-white/5 pr-4">
                      <span className="text-[10px] font-bold text-[#cc97ff] uppercase tracking-widest">Puter Cloud</span>
                      <div className="flex items-center space-x-1 text-green-400">
                        <Cloud size={12} />
                        <span className="text-xs font-bold truncate max-w-[80px] uppercase">{puterUser?.username || 'Synced'}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-os-onSurfaceVariant uppercase tracking-widest">Network</span>
                      <div className="flex items-center space-x-1">
                        <CustomIcon icon={Signal} size={12} color="text-[#00d2fd]" glow="#00d2fd" />
                        <span className="text-xs font-bold text-white uppercase truncate max-w-[80px]">{network.isOnline ? 'Nexus-5G' : 'Offline'}</span>
                      </div>
                  </div>
                  {isMobile && (
                    <button onClick={toggleControlCenter} className="p-2 bg-white/5 rounded-full">
                       <X size={20} className="text-white" />
                    </button>
                  )}
               </div>
            </div>

            {/* Quick Actions Grid (Asymmetric) */}
            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2'} gap-4`}>
               {/* Primary Network Block - Larger */}
               <div className="col-span-1 space-y-4">
                   <button
                     type="button"
                     role="switch"
                     aria-checked={toggles.wifi}
                     onClick={() => { toggleState('wifi'); playSound('click'); }}
                     className={`w-full p-4 rounded-2xl flex flex-col justify-between h-28 cursor-pointer transition-all duration-300 border relative overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d2fd]/50 ${toggles.wifi ? 'bg-[#00d2fd]/20 border-[#00d2fd]' : 'bg-[#131313]/80 border-os-outline/10 hover:bg-[#1a1a1a]'}`}
                   >
                     {toggles.wifi && <div className="absolute inset-x-0 bottom-0 h-1 bg-[#00d2fd] shadow-[0_0_15px_#00d2fd]" />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toggles.wifi ? 'bg-[#00d2fd] text-[#0e0e0e]' : 'bg-os-surfaceContainerHighest text-os-onSurfaceVariant'}`}>
                         <CustomIcon icon={Wifi} size={16} glow={toggles.wifi ? '#00d2fd' : false} />
                      </div>
                     <div>
                        <span className="block text-sm font-bold text-white">Wi-Fi</span>
                        <span className={`text-[10px] uppercase font-bold tracking-widest ${toggles.wifi ? 'text-[#00d2fd]' : 'text-os-onSurfaceVariant'}`}>{toggles.wifi ? (network.isOnline ? 'Nexus-Home' : 'Connected') : 'Off'}</span>
                     </div>
                   </button>
                   
                   <button
                     type="button"
                     role="switch"
                     aria-checked={toggles.bluetooth}
                     onClick={() => { toggleState('bluetooth'); playSound('click'); }}
                     className={`w-full p-4 rounded-2xl flex flex-col justify-between h-28 cursor-pointer transition-all duration-300 border relative overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cc97ff]/50 ${toggles.bluetooth ? 'bg-[#cc97ff]/20 border-[#cc97ff]' : 'bg-[#131313]/80 border-os-outline/10 hover:bg-[#1a1a1a]'}`}
                   >
                     {toggles.bluetooth && <div className="absolute inset-x-0 bottom-0 h-1 bg-[#cc97ff] shadow-[0_0_15px_#cc97ff]" />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toggles.bluetooth ? 'bg-[#cc97ff] text-[#0e0e0e]' : 'bg-os-surfaceContainerHighest text-os-onSurfaceVariant'}`}>
                         <CustomIcon icon={Bluetooth} size={16} glow={toggles.bluetooth ? '#cc97ff' : false} />
                      </div>
                     <div>
                        <span className="block text-sm font-bold text-white">Bluetooth</span>
                        <span className={`text-[10px] uppercase font-bold tracking-widest ${toggles.bluetooth ? 'text-[#cc97ff]' : 'text-os-onSurfaceVariant'}`}>{toggles.bluetooth ? 'On' : 'Off'}</span>
                     </div>
                   </button>
               </div>

               {/* Right Stack - Focus */}
               <div className="col-span-1 flex flex-col gap-4">
                   <button
                     type="button"
                     role="switch"
                     aria-checked={toggles.airdrop}
                     onClick={() => { toggleState('airdrop'); playSound('click'); }}
                     className={`flex-1 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5a0]/50 ${toggles.airdrop ? 'bg-[#00f5a0]/10 border-[#00f5a0]/30 shadow-[inset_0_0_20px_rgba(0,245,160,0.1)]' : 'bg-[#131313]/80 border-os-outline/10 hover:bg-[#1a1a1a]'}`}
                   >
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${toggles.airdrop ? 'bg-[#131313] border border-[#00f5a0]/30' : 'bg-os-surfaceContainerHighest'}`}>
                           <CustomIcon 
                             icon={Settings2} 
                             size={24} 
                             color={toggles.airdrop ? 'text-[#00f5a0]' : 'text-os-onSurfaceVariant'} 
                             glow={toggles.airdrop ? '#00f5a0' : false}
                           />
                       </div>
                      <div className="text-center">
                          <span className={`block text-xs font-bold ${toggles.airdrop ? 'text-white' : 'text-os-onSurfaceVariant'}`}>Focus</span>
                          <span className={`block text-[10px] uppercase font-bold tracking-widest ${toggles.airdrop ? 'text-[#00f5a0]' : 'text-os-onSurfaceVariant'}`}>{toggles.airdrop ? 'Do Not Disturb' : 'Off'}</span>
                      </div>
                   </button>
               </div>
            </div>

            {/* Sliders Container */}
            <div className="bg-[#131313]/60 p-5 rounded-[2rem] border border-os-outline/10 space-y-6 flex-grow overflow-y-auto">
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-os-onSurfaceVariant flex items-center gap-2">
                          <CustomIcon icon={Sun} size={14} color="text-os-onSurfaceVariant" /> Display
                        </span>
                        <span className="text-white">{brightness}%</span>
                    </div>
                   <div
                      role="slider"
                      aria-label="Brightness"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={brightness}
                      tabIndex={0}
                      className="h-10 md:h-6 bg-os-surfaceContainerHighest/50 rounded-full relative overflow-hidden cursor-pointer shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setBrightness(Math.round(((e.clientX - rect.left) / rect.width) * 100));
                        playSound('click');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') { setBrightness(Math.max(0, brightness - 5)); playSound('click'); }
                        if (e.key === 'ArrowRight') { setBrightness(Math.min(100, brightness + 5)); playSound('click'); }
                      }}
                   >
                      <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-white/20 to-white/90 transition-all duration-300" style={{ width: `${brightness}%` }} />
                   </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-os-onSurfaceVariant flex items-center gap-2">
                          <CustomIcon icon={Volume2} size={14} color="text-os-onSurfaceVariant" /> Audio
                        </span>
                        <span className="text-[#00d2fd]">{volume}%</span>
                    </div>
                   <div
                      role="slider"
                      aria-label="Volume"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={volume}
                      tabIndex={0}
                      className="h-10 md:h-6 bg-os-surfaceContainerHighest/50 rounded-full relative overflow-hidden cursor-pointer shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d2fd]/50"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMusicVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') { setMusicVolume(Math.max(0, music.volume - 0.05)); }
                        if (e.key === 'ArrowRight') { setMusicVolume(Math.min(1, music.volume + 0.05)); }
                      }}

                   >
                      <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00d2fd]/50 to-[#00d2fd] transition-all duration-300" style={{ width: `${volume}%` }} />
                   </div>
                </div>

                {/* Now Playing Media Card - Moved inside sliders on mobile for better space */}
                {isMobile && (
                   <div className="w-full bg-[#131313]/60 p-4 rounded-[2rem] border border-os-outline/10 flex items-center gap-4 relative overflow-hidden group mt-4">
                      <button
                        type="button"
                        aria-label={`Open Music: ${music.currentTrack.title} by ${music.currentTrack.artist}`}
                        onClick={() => { openWindow('music'); toggleControlCenter(); playSound('click'); }}
                        className="flex flex-grow items-center gap-4 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cc97ff]/50 rounded-xl"
                      >
                        <div className="w-14 h-14 bg-gradient-to-br from-[#cc97ff] to-[#00d2fd] rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden flex-shrink-0">
                            <img src={music.currentTrack.cover} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                            <CustomIcon icon={music.isPlaying ? Pause : Play} size={20} color="text-white" glow="rgba(255,255,255,0.4)" className="relative z-10" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="text-xs font-black text-white truncate">{music.currentTrack.title}</h4>
                          <p className="text-[10px] font-bold text-[#cc97ff] truncate uppercase tracking-wider mt-0.5">{music.currentTrack.artist}</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        aria-label={music.isPlaying ? "Pause music" : "Play music"}
                        onClick={() => { setMusicIsPlaying(!music.isPlaying); }}

                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 flex-shrink-0"
                      >
                        <CustomIcon icon={music.isPlaying ? Pause : Play} size={14} color="text-white" />
                      </button>
                   </div>
                )}
            </div>

            {/* Desktop only media card */}
            {!isMobile && (
              <div className="w-full bg-[#131313]/60 p-4 rounded-[2rem] border border-os-outline/10 flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-[100px] h-[100px] bg-[#cc97ff]/10 blur-[30px] rounded-full pointer-events-none group-hover:bg-[#cc97ff]/20 transition-colors" />
                  
                  <button
                    type="button"
                    aria-label={`Open Music: ${music.currentTrack.title} by ${music.currentTrack.artist}`}
                    onClick={() => { openWindow('music'); toggleControlCenter(); playSound('click'); }}
                    className="flex flex-grow items-center gap-4 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cc97ff]/50 rounded-xl z-10"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-[#cc97ff] to-[#00d2fd] rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-300 relative overflow-hidden flex-shrink-0">
                        <img src={music.currentTrack.cover} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                        <div className="absolute inset-0 bg-black/20 rounded-2xl" />
                        <CustomIcon icon={music.isPlaying ? Pause : Play} size={20} color="text-white" glow="rgba(255,255,255,0.4)" className="relative z-10" />
                    </div>

                    <div className="flex-grow min-w-0">
                      <h4 className="text-xs font-black text-white truncate">{music.currentTrack.title}</h4>
                      <p className="text-[10px] font-bold text-[#cc97ff] truncate uppercase tracking-wider mt-0.5">{music.currentTrack.artist}</p>
                    </div>
                  </button>
                  
                  <div className="flex flex-row gap-2 z-10">
                      <button
                        type="button"
                        aria-label={music.isPlaying ? "Pause music" : "Play music"}
                        onClick={() => { setMusicIsPlaying(!music.isPlaying); }}

                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                      >
                        <CustomIcon icon={music.isPlaying ? Pause : Play} size={14} color="text-white" />
                      </button>
                      <button
                        type="button"
                        aria-label="Skip track"
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                        onClick={() => { nextTrack(); playSound('click'); }}
                      >
                        <CustomIcon icon={SkipForward} size={14} color="text-white" />
                      </button>
                  </div>
              </div>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ControlCenter;
