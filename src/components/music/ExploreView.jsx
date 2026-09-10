import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Music, TrendingUp, Heart, Radio, X } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { MUSIC_DATA, CATEGORIES } from '../../data/musicData';
import { useColorway } from '../../theme/useColorway';
import { iconStyle } from '../../theme/icons';
import TrackCard from './TrackCard';

// Glyphs are presentation, so they live here rather than in the data module.
const CATEGORY_ICONS = { trap: TrendingUp, rb: Heart, indie: Radio, electronic: Music };

/**
 * Browse view. Category cards come from the CATEGORIES export (the single source —
 * MusicApp used to re-declare them inline with stock gradients) and now actually
 * filter: a card narrows the grid to its `genres`, composable with the search box.
 * Identity is each category's OKLCH hue rendered through iconStyle at the active
 * colorway's chroma — the same contract as app icons — instead of a fixed gradient.
 */
const ExploreView = ({ searchQuery, onSearchChange }) => {
  const setMusicTrack = useOSStore((s) => s.setMusicTrack);
  const cw = useColorway();
  const [activeCategory, setActiveCategory] = useState(null);

  const category = CATEGORIES.find((c) => c.id === activeCategory) || null;

  const tracks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return MUSIC_DATA.filter(
      (t) =>
        (!category || category.genres.includes(t.genre)) &&
        (t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    );
  }, [category, searchQuery]);

  const heading = category
    ? category.name
    : searchQuery
      ? `Search results for "${searchQuery}"`
      : 'Browse All Tracks';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="space-y-10"
    >
      <div className="relative h-48 md:h-64 rounded-3xl overflow-hidden border border-hairline/10 group">
        <div className="absolute inset-0 bg-gradient-to-br from-os-primary/25 via-os-secondary/15 to-os-primary/25 group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-scrim backdrop-blur-sm">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">Discover Infinite Beats</h2>
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-sdl-sec" size={20} />
            <input
              type="text"
              placeholder="Search for tracks, artists, or genres..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-veil/10 border border-hairline/20 rounded-2xl pl-12 pr-4 py-4 text-lg font-bold focus:outline-none focus:bg-veil/20 focus:border-os-primary/50 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {CATEGORIES.map((cat) => {
          const face = iconStyle('harmonized', cw, { hue: cat.hue });
          const Glyph = CATEGORY_ICONS[cat.id] || Music;
          const active = activeCategory === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileHover={{ y: -8 }}
              aria-pressed={active}
              onClick={() => setActiveCategory(active ? null : cat.id)}
              className={`relative h-40 rounded-2xl overflow-hidden group text-left bg-sdl-surface border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${active ? 'border-sdl-accent' : 'border-hairline/10 hover:border-os-primary/40'}`}
            >
              {/* Soft hue wash in place of the old stock from-X-to-Y gradient (law 9). */}
              <div
                className="absolute -right-8 -top-8 w-36 h-36 blur-2xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity"
                style={{ backgroundColor: face.tile }}
              />
              <div className="absolute inset-0 flex flex-col p-6 justify-between">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center border"
                  style={{ backgroundColor: face.tile, borderColor: face.tileBorder }}
                >
                  <Glyph size={22} style={{ color: face.glyph }} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-sdl-ink">{cat.name}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-os-onSurfaceVariant mt-1">
                    {active ? 'Filtering — tap to clear' : cat.genres.join(' · ')}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
          {category ? <Music className="text-os-primary" /> : <Search className="text-os-primary" />}
          {heading}
          {category && (
            <button
              onClick={() => setActiveCategory(null)}
              aria-label="Clear category filter"
              className="p-1.5 rounded-full bg-veil/5 border border-hairline/10 text-os-onSurfaceVariant hover:text-sdl-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
            >
              <X size={14} />
            </button>
          )}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} onPlay={setMusicTrack} />
          ))}
          {tracks.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <Music size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-os-onSurfaceVariant font-bold">No results found for your search.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ExploreView;
