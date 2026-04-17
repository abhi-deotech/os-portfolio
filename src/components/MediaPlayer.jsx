import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2, Minimize2, List, Grid, Search, ChevronLeft, Film, Music, Info, Download, Share2, MoreVertical, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MEDIA_DATA, MEDIA_CATEGORIES } from '../data/mediaData';
import useOSStore from '../store/osStore';

const MediaPlayer = ({ file: initialFile }) => {
  const [currentMedia, setCurrentMedia] = useState(initialFile || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [showControls, setShowControls] = useState(true);
  const [view, setView] = useState(initialFile ? 'player' : 'library');
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const controlsTimeout = useRef(null);

  const { activeAccent } = useOSStore();

  useEffect(() => {
    if (initialFile) {
      setCurrentMedia(initialFile);
      setView('player');
    }
  }, [initialFile]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.log("Playback failed:", error);
          setIsPlaying(false);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    setProgress((current / total) * 100);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const seekTime = (e.target.value / 100) * duration;
    videoRef.current.currentTime = seekTime;
    setProgress(e.target.value);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const selectMedia = (media) => {
    setCurrentMedia(media);
    setView('player');
    setIsPlaying(false);
    setProgress(0);
  };

  const filteredMedia = useMemo(() => {
    return MEDIA_DATA.filter(item => {
      const matchesCategory = category === 'all' || item.type === category || item.category === category;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           item.artist.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, searchQuery]);

  const handleBackToLibrary = () => {
    if (videoRef.current) videoRef.current.pause();
    setIsPlaying(false);
    setView('library');
  };

  return (
    <div 
      className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden rounded-b-2xl relative select-none"
      onMouseMove={handleMouseMove}
    >
      <AnimatePresence mode="wait">
        {view === 'library' ? (
          <motion.div 
            key="library"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col h-full"
          >
            {/* Library Header */}
            <div className="p-6 md:p-8 bg-gradient-to-b from-os-primary/10 to-transparent border-b border-white/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                   <h2 className="text-3xl md:text-4xl font-black tracking-tighter flex items-center gap-3">
                      <Film className="text-os-primary" /> Lumina Media
                   </h2>
                   <p className="text-os-onSurfaceVariant font-bold mt-1">Explore your collection of videos and animations</p>
                </div>
                <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                   <input 
                     type="text"
                     placeholder="Search media..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 w-full md:w-64 focus:outline-none focus:border-os-primary/50 transition-all font-bold"
                   />
                </div>
              </div>

              <div className="flex gap-2 mt-8 overflow-x-auto pb-2 no-scrollbar">
                {MEDIA_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`px-6 py-2 rounded-xl whitespace-nowrap font-bold text-sm transition-all ${category === cat.id ? 'bg-os-primary text-black' : 'bg-white/5 hover:bg-white/10 text-os-onSurfaceVariant hover:text-white border border-white/5'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Media Grid */}
            <div className="flex-grow overflow-y-auto p-6 md:p-8 custom-scrollbar">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredMedia.map(item => (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -5 }}
                      onClick={() => selectMedia(item)}
                      className="group bg-white/5 border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:bg-white/10 transition-all"
                    >
                       <div className="relative aspect-video">
                          <img src={item.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <div className="w-12 h-12 rounded-full bg-os-primary flex items-center justify-center text-black">
                                <Play size={24} fill="currentColor" />
                             </div>
                          </div>
                          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-md text-[10px] font-bold">
                             {formatTime(item.duration)}
                          </div>
                       </div>
                       <div className="p-4">
                          <h4 className="font-bold truncate">{item.title}</h4>
                          <div className="flex items-center justify-between mt-1">
                             <span className="text-xs text-os-onSurfaceVariant font-medium">{item.artist}</span>
                             <span className="text-[10px] uppercase font-black tracking-widest text-os-primary/60">{item.category}</span>
                          </div>
                       </div>
                    </motion.div>
                  ))}
               </div>
               
               {filteredMedia.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-20">
                    <Search size={64} className="mb-4" />
                    <p className="text-xl font-black">No media found</p>
                 </div>
               )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="player"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col h-full bg-black relative group/player"
          >
            {/* Top Bar (Overlay) */}
            <AnimatePresence>
              {showControls && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-30"
                >
                  <button 
                    onClick={handleBackToLibrary}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/10 transition-all font-bold text-sm"
                  >
                    <ChevronLeft size={20} />
                    Library
                  </button>
                  <div className="flex items-center gap-4">
                    <button className="p-3 hover:bg-white/10 rounded-full transition-colors"><Info size={20} /></button>
                    <button className="p-3 hover:bg-white/10 rounded-full transition-colors"><Share2 size={20} /></button>
                    <button className="p-3 hover:bg-white/10 rounded-full transition-colors"><MoreVertical size={20} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Video Container */}
            <div className="flex-grow flex items-center justify-center relative cursor-none" onClick={togglePlay}>
              <video
                key={currentMedia?.id}
                ref={videoRef}
                src={currentMedia?.url}
                className="max-w-full max-h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                autoPlay={true}
                muted={isMuted}
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Central Play/Pause Overlay */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-8 rounded-full bg-os-primary/20 backdrop-blur-md border border-os-primary/30"
                  >
                    <Play size={64} className="text-white translate-x-1" />
                  </motion.div>
                </div>
              )}
            </div>

            {/* Bottom Controls (Overlay) */}
            <AnimatePresence>
              {showControls && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-30"
                >
                  {/* Progress Bar */}
                  <div className="flex flex-col gap-2 mb-6 group/progress">
                    <div className="flex justify-between text-[11px] font-mono text-white/60 px-1">
                       <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
                       <span>{formatTime(duration)}</span>
                    </div>
                    <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                       <input
                         type="range"
                         min="0"
                         max="100"
                         value={progress}
                         onChange={handleSeek}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                       />
                       <motion.div 
                         initial={false}
                         animate={{ width: `${progress}%` }}
                         className="absolute top-0 left-0 h-full bg-os-primary"
                       />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                       <button className="text-white/60 hover:text-white transition-colors" onClick={() => {
                         if (videoRef.current) videoRef.current.currentTime -= 10;
                       }}><SkipBack size={24} /></button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                         className="w-16 h-16 rounded-full bg-os-primary flex items-center justify-center text-black shadow-xl shadow-os-primary/20 hover:scale-105 active:scale-95 transition-all"
                       >
                         {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="translate-x-1" />}
                       </button>
                       <button className="text-white/60 hover:text-white transition-colors" onClick={() => {
                         if (videoRef.current) videoRef.current.currentTime += 10;
                       }}><SkipForward size={24} /></button>
                    </div>

                    <div className="flex items-center gap-10">
                       <div className="flex items-center gap-4 group/volume">
                          <button onClick={() => setIsMuted(!isMuted)}>
                             {isMuted || volume === 0 ? <Volume2 size={24} className="text-red-500" /> : <Volume2 size={24} className="text-white/60" />}
                          </button>
                          <div className="w-24 h-1 bg-white/20 rounded-full relative overflow-hidden hidden md:block">
                             <input
                               type="range"
                               min="0"
                               max="1"
                               step="0.01"
                               value={isMuted ? 0 : volume}
                               onChange={(e) => {
                                 setVolume(parseFloat(e.target.value));
                                 if (videoRef.current) videoRef.current.volume = e.target.value;
                                 setIsMuted(false);
                               }}
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                             />
                             <div className="absolute top-0 left-0 h-full bg-white/60" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
                          </div>
                       </div>
                       <button className="text-white/60 hover:text-white transition-colors"><Maximize2 size={24} /></button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sidebar Meta (Hidden in library view) */}
            <div className="absolute top-24 left-8 z-20 pointer-events-none max-w-sm">
               <motion.div
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: showControls ? 1 : 0, x: showControls ? 0 : -20 }}
                 className="bg-black/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl"
               >
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-os-primary mb-2 block">Playing Now</span>
                  <h3 className="text-2xl font-black tracking-tight mb-1">{currentMedia?.title}</h3>
                  <p className="text-os-onSurfaceVariant font-bold text-sm">{currentMedia?.artist}</p>
                  <div className="flex items-center gap-4 mt-6 pointer-events-auto">
                     <button className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-os-primary transition-colors"><Heart size={16} /> Save</button>
                     <button className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-os-primary transition-colors"><Download size={16} /> Download</button>
                  </div>
               </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MediaPlayer;
