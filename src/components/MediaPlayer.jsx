import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize, Minimize } from 'lucide-react';
import { motion } from 'framer-motion';

const MediaPlayer = ({ file }) => {
  if (!file) return <div className="p-8 text-os-onSurfaceVariant">No media file selected or found in system.</div>;

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    setProgress((current / total) * 100);
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * duration;
    videoRef.current.currentTime = seekTime;
    setProgress(e.target.value);
  };

  const isAudio = file.type === 'audio';

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-xl overflow-hidden rounded-b-2xl">
      <div className="flex-grow flex items-center justify-center relative group">
        {isAudio ? (
          <div className="flex flex-col items-center gap-6">
            <motion.div 
              animate={isPlaying ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-48 h-48 rounded-full bg-gradient-to-br from-os-primary to-os-secondary p-1 shadow-2xl"
            >
              <div className="w-full h-full rounded-full bg-os-surfaceContainerLow flex items-center justify-center">
                <Volume2 size={64} className="text-os-primary" />
              </div>
            </motion.div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-1">{file.name}</h3>
              <p className="text-os-onSurfaceVariant text-sm">Lumina Audio Player</p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={file.url}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={togglePlay}
          />
        )}

        {/* Overlay Controls (for video) */}
        {!isAudio && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="p-6 rounded-full bg-os-primary/20 backdrop-blur-md border border-os-primary/30">
              <Play size={48} className="text-white translate-x-1" />
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-24 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col gap-2">
        <div className="flex items-center gap-4 group/progress">
          <span className="text-[10px] font-mono text-white/60 w-10">{formatTime(videoRef.current?.currentTime || 0)}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            className="flex-grow h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-os-primary hover:h-2 transition-all"
          />
          <span className="text-[10px] font-mono text-white/60 w-10 text-right">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button className="text-white/70 hover:text-white transition-colors">
              <SkipBack size={20} />
            </button>
            <button 
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-os-primary flex items-center justify-center text-white shadow-lg shadow-os-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="translate-x-0.5" />}
            </button>
            <button className="text-white/70 hover:text-white transition-colors">
              <SkipForward size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 group/volume">
              <Volume2 size={18} className="text-white/60" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => {
                  setVolume(e.target.value);
                  videoRef.current.volume = e.target.value;
                }}
                className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>
            {!isAudio && (
              <button onClick={() => videoRef.current.requestFullscreen()} className="text-white/60 hover:text-white transition-colors">
                <Maximize size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Actual Hidden Audio Element if needed, but video tag handles audio URLs too */}
      {isAudio && <audio ref={videoRef} src={file.url} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} />}
    </div>
  );
};

export default MediaPlayer;
