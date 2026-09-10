import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, Maximize2, ListMusic } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { formatTime } from './playback';

/**
 * The persistent transport strip. Volume here writes the SAME store field as the
 * ControlCenter slider (canonical 0–100) — the engine hook applies it; there is no
 * second local volume any more.
 */
const PlayerBar = ({ isMobile, onPrev, onNext, onSeek, onOpenFullscreen, onToggleUpNext, upNextOpen }) => {
  const music = useOSStore((s) => s.music);
  const setMusicIsPlaying = useOSStore((s) => s.setMusicIsPlaying);
  const setMusicVolume = useOSStore((s) => s.setMusicVolume);
  const toggleShuffle = useOSStore((s) => s.toggleShuffle);
  const setRepeatMode = useOSStore((s) => s.setRepeatMode);
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);

  const { currentTrack, currentTime, isPlaying, shuffle, repeatMode, volume, queue } = music;
  const progress = currentTrack.duration > 0 ? (currentTime / currentTrack.duration) * 100 : 0;

  const cycleRepeatMode = () => {
    const modes = ['none', 'all', 'one'];
    setRepeatMode(modes[(modes.indexOf(repeatMode) + 1) % modes.length]);
  };

  const togglePlay = () => {
    const next = !isPlaying;
    setMusicIsPlaying(next);
    if (next) unlockAchievement('audiophile');
  };

  return (
    <div className="h-24 bg-sdl-surface/80 backdrop-blur-3xl border-t border-hairline/5 px-4 md:px-8 flex items-center justify-between z-20">
      <div className={`flex items-center gap-3 md:gap-4 ${isMobile ? 'w-1/2' : 'w-1/3'}`}>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden border border-hairline/10 shrink-0 cursor-pointer"
          onClick={onOpenFullscreen}
        >
          <img src={currentTrack.cover} alt="Cover" className="w-full h-full object-cover" />
        </motion.div>
        <div className="overflow-hidden">
          <h4 className="text-xs md:text-sm font-bold truncate cursor-pointer hover:underline" onClick={onOpenFullscreen}>
            {currentTrack.title}
          </h4>
          <p className="text-[10px] text-os-onSurfaceVariant font-bold uppercase tracking-wider truncate">
            {currentTrack.artist}
          </p>
        </div>
        {isMobile && (
          <button
            onClick={onToggleUpNext}
            aria-label="Toggle Up Next"
            className={`relative ml-auto shrink-0 transition-colors ${upNextOpen ? 'text-os-primary' : 'text-os-onSurfaceVariant'}`}
          >
            <ListMusic size={18} />
            {queue.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black bg-os-primary text-sdl-onAccent rounded-full min-w-3 h-3 px-0.5 flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>
        )}
      </div>

      <div className={`flex flex-col items-center gap-2 ${isMobile ? 'w-1/2' : 'w-1/3'}`}>
        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={toggleShuffle}
            aria-label="Toggle shuffle"
            className={`transition-colors ${shuffle ? 'text-os-primary' : 'text-os-onSurfaceVariant hover:text-sdl-ink'}`}
          >
            <Shuffle size={18} />
          </button>
          <button className="text-os-onSurfaceVariant hover:text-sdl-ink transition-colors" onClick={onPrev} aria-label="Previous track">
            <SkipBack size={22} fill="currentColor" />
          </button>
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-10 h-10 rounded-full bg-sdl-accent text-sdl-onAccent flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="translate-x-0.5" />}
          </button>
          <button className="text-os-onSurfaceVariant hover:text-sdl-ink transition-colors" onClick={onNext} aria-label="Next track">
            <SkipForward size={22} fill="currentColor" />
          </button>
          <button
            onClick={cycleRepeatMode}
            aria-label="Cycle repeat mode"
            className={`relative transition-colors ${repeatMode !== 'none' ? 'text-os-primary' : 'text-os-onSurfaceVariant hover:text-sdl-ink'}`}
          >
            <Repeat size={18} />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 text-[8px] font-black bg-os-primary text-sdl-onAccent rounded-full w-3 h-3 flex items-center justify-center">
                1
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-3 w-full max-w-[200px] md:max-w-md group">
          <span className="text-[10px] font-mono text-os-onSurfaceVariant w-8">{formatTime(currentTime)}</span>
          <div className="flex-grow h-1.5 bg-veil/10 rounded-full relative group/seek overflow-hidden">
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={onSeek}
              aria-label="Seek"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              style={{ width: `${progress}%` }}
              className="absolute top-0 left-0 h-full bg-os-primary group-hover/seek:bg-os-secondary transition-colors"
            />
          </div>
          <span className="text-[10px] font-mono text-os-onSurfaceVariant w-8 text-right">
            {formatTime(currentTrack.duration)}
          </span>
        </div>
      </div>

      {!isMobile && (
        <div className="flex items-center justify-end gap-5 w-1/3">
          <button
            onClick={onToggleUpNext}
            aria-label="Toggle Up Next"
            className={`relative transition-colors ${upNextOpen ? 'text-os-primary' : 'text-os-onSurfaceVariant hover:text-os-primary'}`}
          >
            <ListMusic size={18} />
            {queue.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black bg-os-primary text-sdl-onAccent rounded-full min-w-3 h-3 px-0.5 flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>
          <button onClick={onOpenFullscreen} aria-label="Full screen player" className="text-os-onSurfaceVariant hover:text-os-primary transition-colors">
            <Maximize2 size={18} />
          </button>
          <div className="flex items-center gap-3">
            <Volume2 size={18} className="text-os-onSurfaceVariant" />
            <div className="w-24 h-1 bg-veil/10 rounded-full relative overflow-hidden group/vol">
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setMusicVolume(parseInt(e.target.value, 10))}
                aria-label="Volume"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className="absolute top-0 left-0 h-full bg-veil/60 group-hover/vol:bg-os-primary transition-colors"
                style={{ width: `${volume}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerBar;
