import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Radio, Heart } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { MUSIC_DATA } from '../../data/musicData';
import TrackCard from './TrackCard';

/** Landing view: recommended hero plus the Trending / New Releases rails. */
const HomeView = () => {
  const likedSongs = useOSStore((s) => s.music.likedSongs);
  const setMusicTrack = useOSStore((s) => s.setMusicTrack);
  const toggleLikeSong = useOSStore((s) => s.toggleLikeSong);

  const hero = MUSIC_DATA[0];
  const heroLiked = likedSongs?.includes(hero.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-10"
    >
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-os-primary/20 to-os-secondary/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all opacity-50" />
        <div className="relative p-8 md:p-12 rounded-3xl border border-hairline/5 bg-veil/[0.04] backdrop-blur-xl overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-os-primary/10 blur-[100px]" />
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
            <motion.img
              whileHover={{ scale: 1.05 }}
              src={hero.cover}
              alt=""
              className="w-48 h-48 md:w-64 md:h-64 rounded-2xl shadow-2xl border border-hairline/10"
            />
            <div className="text-center md:text-left">
              <span className="text-xs font-black uppercase tracking-[0.3em] text-os-primary mb-4 block">
                Recommended for you
              </span>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">{hero.title}</h2>
              <p className="text-os-onSurfaceVariant font-bold text-lg mb-8">{hero.artist}</p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <button
                  onClick={() => setMusicTrack(hero)}
                  className="px-8 py-3 rounded-full bg-os-primary text-sdl-onAccent font-black hover:scale-105 active:scale-95 transition-all"
                >
                  Play Now
                </button>
                <button
                  onClick={() => toggleLikeSong(hero.id)}
                  className="px-8 py-3 rounded-full bg-veil/5 border border-hairline/10 font-bold hover:bg-veil/10 transition-all flex items-center gap-2"
                >
                  <Heart
                    size={18}
                    fill={heroLiked ? 'currentColor' : 'none'}
                    className={heroLiked ? 'text-os-primary' : ''}
                  />
                  {heroLiked ? 'Saved' : 'Save to Library'}
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
          {MUSIC_DATA.slice(1, 11).map((track) => (
            <TrackCard key={track.id} track={track} onPlay={setMusicTrack} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
          <Radio className="text-os-secondary" /> New Releases
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {MUSIC_DATA.slice(11, 21).map((track) => (
            <TrackCard key={track.id} track={track} onPlay={setMusicTrack} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default HomeView;
