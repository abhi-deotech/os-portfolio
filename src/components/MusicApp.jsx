import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, List, Heart, Repeat, Shuffle, Music, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import Visualizer from './Visualizer';

const PLAYLIST = [
  {
    id: 'metro-niagara',
    youtubeId: 'v9l4yv3w-0w',
    title: 'Niagara Falls (Foot or 2)',
    artist: 'Metro Boomin, Travis Scott, 21 Savage',
    album: 'HEROES & VILLAINS',
    cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/v9l4yv3w-0w/hqdefault.jpg',
    duration: 207,
    genre: 'Trap'
  },
  {
    id: 'travis-fein',
    youtubeId: 'kL5yS90oK-Q',
    title: 'FE!N',
    artist: 'Travis Scott ft. Playboi Carti',
    album: 'UTOPIA',
    cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/kL5yS90oK-Q/hqdefault.jpg',
    duration: 191,
    genre: 'Trap'
  },
  {
    id: 'weeknd-tmbtla',
    youtubeId: 'tYvKLO0wOcU',
    title: 'Take Me Back To LA',
    artist: 'The Weeknd',
    album: 'Hurry Up Tomorrow',
    cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/tYvKLO0wOcU/hqdefault.jpg',
    duration: 240,
    genre: 'R&B'
  },
  {
    id: 'metro-too-many-nights',
    youtubeId: 's_I_N99B9gQ',
    title: 'Too Many Nights',
    artist: 'Metro Boomin, Don Toliver, Future',
    album: 'HEROES & VILLAINS',
    cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/s_I_N99B9gQ/hqdefault.jpg',
    duration: 199,
    genre: 'Trap'
  },
  {
    id: 'travis-telekinesis',
    youtubeId: 'pS8Zsk67qG8',
    title: 'TELEKINESIS',
    artist: 'Travis Scott ft. SZA, Future',
    album: 'UTOPIA',
    cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/pS8Zsk67qG8/hqdefault.jpg',
    duration: 353,
    genre: 'Trap'
  },
  {
    id: 'metro-type-shit',
    youtubeId: 'Fw7h_q1Z4Xk',
    title: 'Type Shit',
    artist: 'Future, Metro Boomin, Travis Scott',
    album: "WE DON'T TRUST YOU",
    cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/Fw7h_q1Z4Xk/hqdefault.jpg',
    duration: 228,
    genre: 'Trap'
  },
  {
    id: 'travis-meltdown',
    youtubeId: '68rI89V8B08',
    title: 'MELTDOWN',
    artist: 'Travis Scott ft. Drake',
    album: 'UTOPIA',
    cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/68rI89V8B08/hqdefault.jpg',
    duration: 246,
    genre: 'Trap'
  },
  {
    id: 'metro-like-that',
    youtubeId: 'N9bKBAA22Go',
    title: 'Like That',
    artist: 'Future, Metro Boomin, Kendrick Lamar',
    album: "WE DON'T TRUST YOU",
    cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/N9bKBAA22Go/hqdefault.jpg',
    duration: 267,
    genre: 'Trap'
  },
  {
    id: 'mac-chamber',
    youtubeId: 'NY8IS0ssnXQ',
    title: 'Chamber of Reflection',
    artist: 'Mac DeMarco',
    album: 'Salad Days',
    cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/NY8IS0ssnXQ/hqdefault.jpg',
    duration: 231,
    genre: 'Indie'
  },
  {
    id: 'daft-get-lucky',
    youtubeId: '5NV6Rdv1a3I',
    title: 'Get Lucky',
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/5NV6Rdv1a3I/hqdefault.jpg',
    duration: 248,
    genre: 'Electronic'
  }
];

const MusicApp = () => {
  const { 
    music, 
    setMusicIsPlaying, 
    setMusicTrack, 
    setMusicCurrentTime, 
    toggleLikeSong,
    setMusicView,
    activeAccent 
  } = useOSStore();
  const playerRef = useRef(null);
  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [volume, setVolume] = useState(music.volume * 100);
  const [searchQuery, setSearchQuery] = useState('');

  const displayPlaylist = useMemo(() => {
    let list = PLAYLIST;
    if (music.activeView === 'Library') {
      list = PLAYLIST.filter(t => music.likedSongs?.includes(t.id));
    } else if (music.activeView === 'Browse') {
      list = PLAYLIST.filter(t => t.genre === 'Trap' || t.genre === 'R&B');
    } else if (music.activeView === 'Radio') {
      list = PLAYLIST.filter(t => t.genre === 'Electronic' || t.genre === 'Indie' || t.genre === 'Pop');
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
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const createPlayer = () => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player('yt-player', {
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
          origin: window.location.origin,
          widget_referrer: window.location.origin,
          enablejsapi: 1
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
            }
            if (event.data === window.YT.PlayerState.PAUSED) {
              setMusicIsPlaying(false);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }
  }, []);

  useEffect(() => {
    if (playerRef.current && playerRef.current.playVideo) {
      if (music.isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [music.isPlaying]);

  useEffect(() => {
    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(music.currentTrack.youtubeId);
      // Auto-play on track change
      if (music.isPlaying) {
        playerRef.current.playVideo();
      }
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
    const idx = PLAYLIST.findIndex(t => t.id === music.currentTrack.id);
    const nextTrack = idx < PLAYLIST.length - 1 ? PLAYLIST[idx + 1] : PLAYLIST[0];
    setMusicTrack(nextTrack);
  };

  const handlePrev = () => {
    const idx = PLAYLIST.findIndex(t => t.id === music.currentTrack.id);
    const prevTrack = idx > 0 ? PLAYLIST[idx - 1] : PLAYLIST[PLAYLIST.length - 1];
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
            {['Home', 'Browse', 'Radio', 'Library'].map(item => (
              <button 
                key={item} 
                onClick={() => setMusicView(item)}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all text-left font-bold text-sm ${music.activeView === item ? 'bg-os-primary/10 text-os-primary shadow-sm' : 'hover:bg-white/5 text-os-onSurfaceVariant hover:text-white'}`}
              >
                {item}
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
        
        <div className="flex-grow overflow-y-auto p-4 md:p-8 z-10">
          <div className="flex items-end gap-6 md:gap-8 mb-8 md:mb-10">
            {isMobile && (
              <button onClick={() => setShowSidebar(true)} className="absolute top-4 left-4 p-2 bg-black/40 rounded-xl border border-white/10 z-20">
                <List size={20} />
              </button>
            )}
            <motion.div 
              layoutId="track-cover"
              className="w-32 h-32 md:w-48 md:h-48 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden border border-white/10 shrink-0"
            >
              <img src={music.currentTrack.cover} alt="Cover" className="w-full h-full object-cover" />
            </motion.div>
            <div className="flex flex-col gap-1 md:gap-2">
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-os-primary">Playlist</span>
              <div className="flex items-center gap-4">
                <h1 className="text-2xl md:text-5xl font-black tracking-tighter truncate max-w-[200px] md:max-w-none">{music.currentTrack.title}</h1>
                <button 
                  onClick={() => toggleLikeSong(music.currentTrack.id)}
                  className={`p-2 rounded-full hover:bg-white/5 transition-colors ${music.likedSongs?.includes(music.currentTrack.id) ? 'text-os-primary' : 'text-white/40'}`}
                >
                  <Heart size={24} fill={music.likedSongs?.includes(music.currentTrack.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-os-onSurfaceVariant font-bold text-xs md:text-base">
                <span>{music.currentTrack.artist}</span>
                {!isMobile && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{music.currentTrack.album}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6 relative max-w-md">
            <input 
              type="text"
              placeholder="Search playlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-os-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <div className={`grid ${isMobile ? 'grid-cols-[30px_1fr_60px]' : 'grid-cols-[30px_1fr_1fr_80px]'} px-4 py-2 text-[10px] font-black uppercase tracking-widest text-os-onSurfaceVariant border-b border-white/5 mb-2`}>
              <span>#</span>
              <span>Title</span>
              {!isMobile && <span>Album</span>}
              <span className="text-right">Time</span>
            </div>
            {displayPlaylist.length > 0 ? displayPlaylist.map((track, i) => {
              const isActive = music.currentTrack.id === track.id;
              return (
                <div 
                  key={track.id}
                  onClick={() => setMusicTrack(track)}
                  className={`grid ${isMobile ? 'grid-cols-[30px_1fr_60px]' : 'grid-cols-[30px_1fr_1fr_80px]'} px-4 py-3 rounded-xl cursor-pointer transition-all group ${isActive ? 'bg-os-primary/10' : 'hover:bg-white/5'}`}
                >
                  <span className={`text-xs flex items-center ${isActive ? 'text-os-primary' : 'text-os-onSurfaceVariant'}`}>
                    {isActive && music.isPlaying ? (
                      <div className="flex gap-0.5 items-end h-3">
                        {[0, 1, 2].map(b => (
                          <motion.div 
                            key={b}
                            animate={{ height: [4, 12, 4] }}
                            transition={{ repeat: Infinity, duration: 0.5 + (b * 0.1) }}
                            className="w-0.5 bg-os-primary"
                          />
                        ))}
                      </div>
                    ) : i + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold truncate ${isActive ? 'text-os-primary' : 'text-white'}`}>{track.title}</span>
                    <span className="text-[10px] text-os-onSurfaceVariant font-bold truncate">{track.artist}</span>
                  </div>
                  {!isMobile && <span className="text-xs text-os-onSurfaceVariant font-medium flex items-center truncate">{track.album}</span>}
                  <span className="text-xs text-os-onSurfaceVariant font-mono flex items-center justify-end">{formatTime(track.duration)}</span>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Music size={48} className="mb-4" />
                <p className="text-sm font-bold">No tracks found</p>
                <p className="text-[10px] uppercase tracking-widest mt-1">Try a different view or search</p>
              </div>
            )}
          </div>
        </div>

        {/* Player Bar */}
        <div className={`h-24 bg-black/60 backdrop-blur-3xl border-t border-white/5 px-4 md:px-8 flex items-center justify-between z-20`}>
          <div className={`flex items-center gap-4 ${isMobile ? 'w-1/2' : 'w-1/3'}`}>
             <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden border border-white/10 shrink-0">
                <img src={music.currentTrack.cover} alt="Cover" className="w-full h-full object-cover" />
             </div>
             <div className="overflow-hidden">
                <h4 className="text-xs md:text-sm font-bold truncate">{music.currentTrack.title}</h4>
                <p className="text-[10px] text-os-onSurfaceVariant font-bold uppercase tracking-wider truncate">{music.currentTrack.artist}</p>
             </div>
          </div>

          <div className={`flex flex-col items-center gap-2 ${isMobile ? 'w-1/2' : 'w-1/3'}`}>
             <div className="flex items-center gap-4 md:gap-6">
                {!isMobile && <button className="text-os-onSurfaceVariant hover:text-white transition-colors"><Shuffle size={16} /></button>}
                <button className="text-os-onSurfaceVariant hover:text-white transition-colors" onClick={handlePrev}><SkipBack size={20} fill="currentColor" /></button>
                <button 
                  onClick={() => setMusicIsPlaying(!music.isPlaying)}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                >
                  {music.isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="translate-x-0.5" />}
                </button>
                <button className="text-os-onSurfaceVariant hover:text-white transition-colors" onClick={handleNext}><SkipForward size={20} fill="currentColor" /></button>
                {!isMobile && <button className="text-os-onSurfaceVariant hover:text-white transition-colors"><Repeat size={16} /></button>}
             </div>
             <div className="flex items-center gap-3 w-full max-w-[200px] md:max-w-md group">
                 <span className="text-[10px] font-mono text-os-onSurfaceVariant w-8">{formatTime(music.currentTime)}</span>
                 <div className="flex-grow h-1 bg-white/10 rounded-full relative group/seek">
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
                 {!isMobile && <span className="text-[10px] font-mono text-os-onSurfaceVariant w-8 text-right">{formatTime(music.currentTrack.duration)}</span>}
             </div>
          </div>

          {!isMobile && (
            <div className="flex items-center justify-end gap-4 w-1/3">
               <button className="text-os-onSurfaceVariant hover:text-white transition-colors"><List size={18} /></button>
               <div className="flex items-center gap-2">
                  <Volume2 size={18} className="text-os-onSurfaceVariant" />
                  <div className="w-24 h-1 bg-white/10 rounded-full relative overflow-hidden">
                     <input 
                        type="range" 
                        min="0" max="100" 
                        value={volume} 
                        onChange={handleVolumeChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                     />
                     <div className="absolute top-0 left-0 h-full bg-white/60" style={{ width: `${volume}%` }} />
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      <div id="yt-player" className="absolute -z-50 pointer-events-none opacity-0"></div>
    </div>
  );
};

export default MusicApp;
