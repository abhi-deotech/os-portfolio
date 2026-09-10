import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Music } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { getTopTracks } from '../../utils/musicApi';

/**
 * Last.fm "Your Top Tracks". Fetches on mount when the store has nothing yet — the view
 * only exists while activeView === 'History', so mount IS the old activeView trigger.
 */
const HistoryView = () => {
  const topTracks = useOSStore((s) => s.music.lastFmData?.topTracks);
  const setLastFmTopTracks = useOSStore((s) => s.setLastFmTopTracks);
  const [isLoading, setIsLoading] = useState(false);

  const hasData = (topTracks?.length ?? 0) > 0;

  useEffect(() => {
    if (hasData) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      const tracks = await getTopTracks(20);
      if (cancelled) return;
      setLastFmTopTracks(tracks);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hasData, setLastFmTopTracks]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="flex items-end gap-8 mb-12">
        {/* Same tokenized hero treatment as Liked Songs — this block used to be a stock
            purple→red gradient with a fill="black" glyph, both invisible to the theme. */}
        <div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl bg-gradient-to-br from-os-secondary to-os-primary flex items-center justify-center shadow-2xl border border-hairline/10">
          <Radio size={80} fill="currentColor" strokeWidth={0} className="text-sdl-onAccent/60" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-os-primary">Last.fm Connected</span>
          <h2 className="text-4xl md:text-7xl font-black tracking-tighter">Your Top Tracks</h2>
          <p className="text-os-onSurfaceVariant font-bold">Your most played tracks this week.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {isLoading ? (
          <div className="col-span-full py-10 text-center text-os-onSurfaceVariant">Loading from Last.fm...</div>
        ) : hasData ? (
          topTracks.map((track) => (
            <div key={track.id} className="bg-veil/5 p-4 rounded-2xl border border-hairline/5">
              <div className="relative aspect-square mb-4 rounded-xl overflow-hidden shadow-lg">
                {track.cover ? (
                  <img src={track.cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-veil/10 flex items-center justify-center">
                    <Music size={32} className="opacity-20" />
                  </div>
                )}
              </div>
              <h4 className="font-bold text-sm truncate">{track.title}</h4>
              <p className="text-xs text-os-onSurfaceVariant truncate">{track.artist}</p>
              <p className="text-[10px] text-os-primary mt-2">{track.playcount} plays</p>
            </div>
          ))
        ) : (
          <div className="col-span-full py-10 text-center text-os-onSurfaceVariant">
            No Last.fm data available. Make sure your API key is set in .env.
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default HistoryView;
