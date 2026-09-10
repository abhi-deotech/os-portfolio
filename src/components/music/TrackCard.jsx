import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import TrackMenu from './TrackMenu';

/**
 * Grid card shared by the Home rails and Explore's browse/search grids — the three
 * near-identical inline blocks the old MusicApp carried, folded into one. Plays on
 * mousedown (the app-wide row convention); the overflow menu swallows its own events.
 */
const TrackCard = ({ track, onPlay }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="group relative bg-veil/5 border border-hairline/5 rounded-2xl p-3 md:p-4 cursor-pointer hover:bg-veil/10 transition-all"
    onMouseDown={() => onPlay(track)}
  >
    <div className="relative aspect-square mb-3 rounded-xl overflow-hidden border border-hairline/10 shadow-lg">
      <img
        src={track.cover}
        alt=""
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-scrim opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
        <div className="w-11 h-11 rounded-full bg-os-primary flex items-center justify-center text-sdl-onAccent">
          <Play size={22} fill="currentColor" />
        </div>
      </div>
    </div>
    <div className="flex items-start justify-between gap-1">
      <div className="min-w-0">
        <h4 className="font-bold text-sm truncate">{track.title}</h4>
        <p className="text-xs text-os-onSurfaceVariant truncate">{track.artist}</p>
      </div>
      <TrackMenu track={track} />
    </div>
  </motion.div>
);

export default TrackCard;
