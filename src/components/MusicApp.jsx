import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, List, Heart, Repeat, Shuffle, Music, ChevronLeft, Search, TrendingUp, Radio, Library, Home, Maximize2, Minimize2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import Visualizer from './Visualizer';
import { MUSIC_DATA, CATEGORIES } from '../data/musicData';

const MusicApp = () => {
  const { 
    music, 
    setMusicIsPlaying, 
    setMusicTrack, 
    setMusicCurrentTime, 
    toggleLikeSong,
    setMusicView,
    toggleShuffle,
    setRepeatMode,
    activeAccent,
    unlockAchievement
  } = useOSStore();
  
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [volume, setVolume] = useState(music.volume * 100);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const displayPlaylist = useMemo(() => {
    let list = MUSIC_DATA;
    if (music.activeView === 'Library') {
      list = MUSIC_DATA.filter(t => music.likedSongs?.includes(t.id));
    } else if (music.activeView === 'Explore') {
      list = MUSIC_DATA;
    }
    
    return list.filter(track => 
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [music.activeView, music.likedSongs, searchQuery]);

  useEffect(() => {
    setShowSidebar(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }

    const createPlayer = () => {
      if (playerRef.current || !window.YT || !window.YT.Player || !containerRef.current) return;
      
      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          host: 'https://www.youtube-nocookie.com',
          height: '1',
          width: '1',
          videoId: music.currentTrack.youtubeId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            playsinline: 1
          },
          events: {
            onReady: (event) => {
              event.target.setVolume(volume);
              if (music.isPlaying) event.target.playVideo();
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                handleNext();
              }
              if (event.data === window.YT.PlayerState.PLAYING) {
                setMusicIsPlaying(true);
                unlockAchievement('audiophile');
              }
              if (event.data === window.YT.PlayerState.PAUSED) {
                setMusicIsPlaying(false);
              }
            },
            onError: (e) => {
              console.error('YouTube Player Error:', e.data);
              if ([2, 5, 100, 101, 150].includes(e.data)) {
                handleNext();
              }
            }
          }
        });
      } catch (err) {
        console.warn('Failed to initialize YouTube player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousCallback) previousCallback();
        createPlayer();
      };
    }
  }, []);

  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      const state = playerRef.current.getPlayerState?.();
      if (music.isPlaying) {
        if (state !== window.YT?.PlayerState?.PLAYING) {
          playerRef.current.playVideo();
        }
      } else {
        if (state !== window.YT?.PlayerState?.PAUSED) {
          playerRef.current.pauseVideo();
        }
      }
    }
  }, [music.isPlaying]);

  useEffect(() => {
    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(music.currentTrack.youtubeId);
      // Removed redundant playVideo call here as loadVideoById starts playing by default,
      // and we handle play/pause synchronization in the other useEffect.
    }
  }, [music.currentTrack.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setMusicCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => {
    if (music.repeatMode === 'one') {
      playerRef.current?.seekTo(0);
      playerRef.current?.playVideo();
      return;
    }

    const list = displayPlaylist.length > 0 ? displayPlaylist : MUSIC_DATA;
    let nextTrack;

    if (music.shuffle) {
      const otherTracks = list.filter(t => t.id !== music.currentTrack.id);
      nextTrack = otherTracks[Math.floor(Math.random() * otherTracks.length)];
    } else {
      const idx = list.findIndex(t => t.id === music.currentTrack.id);
      if (idx === list.length - 1) {
        if (music.repeatMode === 'all') nextTrack = list[0];
        else return; // End of playlist
      } else {
        nextTrack = list[idx + 1];
      }
    }

    if (nextTrack) setMusicTrack(nextTrack);
  };

  const handlePrev = () => {
    if (music.currentTime > 5) {
      playerRef.current?.seekTo(0);
      return;
    }

    const list = displayPlaylist.length > 0 ? displayPlaylist : MUSIC_DATA;
    const idx = list.findIndex(t => t.id === music.currentTrack.id);
    const prevTrack = idx > 0 ? list[idx - 1] : list[list.length - 1];
    setMusicTrack(prevTrack);
  };

  const handleVolumeChange = (e) => {
    const newVol = parseInt(e.target.value);
    setVolume(newVol);
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(newVol);
    }
  };

  const handleSeek = (e) => {
    const seekTo = (parseFloat(e.target.value) / 100) * music.currentTrack.duration;
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seekTo, true);
      setMusicCurrentTime(seekTo);
    }
  };

  const formatTime = (time) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const cycleRepeatMode = () => {
    const modes = ['none', 'all', 'one'];
    const currentIdx = modes.indexOf(music.repeatMode);
    setRepeatMode(modes[(currentIdx + 1) % modes.length]);
  };

  return (
    <div className="flex h-full bg-[#030712] text-white overflow-hidden rounded-b-2xl relative">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-os-primary/5 to-transparent pointer-events-none" />
      {/* Sidebar */}
      {(showSidebar || !isMobile) && (
        <motion.div 
          initial={isMobile ? { x: -300 } : false}
          animate={{ x: 0 }}
          className={`${isMobile ? 'absolute inset-y-0 left-0 z-50 w-64' : 'w-64'} bg-black/90 md:bg-black/40 border-r border-white/5 p-6 flex flex-col gap-8 h-full`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-os-primary">
              <Music size={24} />
              <span className="font-black tracking-tighter text-xl">Lumina Music</span>
            </div>
            {isMobile && (
              <button onClick={() => setShowSidebar(false)} className="p-2 hover:bg-white/5 rounded-xl">
                <ChevronLeft size={20} />
              </button>
            )}
          </div>
          
          <nav className="flex flex-col gap-2">
            {[
              { id: 'Home', icon: Home },
              { id: 'Explore', icon: Search },
              { id: 'Library', icon: Library }
            ].map(item => (
              <button 
                key={item.id} 
                onClick={() => setMusicView(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left font-bold text-sm ${music.activeView === item.id ? 'bg-os-primary/10 text-os-primary shadow-sm' : 'hover:bg-white/5 text-os-onSurfaceVariant hover:text-white'}`}
              >
                <item.icon size={18} />
                {item.id}
              </button>
            ))}
          </nav>

          <div className="mt-auto">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-os-primary/20 to-os-secondary/20 border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-os-primary mb-1">Now Playing</p>
              <p className="text-xs font-bold truncate">{music.currentTrack.title}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-grow flex flex-col relative overflow-hidden bg-black/20">
        <div className="absolute inset-0 z-0 opacity-40">
          <Visualizer isPlaying={music.isPlaying} accentColor={activeAccent === 'purple' ? '#a855f7' : activeAccent === 'blue' ? '#3b82f6' : '#10b981'} />
        </div>
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-os-primary/10 to-transparent pointer-events-none" />
        
        <div className="flex-grow overflow-y-auto p-4 md:p-8 z-10 custom-scrollbar relative">
          {isMobile && (
            <button onClick={() => setShowSidebar(true)} className="absolute top-4 left-4 p-2 bg-black/40 rounded-xl border border-white/10 z-20">
              <List size={20} />
            </button>
          )}

          <AnimatePresence mode="wait">
            {music.activeView === 'Home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                <div className="relative group">
                   <div className="absolute inset-0 bg-gradient-to-r from-os-primary/20 to-os-secondary/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all opacity-50" />
                   <div className="relative p-8 md:p-12 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl overflow-hidden">
                      <div className="absolute right-0 top-0 w-64 h-64 bg-os-primary/10 blur-[100px]" />
                      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                         <motion.img 
                            whileHover={{ scale: 1.05 }}
                            src={MUSIC_DATA[0].cover} 
                            className="w-48 h-48 md:w-64 md:h-64 rounded-2xl shadow-2xl border border-white/10"
                         />
                         <div className="text-center md:text-left">
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-os-primary mb-4 block">Recommended for you</span>
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">{MUSIC_DATA[0].title}</h2>
                            <p className="text-os-onSurfaceVariant font-bold text-lg mb-8">{MUSIC_DATA[0].artist}</p>
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                               <button onClick={() => setMusicTrack(MUSIC_DATA[0])} className="px-8 py-3 rounded-full bg-os-primary text-black font-black hover:scale-105 active:scale-95 transition-all">Play Now</button>
                               <button onClick={() => toggleLikeSong(MUSIC_DATA[0].id)} className="px-8 py-3 rounded-full bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                                  <Heart size={18} fill={music.likedSongs?.includes(MUSIC_DATA[0].id) ? 'currentColor' : 'none'} className={music.likedSongs?.includes(MUSIC_DATA[0].id) ? 'text-os-primary' : ''} />
                                  {music.likedSongs?.includes(MUSIC_DATA[0].id) ? 'Saved' : 'Save to Library'}
                               </button>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                <div>
                   <h3 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                      <TrendingUp className="text-os-primary" /> Trending Now
                   </h3>
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {MUSIC_DATA.slice(1, 11).map(track => (
                        <motion.div 
                          key={track.id}
                          whileHover={{ y: -5 }}
                          className="group relative bg-white/5 border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-all"
                          onMouseDown={() => setMusicTrack(track)}
                        >
                           <div className="relative aspect-square mb-4 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                              <img src={track.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                 <div className="w-12 h-12 rounded-full bg-os-primary flex items-center justify-center text-black">
                                    <Play size={24} fill="currentColor" />
                                 </div>
                              </div>
                           </div>
                           <h4 className="font-bold text-sm truncate">{track.title}</h4>
                           <p className="text-xs text-os-onSurfaceVariant truncate">{track.artist}</p>
                        </motion.div>
                      ))}
                   </div>
                </div>

                <div>
                   <h3 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                      <Radio className="text-os-secondary" /> New Releases
                   </h3>
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {MUSIC_DATA.slice(11, 21).map(track => (
                        <motion.div 
                          key={track.id}
                          whileHover={{ y: -5 }}
                          className="group relative bg-white/5 border border-white/5 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-all"
                          onMouseDown={() => setMusicTrack(track)}
                        >
                           <div className="relative aspect-square mb-4 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                              <img src={track.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                 <div className="w-12 h-12 rounded-full bg-os-secondary flex items-center justify-center text-black">
                                    <Play size={24} fill="currentColor" />
                                 </div>
                              </div>
                           </div>
                           <h4 className="font-bold text-sm truncate">{track.title}</h4>
                           <p className="text-xs text-os-onSurfaceVariant truncate">{track.artist}</p>
                        </motion.div>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}

            {music.activeView === 'Explore' && (
              <motion.div 
                key="explore"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="space-y-10"
              >
                <div className="relative h-48 md:h-64 rounded-3xl overflow-hidden border border-white/10 group">
                   <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-blue-500/40 to-cyan-400/40 group-hover:scale-110 transition-transform duration-700" />
                   <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/40 backdrop-blur-sm">
                      <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">Discover Infinite Beats</h2>
                      <div className="relative w-full max-w-xl">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                         <input 
                           type="text"
                           placeholder="Search for tracks, artists, or genres..."
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-4 py-4 text-lg font-bold focus:outline-none focus:bg-white/20 focus:border-os-primary/50 transition-all"
                         />
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {[
                     { id: 'trap', name: 'Trap Essentials', color: 'from-purple-500 to-indigo-600', icon: TrendingUp },
                     { id: 'rb', name: 'R&B Vibez', color: 'from-pink-500 to-rose-600', icon: Heart },
                     { id: 'indie', name: 'Indie/Chill', color: 'from-emerald-400 to-cyan-500', icon: Radio },
                     { id: 'electronic', name: 'Electronic Night', color: 'from-blue-500 to-blue-700', icon: Music },
                   ].map(cat => (
                     <motion.button 
                       key={cat.id}
                       whileHover={{ y: -8 }}
                       className={`relative h-40 rounded-2xl overflow-hidden group shadow-xl`}
                       onClick={() => setSearchQuery(cat.name.split(' ')[0])}
                     >
                        <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-80 group-hover:scale-110 transition-transform duration-500`} />
                        <div className="absolute inset-0 flex flex-col p-6 justify-between">
                           <cat.icon size={32} className="text-white/80" />
                           <h4 className="text-xl font-black text-left">{cat.name}</h4>
                        </div>
                     </motion.button>
                   ))}
                </div>

                {searchQuery && (
                  <div>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                      <Search className="text-os-primary" /> Search results for "{searchQuery}"
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {displayPlaylist.map(track => (
                        <motion.div 
                          key={track.id} 
                          whileHover={{ scale: 1.05 }}
                          onMouseDown={() => setMusicTrack(track)} 
                          className="cursor-pointer group bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-all border border-white/5"
                        >
                           <div className="relative aspect-square mb-2 rounded-lg overflow-hidden border border-white/10">
                              <img src={track.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                 <Play size={20} fill="currentColor" />
                              </div>
                           </div>
                           <p className="text-xs font-bold truncate">{track.title}</p>
                           <p className="text-[10px] text-os-onSurfaceVariant truncate">{track.artist}</p>
                        </motion.div>
                      ))}
                      {displayPlaylist.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                          <Music size={48} className="mx-auto mb-4 opacity-20" />
                          <p className="text-os-onSurfaceVariant font-bold">No results found for your search.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!searchQuery && (
                  <div>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                      <Music className="text-os-primary" /> Browse All Tracks
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {MUSIC_DATA.map(track => (
                        <motion.div 
                          key={track.id} 
                          whileHover={{ scale: 1.05 }}
                          onMouseDown={() => setMusicTrack(track)} 
                          className="cursor-pointer group bg-white/5 p-3 rounded-xl hover:bg-white/10 transition-all border border-white/5"
                        >
                           <div className="relative aspect-square mb-2 rounded-lg overflow-hidden border border-white/10">
                              <img src={track.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                 <Play size={20} fill="currentColor" />
                              </div>
                           </div>
                           <p className="text-xs font-bold truncate">{track.title}</p>
                           <p className="text-[10px] text-os-onSurfaceVariant truncate">{track.artist}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {music.activeView === 'Library' && (
              <motion.div 
                key="library"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-end gap-8 mb-12">
                   <div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl bg-gradient-to-br from-os-primary to-os-secondary flex items-center justify-center shadow-2xl border border-white/10">
                      <Heart size={80} fill="black" strokeWidth={0} />
                   </div>
                   <div className="flex flex-col gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.3em] text-os-primary">Collection</span>
                      <h2 className="text-4xl md:text-7xl font-black tracking-tighter">Liked Songs</h2>
                      <p className="text-os-onSurfaceVariant font-bold">{music.likedSongs?.length || 0} tracks in your library</p>
                      <button 
                        onClick={() => {
                          const firstLiked = MUSIC_DATA.find(t => music.likedSongs?.includes(t.id));
                          if (firstLiked) setMusicTrack(firstLiked);
                        }}
                        className="mt-4 px-10 py-4 rounded-full bg-os-primary text-black font-black hover:scale-105 active:scale-95 transition-all w-fit"
                      >
                        Play All
                      </button>
                   </div>
                </div>

                <div className="space-y-1">
                  <div className={`grid ${isMobile ? 'grid-cols-[30px_1fr_60px]' : 'grid-cols-[30px_1fr_1fr_80px]'} px-4 py-2 text-[10px] font-black uppercase tracking-widest text-os-onSurfaceVariant border-b border-white/5 mb-2`}>
                    <span>#</span>
                    <span>Title</span>
                    {!isMobile && <span>Album</span>}
                    <span className="text-right">Time</span>
                  </div>
                  {displayPlaylist.map((track, i) => (
                    <div 
                      key={track.id}
                      onMouseDown={() => setMusicTrack(track)}
                      className={`grid ${isMobile ? 'grid-cols-[30px_1fr_60px]' : 'grid-cols-[30px_1fr_1fr_80px]'} px-4 py-3 rounded-xl cursor-pointer transition-all group ${music.currentTrack.id === track.id ? 'bg-os-primary/10' : 'hover:bg-white/5'}`}
                    >
                      <span className="text-xs flex items-center text-os-onSurfaceVariant">{i+1}</span>
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold truncate ${music.currentTrack.id === track.id ? 'text-os-primary' : 'text-white'}`}>{track.title}</span>
                        <span className="text-[10px] text-os-onSurfaceVariant font-bold truncate">{track.artist}</span>
                      </div>
                      {!isMobile && <span className="text-xs text-os-onSurfaceVariant font-medium flex items-center truncate">{track.album}</span>}
                      <span className="text-xs text-os-onSurfaceVariant font-mono flex items-center justify-end">{formatTime(track.duration)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Player Bar */}
        <div className={`h-24 bg-black/80 backdrop-blur-3xl border-t border-white/5 px-4 md:px-8 flex items-center justify-between z-20`}>
          <div className={`flex items-center gap-4 ${isMobile ? 'w-1/2' : 'w-1/3'}`}>
             <motion.div 
               whileHover={{ scale: 1.05 }}
               className="w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden border border-white/10 shrink-0 cursor-pointer"
               onClick={() => setIsFullScreen(true)}
             >
                <img src={music.currentTrack.cover} alt="Cover" className="w-full h-full object-cover" />
             </motion.div>
             <div className="overflow-hidden">
                <h4 className="text-xs md:text-sm font-bold truncate cursor-pointer hover:underline" onClick={() => setIsFullScreen(true)}>{music.currentTrack.title}</h4>
                <p className="text-[10px] text-os-onSurfaceVariant font-bold uppercase tracking-wider truncate">{music.currentTrack.artist}</p>
             </div>
          </div>

          <div className={`flex flex-col items-center gap-2 ${isMobile ? 'w-1/2' : 'w-1/3'}`}>
             <div className="flex items-center gap-4 md:gap-6">
                <button 
                  onClick={toggleShuffle}
                  className={`transition-colors ${music.shuffle ? 'text-os-primary' : 'text-os-onSurfaceVariant hover:text-white'}`}
                >
                  <Shuffle size={18} />
                </button>
                <button className="text-os-onSurfaceVariant hover:text-white transition-colors" onClick={handlePrev}><SkipBack size={22} fill="currentColor" /></button>
                <button 
                  onClick={() => {
                    const nextState = !music.isPlaying;
                    setMusicIsPlaying(nextState);
                    if (nextState) unlockAchievement('audiophile');
                  }}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                >
                  {music.isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="translate-x-0.5" />}
                </button>
                <button className="text-os-onSurfaceVariant hover:text-white transition-colors" onClick={handleNext}><SkipForward size={22} fill="currentColor" /></button>
                <button 
                  onClick={cycleRepeatMode}
                  className={`relative transition-colors ${music.repeatMode !== 'none' ? 'text-os-primary' : 'text-os-onSurfaceVariant hover:text-white'}`}
                >
                  <Repeat size={18} />
                  {music.repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-black bg-os-primary text-black rounded-full w-3 h-3 flex items-center justify-center">1</span>}
                </button>
             </div>
             <div className="flex items-center gap-3 w-full max-w-[200px] md:max-w-md group">
                 <span className="text-[10px] font-mono text-os-onSurfaceVariant w-8">{formatTime(music.currentTime)}</span>
                 <div className="flex-grow h-1.5 bg-white/10 rounded-full relative group/seek overflow-hidden">
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={music.currentTrack.duration > 0 ? (music.currentTime / music.currentTrack.duration) * 100 : 0}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <motion.div 
                      initial={false}
                      animate={{ width: `${(music.currentTime / music.currentTrack.duration) * 100}%` }}
                      className="absolute top-0 left-0 h-full bg-os-primary group-hover/seek:bg-os-secondary transition-colors" 
                    />
                 </div>
                 <span className="text-[10px] font-mono text-os-onSurfaceVariant w-8 text-right">{formatTime(music.currentTrack.duration)}</span>
             </div>
          </div>

          {!isMobile && (
            <div className="flex items-center justify-end gap-6 w-1/3">
               <button onClick={() => setIsFullScreen(true)} className="text-os-onSurfaceVariant hover:text-os-primary transition-colors"><Maximize2 size={18} /></button>
               <div className="flex items-center gap-3">
                  <Volume2 size={18} className="text-os-onSurfaceVariant" />
                  <div className="w-24 h-1 bg-white/10 rounded-full relative overflow-hidden group/vol">
                     <input 
                        type="range" 
                        min="0" max="100" 
                        value={volume} 
                        onChange={handleVolumeChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     />
                     <div className="absolute top-0 left-0 h-full bg-white/60 group-hover/vol:bg-os-primary transition-colors" style={{ width: `${volume}%` }} />
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Mode */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 100 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl p-8 md:p-16 flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Immersive Background */}
            <div className="absolute inset-0 z-0">
               <Visualizer isPlaying={music.isPlaying} accentColor={activeAccent === 'purple' ? '#a855f7' : '#3b82f6'} scale={1.5} />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            <button 
              onClick={() => setIsFullScreen(false)}
              className="absolute top-8 right-8 p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all z-20"
            >
              <Minimize2 size={24} />
            </button>

            <div className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row items-center gap-12 md:gap-20">
               <motion.div 
                 layoutId="track-cover"
                 className="w-64 h-64 md:w-[500px] md:h-[500px] rounded-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden relative group"
               >
                  <img src={music.currentTrack.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[10s] linear" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-os-primary/20 to-transparent pointer-events-none" />
               </motion.div>

               <div className="flex flex-col gap-8 flex-grow">
                  <div className="space-y-2">
                     <motion.h2 
                       initial={{ x: -20, opacity: 0 }}
                       animate={{ x: 0, opacity: 1 }}
                       className="text-4xl md:text-8xl font-black tracking-tighter"
                     >
                       {music.currentTrack.title}
                     </motion.h2>
                     <motion.p 
                       initial={{ x: -20, opacity: 0 }}
                       animate={{ x: 0, opacity: 1 }}
                       transition={{ delay: 0.1 }}
                       className="text-xl md:text-3xl text-os-primary font-bold"
                     >
                       {music.currentTrack.artist}
                     </motion.p>
                  </div>

                  {/* Lyrics Placeholder */}
                  <div className="h-48 md:h-64 overflow-hidden mask-fade relative">
                     <div className="space-y-4 py-8">
                        <p className="text-lg md:text-2xl font-bold opacity-30">Yeah, we're living in the moment</p>
                        <p className="text-xl md:text-3xl font-black text-white">Every heartbeat is a new song</p>
                        <p className="text-lg md:text-2xl font-bold opacity-30">Lumina OS rhythm keeping us strong</p>
                        <p className="text-lg md:text-2xl font-bold opacity-30">Vibing with the particles, all night long</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="flex items-center gap-4 w-full">
                        <span className="text-xs font-mono opacity-60">{formatTime(music.currentTime)}</span>
                        <div className="flex-grow h-2 bg-white/10 rounded-full relative overflow-hidden">
                           <input 
                              type="range"
                              min="0" max="100"
                              value={(music.currentTime / music.currentTrack.duration) * 100}
                              onChange={handleSeek}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                           />
                           <div className="absolute top-0 left-0 h-full bg-os-primary" style={{ width: `${(music.currentTime / music.currentTrack.duration) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono opacity-60">{formatTime(music.currentTrack.duration)}</span>
                     </div>

                     <div className="flex items-center justify-center md:justify-start gap-10">
                        <button onClick={toggleShuffle} className={music.shuffle ? 'text-os-primary' : 'opacity-40'}><Shuffle size={28} /></button>
                        <button onClick={handlePrev} className="hover:scale-110 transition-transform"><SkipBack size={48} fill="currentColor" /></button>
                        <button 
                          onClick={() => setMusicIsPlaying(!music.isPlaying)}
                          className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-os-primary/20"
                        >
                          {music.isPlaying ? <Pause size={40} fill="black" /> : <Play size={40} fill="black" className="translate-x-1" />}
                        </button>
                        <button onClick={handleNext} className="hover:scale-110 transition-transform"><SkipForward size={48} fill="currentColor" /></button>
                        <button onClick={cycleRepeatMode} className={music.repeatMode !== 'none' ? 'text-os-primary' : 'opacity-40'}><Repeat size={28} /></button>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={containerRef} className="absolute -z-50 pointer-events-none opacity-0"></div>
    </div>
  );
};

export default MusicApp;
