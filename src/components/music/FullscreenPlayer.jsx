import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Minimize2, Music } from 'lucide-react';
import useOSStore from '../../store/osStore';
import Visualizer from '../Visualizer';
import { formatTime } from './playback';

/**
 * Immersive view: big art, Last.fm artist bio and similar tracks, full transport.
 * The backdrop gradient runs toward `sdl-plane` (not literal black) so the wash stays
 * in register on light colorways instead of dropping a slab of foreign black.
 */
const FullscreenPlayer = ({ onClose, onPrev, onNext, onSeek, vizAccent }) => {
  const music = useOSStore((s) => s.music);
  const setMusicIsPlaying = useOSStore((s) => s.setMusicIsPlaying);
  const toggleShuffle = useOSStore((s) => s.toggleShuffle);
  const setRepeatMode = useOSStore((s) => s.setRepeatMode);
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);

  const { currentTrack, currentTime, isPlaying, shuffle, repeatMode, lastFmData } = music;
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
    <motion.div
      initial={{ opacity: 0, scale: 1.1, y: 100 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 100 }}
      className="fixed inset-0 z-[100] bg-sdl-plane/95 backdrop-blur-3xl p-8 md:p-16 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <Visualizer isPlaying={isPlaying} accentColor={vizAccent} />
        <div className="absolute inset-0 bg-gradient-to-t from-sdl-plane via-sdl-plane/40 to-transparent" />
      </div>

      <button
        onClick={onClose}
        aria-label="Close full screen player"
        className="absolute top-8 right-8 p-4 rounded-full bg-veil/5 border border-hairline/10 hover:bg-veil/10 transition-all z-20"
      >
        <Minimize2 size={24} />
      </button>

      <div className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row items-center gap-12 md:gap-20">
        <motion.div
          layoutId="track-cover"
          className="w-64 h-64 md:w-[500px] md:h-[500px] rounded-3xl shadow-lift-window border border-hairline/10 overflow-hidden relative group"
        >
          <img
            src={currentTrack.cover}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[10s] linear"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-os-primary/20 to-transparent pointer-events-none" />
        </motion.div>

        <div className="flex flex-col gap-8 flex-grow">
          <div className="space-y-2">
            <motion.h2
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-4xl md:text-8xl font-black tracking-tighter"
            >
              {currentTrack.title}
            </motion.h2>
            <motion.p
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl md:text-3xl text-os-primary font-bold"
            >
              {currentTrack.artist}
            </motion.p>
          </div>

          {/* Artist Bio & Similar */}
          <div className="h-48 md:h-64 overflow-y-auto custom-scrollbar relative pr-4">
            {lastFmData?.artistBio && (
              <div className="mb-6">
                <h5 className="text-xs font-black uppercase text-os-primary mb-2">About {currentTrack.artist}</h5>
                <p className="text-sm md:text-base text-sdl-ink/70 leading-relaxed font-medium">
                  {lastFmData.artistBio.substring(0, 500)}...
                </p>
              </div>
            )}

            {lastFmData?.similarTracks?.length > 0 && (
              <div>
                <h5 className="text-xs font-black uppercase text-os-secondary mb-3">Similar Tracks (Last.fm)</h5>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {lastFmData.similarTracks.map((t) => (
                    <div key={t.id} className="shrink-0 w-32">
                      {t.cover ? (
                        <img src={t.cover} alt="" className="w-32 h-32 rounded-xl mb-2 object-cover" />
                      ) : (
                        // Tokenized stand-in — the old fallback pointed at
                        // via.placeholder.com, a service that no longer resolves.
                        <div className="w-32 h-32 rounded-xl mb-2 bg-veil/10 border border-hairline/10 flex items-center justify-center">
                          <Music size={28} className="text-os-onSurfaceVariant opacity-60" />
                        </div>
                      )}
                      <p className="text-xs font-bold truncate">{t.title}</p>
                      <p className="text-[10px] text-sdl-ink/50 truncate">{t.artist}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 w-full">
              <span className="text-xs font-mono opacity-60">{formatTime(currentTime)}</span>
              <div className="flex-grow h-2 bg-veil/10 rounded-full relative overflow-hidden">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={onSeek}
                  aria-label="Seek"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="absolute top-0 left-0 h-full bg-os-primary" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-mono opacity-60">{formatTime(currentTrack.duration)}</span>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-10">
              <button onClick={toggleShuffle} aria-label="Toggle shuffle" className={shuffle ? 'text-os-primary' : 'opacity-40'}>
                <Shuffle size={28} />
              </button>
              <button onClick={onPrev} aria-label="Previous track" className="hover:scale-110 transition-transform">
                <SkipBack size={48} fill="currentColor" />
              </button>
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="w-20 h-20 rounded-full bg-sdl-accent text-sdl-onAccent flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-os-primary/20"
              >
                {isPlaying ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="translate-x-1" />}
              </button>
              <button onClick={onNext} aria-label="Next track" className="hover:scale-110 transition-transform">
                <SkipForward size={48} fill="currentColor" />
              </button>
              <button onClick={cycleRepeatMode} aria-label="Cycle repeat mode" className={repeatMode !== 'none' ? 'text-os-primary' : 'opacity-40'}>
                <Repeat size={28} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FullscreenPlayer;
