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
          {/* Backdrop to close on click outside. Deliberately NOT role="button"/tabIndex — a
              full-viewport invisible target is a phantom tab stop that announces nothing, which is
              worse than no stop at all. The mobile close button below is the labelled affordance. */}
          <div
            className="fixed inset-0 z-[60]"
            aria-hidden="true"
            onClick={toggleControlCenter}
          />
          
          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0 } : { y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed ${isMobile ? 'inset-0 w-full h-full rounded-none pt-safe-top pb-safe-bottom' : 'bottom-24 left-8 w-[380px] rounded-[2.5rem] border'} bg-sdl-surface/80 ${transparencyEffects ? 'backdrop-blur-3xl' : ''} border-hairline/10 p-5 z-[70] shadow-lift-window flex flex-col space-y-4 select-none grayscale-0 overflow-hidden`}
          >
            {/* Ambient Lighting / Mica Effect Blob. mix-blend-screen is kept deliberately: under a
                light colorway screen-blending an accent into a pale surface washes the blob out to
                nothing, which is the same thing --sdl-glow does — atmosphere is dark-mode grammar. */}
            <div className="absolute -top-20 -right-20 w-[250px] h-[250px] bg-sdl-accent/20 blur-[80px] rounded-full pointer-events-none -z-10 mix-blend-screen" />
            <div className="absolute -bottom-20 -left-20 w-[200px] h-[200px] bg-sdl-soft/40 blur-[80px] rounded-full pointer-events-none -z-10 mix-blend-screen" />

            {/* Header / Status row */}
            <div className="flex justify-between items-center px-2 pt-1 pb-2">
                <div className="flex items-center space-x-2">
                  <CustomIcon icon={BatteryFull} size={16} color={metrics.ram > 80 ? "text-sdl-alert" : "text-sdl-done"} glow />
                  <span className="text-xs font-bold text-sdl-ink tracking-wide tabular-nums">{100 - Math.round(metrics.cpu / 10)}%</span>
                </div>
               <div className="flex items-center gap-4">
                  {!isPuterSignedIn ? (
                    <button
                      onClick={() => { signInWithPuter(); playSound('click'); }}
                      className="px-3 py-1.5 bg-os-primary/10 border border-os-primary/30 rounded-lg text-[10px] font-black text-os-primary uppercase tracking-widest hover:bg-os-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                    >
                      Link Puter
                    </button>
                  ) : (
                    <div className="flex flex-col items-end border-r border-hairline/5 pr-4">
                      <span className="text-[10px] font-bold text-sdl-accent uppercase tracking-widest">Puter Cloud</span>
                      <div className="flex items-center space-x-1 text-sdl-done">
                        <Cloud size={12} />
                        <span className="text-xs font-bold truncate max-w-[80px] uppercase tabular-nums">{puterUser?.username || 'Synced'}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-os-onSurfaceVariant uppercase tracking-widest">Network</span>
                      <div className="flex items-center space-x-1">
                        <CustomIcon icon={Signal} size={12} color="text-sdl-sec" />
                        <span className="text-xs font-bold text-sdl-ink uppercase truncate max-w-[80px] tabular-nums">{network.isOnline ? 'Nexus-5G' : 'Offline'}</span>
                      </div>
                  </div>
                  {isMobile && (
                    <button
                      type="button"
                      aria-label="Close Control Center"
                      onClick={toggleControlCenter}
                      className="p-2 bg-veil/5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                    >
                       <X size={20} className="text-sdl-ink" />
                    </button>
                  )}
               </div>
            </div>

            {/* Quick Actions Grid (Asymmetric).
                Every toggle now speaks in the ONE accent voice rather than a per-toggle hue. The
                cyan/violet/green trio was the legacy palette hardcoded three ways, so on the 15
                non-legacy colorways an "on" toggle lit up in a colour the theme does not contain —
                and on the 10 light ones it sat on a black slab. Active reads soft + accent border +
                aInk; inactive reads sunken + hairline. */}
            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2'} gap-4`}>
               {/* Primary Network Block - Larger */}
               <div className="col-span-1 space-y-4">
                   <button
                     type="button"
                     role="switch"
                     aria-checked={toggles.wifi}
                     onClick={() => { toggleState('wifi'); playSound('click'); }}
                     className={`w-full p-4 rounded-2xl flex flex-col justify-between h-28 cursor-pointer transition-all duration-300 border relative overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${toggles.wifi ? 'bg-sdl-soft border-sdl-accent' : 'bg-sdl-sunken/80 border-hairline/10 hover:bg-sdl-surface2'}`}
                   >
                     {toggles.wifi && <div className="absolute inset-x-0 bottom-0 h-1 bg-sdl-accent shadow-[0_0_15px_var(--sdl-glow)]" />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toggles.wifi ? 'bg-sdl-accent text-sdl-onAccent' : 'bg-os-surfaceContainerHighest text-os-onSurfaceVariant'}`}>
                         <CustomIcon icon={Wifi} size={16} glow={toggles.wifi} />
                      </div>
                     <div>
                        <span className="block text-sm font-bold text-sdl-ink">Wi-Fi</span>
                        <span className={`text-[10px] uppercase font-bold tracking-widest ${toggles.wifi ? 'text-sdl-aInk' : 'text-sdl-sec'}`}>{toggles.wifi ? (network.isOnline ? 'Nexus-Home' : 'Connected') : 'Off'}</span>
                     </div>
                   </button>
                   
                   <button
                     type="button"
                     role="switch"
                     aria-checked={toggles.bluetooth}
                     onClick={() => { toggleState('bluetooth'); playSound('click'); }}
                     className={`w-full p-4 rounded-2xl flex flex-col justify-between h-28 cursor-pointer transition-all duration-300 border relative overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${toggles.bluetooth ? 'bg-sdl-soft border-sdl-accent' : 'bg-sdl-sunken/80 border-hairline/10 hover:bg-sdl-surface2'}`}
                   >
                     {toggles.bluetooth && <div className="absolute inset-x-0 bottom-0 h-1 bg-sdl-accent shadow-[0_0_15px_var(--sdl-glow)]" />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toggles.bluetooth ? 'bg-sdl-accent text-sdl-onAccent' : 'bg-os-surfaceContainerHighest text-os-onSurfaceVariant'}`}>
                         <CustomIcon icon={Bluetooth} size={16} glow={toggles.bluetooth} />
                      </div>
                     <div>
                        <span className="block text-sm font-bold text-sdl-ink">Bluetooth</span>
                        <span className={`text-[10px] uppercase font-bold tracking-widest ${toggles.bluetooth ? 'text-sdl-aInk' : 'text-sdl-sec'}`}>{toggles.bluetooth ? 'On' : 'Off'}</span>
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
                     className={`flex-1 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${toggles.airdrop ? 'bg-sdl-soft border-sdl-accent shadow-[inset_0_0_20px_var(--sdl-glow)]' : 'bg-sdl-sunken/80 border-hairline/10 hover:bg-sdl-surface2'}`}
                   >
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${toggles.airdrop ? 'bg-sdl-sunken border border-sdl-accent/30' : 'bg-os-surfaceContainerHighest'}`}>
                           <CustomIcon
                             icon={Settings2}
                             size={24}
                             color={toggles.airdrop ? 'text-sdl-aInk' : 'text-os-onSurfaceVariant'}
                             glow={toggles.airdrop}
                           />
                       </div>
                      <div className="text-center">
                          <span className={`block text-xs font-bold ${toggles.airdrop ? 'text-sdl-ink' : 'text-os-onSurfaceVariant'}`}>Focus</span>
                          <span className={`block text-[10px] uppercase font-bold tracking-widest ${toggles.airdrop ? 'text-sdl-aInk' : 'text-sdl-sec'}`}>{toggles.airdrop ? 'Do Not Disturb' : 'Off'}</span>
                      </div>
                   </button>
               </div>
            </div>

            {/* Sliders Container */}
            <div className="bg-sdl-sunken/60 p-5 rounded-[2rem] border border-os-outline/10 space-y-6 flex-grow overflow-y-auto">
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold tabular-nums">
                        <span className="text-os-onSurfaceVariant flex items-center gap-2">
                          <CustomIcon icon={Sun} size={14} color="text-os-onSurfaceVariant" /> Display
                        </span>
                        <span className="text-sdl-ink">{brightness}%</span>
                    </div>
                   <div
                      role="slider"
                      aria-label="Brightness"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={brightness}
                      tabIndex={0}
                      className="h-10 md:h-6 bg-os-surfaceContainerHighest/50 rounded-full relative overflow-hidden cursor-pointer shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
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
                      {/* veil, not accent: the brightness fill stays the neutral of the pair so it
                          reads apart from the accent-tinted audio track below. veil flips polarity
                          with the mode, so the filled portion is the darker one on a light plane
                          instead of white-on-white. */}
                      <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-veil/20 to-veil/90 transition-all duration-300" style={{ width: `${brightness}%` }} />
                   </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold tabular-nums">
                        <span className="text-os-onSurfaceVariant flex items-center gap-2">
                          <CustomIcon icon={Volume2} size={14} color="text-os-onSurfaceVariant" /> Audio
                        </span>
                        <span className="text-sdl-accent">{volume}%</span>
                    </div>
                   <div
                      role="slider"
                      aria-label="Volume"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={volume}
                      tabIndex={0}
                      className="h-10 md:h-6 bg-os-surfaceContainerHighest/50 rounded-full relative overflow-hidden cursor-pointer shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMusicVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
                        playSound('click');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') { setMusicVolume(Math.max(0, music.volume - 0.05)); playSound('click'); }
                        if (e.key === 'ArrowRight') { setMusicVolume(Math.min(1, music.volume + 0.05)); playSound('click'); }
                      }}
                   >
                      <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-sdl-accent/50 to-sdl-accent transition-all duration-300" style={{ width: `${volume}%` }} />
                   </div>
                </div>

                {/* Now Playing Media Card - Moved inside sliders on mobile for better space */}
                {isMobile && (
                   <div className="w-full bg-sdl-sunken/60 p-4 rounded-[2rem] border border-os-outline/10 flex items-center gap-4 relative overflow-hidden group mt-4">
                      <button
                        type="button"
                        aria-label={`Open Music: ${music.currentTrack.title} by ${music.currentTrack.artist}`}
                        onClick={() => { openWindow('music'); toggleControlCenter(); playSound('click'); }}
                        className="flex flex-grow items-center gap-4 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 rounded-xl"
                      >
                        <div className="w-14 h-14 bg-sdl-accent rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden flex-shrink-0">
                            <img src={music.currentTrack.cover} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                            {/* Same scrim as the desktop twin below, for the same reason: `onAccent`
                                is measured against the accent, so the surface under the glyph has to
                                actually be accent-tinted for that measurement to hold. */}
                            <div className="absolute inset-0 bg-sdl-accent/30 rounded-2xl" />
                            <CustomIcon icon={music.isPlaying ? Pause : Play} size={20} color="text-sdl-onAccent" glow className="relative z-10" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="text-xs font-black text-sdl-ink truncate">{music.currentTrack.title}</h4>
                          <p className="text-[10px] font-bold text-sdl-accent truncate uppercase tracking-wider mt-0.5">{music.currentTrack.artist}</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        aria-label={music.isPlaying ? "Pause music" : "Play music"}
                        onClick={() => { setMusicIsPlaying(!music.isPlaying); playSound('click'); }}
                        className="w-10 h-10 rounded-full bg-veil/5 flex items-center justify-center cursor-pointer hover:bg-veil/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 flex-shrink-0"
                      >
                        <CustomIcon icon={music.isPlaying ? Pause : Play} size={14} color="text-sdl-ink" />
                      </button>
                   </div>
                )}
            </div>

            {/* Desktop only media card */}
            {!isMobile && (
              <div className="w-full bg-sdl-sunken/60 p-4 rounded-[2rem] border border-os-outline/10 flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-[100px] h-[100px] bg-sdl-accent/10 blur-[30px] rounded-full pointer-events-none group-hover:bg-sdl-accent/20 transition-colors" />

                  <button
                    type="button"
                    aria-label={`Open Music: ${music.currentTrack.title} by ${music.currentTrack.artist}`}
                    onClick={() => { openWindow('music'); toggleControlCenter(); playSound('click'); }}
                    className="flex flex-grow items-center gap-4 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 rounded-xl z-10"
                  >
                    <div className="w-14 h-14 bg-sdl-accent rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-300 relative overflow-hidden flex-shrink-0">
                        <img src={music.currentTrack.cover} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                        {/* Accent, not a neutral veil. This scrim exists so the glyph on top stays
                            legible over arbitrary cover art, and that glyph is `onAccent` — a value
                            computed by measuring contrast against the ACCENT. Tinting the half-
                            opacity cover back toward accent is what makes that measurement true;
                            a veil would lift toward white in dark mode and sink the glyph instead. */}
                        <div className="absolute inset-0 bg-sdl-accent/30 rounded-2xl" />
                        <CustomIcon icon={music.isPlaying ? Pause : Play} size={20} color="text-sdl-onAccent" glow className="relative z-10" />
                    </div>

                    <div className="flex-grow min-w-0">
                      <h4 className="text-xs font-black text-sdl-ink truncate">{music.currentTrack.title}</h4>
                      <p className="text-[10px] font-bold text-sdl-accent truncate uppercase tracking-wider mt-0.5">{music.currentTrack.artist}</p>
                    </div>
                  </button>
                  
                  <div className="flex flex-row gap-2 z-10">
                      <button
                        type="button"
                        aria-label={music.isPlaying ? "Pause music" : "Play music"}
                        onClick={() => { setMusicIsPlaying(!music.isPlaying); playSound('click'); }}
                        className="w-10 h-10 rounded-full bg-veil/5 hover:bg-veil/10 flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                      >
                        <CustomIcon icon={music.isPlaying ? Pause : Play} size={14} color="text-sdl-ink" />
                      </button>
                      <button
                        type="button"
                        aria-label="Skip track"
                        className="w-10 h-10 rounded-full bg-veil/5 hover:bg-veil/10 flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                        onClick={() => { playSound('click'); }}
                      >
                        <CustomIcon icon={SkipForward} size={14} color="text-sdl-ink" />
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
