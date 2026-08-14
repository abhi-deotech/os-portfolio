import React, { useEffect } from 'react';
import { Radio } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { getNowPlaying } from '../../utils/musicApi';

const NowPlayingWidget = () => {
  const { music, setLastFmNowPlaying } = useOSStore();
  const nowPlaying = music.lastFmData?.nowPlaying;

  useEffect(() => {
    const fetchLastFmData = async () => {
      const data = await getNowPlaying();
      if (data) {
        setLastFmNowPlaying(data);
      }
    };

    fetchLastFmData();
    // Poll every 30 seconds
    const interval = setInterval(fetchLastFmData, 30000);
    return () => clearInterval(interval);
  }, [setLastFmNowPlaying]);

  if (!nowPlaying) {
    return (
      // surface rather than veil: the widget floats on the WALLPAPER, so there is no panel beneath
      // it to tint, and a veil deepens toward ink in light mode — which would darken the card out
      // from under its own `sdl-ink` text. `surface` inverts with the mode, so both stay legible.
      <div className="w-full h-full min-h-[120px] rounded-3xl bg-sdl-surface/40 backdrop-blur-3xl border border-hairline/10 p-5 flex flex-col justify-center items-center shadow-lift overflow-hidden">
        <Radio className="text-sdl-sec mb-2" size={24} />
        <span className="text-xs font-bold text-sdl-sec">Loading Last.fm...</span>
      </div>
    );
  }

  const isPlaying = nowPlaying.isNowPlaying;

  return (
    <div className="w-full h-full min-h-[120px] rounded-3xl bg-sdl-surface/60 backdrop-blur-3xl border border-hairline/10 p-4 flex items-center shadow-lift overflow-hidden relative group">
      {/* Background Glow */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-1000"
        style={{
          // Was `var(--os-${activeAccent}-rgb)` — interpolating an accent NAME into a variable
          // name that has never been declared (`--os-purple-rgb` does not exist), so the whole
          // gradient resolved to nothing and this glow had simply never rendered.
          background: 'radial-gradient(circle at 50% 50%, rgb(var(--sdl-accent-rgb)), transparent 70%)'
        }}
      />

      <div className="flex gap-4 items-center w-full relative z-10">
        <div className="relative w-16 h-16 shrink-0 rounded-2xl overflow-hidden border border-hairline/10 shadow-lg">
          {nowPlaying.cover ? (
            <img 
              src={nowPlaying.cover} 
              alt={nowPlaying.title} 
              className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`} 
              style={{ borderRadius: isPlaying ? '50%' : '16px', transition: 'border-radius 0.3s' }}
            />
          ) : (
            <div className="w-full h-full bg-veil/5 flex items-center justify-center">
              <Radio className="text-sdl-sec" size={20} />
            </div>
          )}
          {/* Inner cutout for vinyl record look if playing. Reads as a hole punched through the
              art to the card beneath, so it takes the card's own surface — a fixed black dot would
              be a dark speck floating on a pale card under the ten light colorways. */}
          {isPlaying && nowPlaying.cover && (
            <div className="absolute inset-0 m-auto w-4 h-4 bg-sdl-surface/80 rounded-full border border-hairline/10" />
          )}
        </div>

        <div className="flex flex-col flex-grow overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-os-primary flex items-center gap-1.5">
              {isPlaying ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-os-primary animate-pulse" /> 
                  Live
                </>
              ) : 'Last Played'}
            </span>
            <img src="https://www.last.fm/static/images/lastfm_avatar_twitter.66cd2c48ce03.png" alt="Last.fm" className="h-3 w-3 rounded-sm opacity-50" />
          </div>
          <h4 className="text-sm font-bold truncate text-sdl-ink">{nowPlaying.title}</h4>
          <p className="text-[10px] text-os-onSurfaceVariant font-bold uppercase truncate">{nowPlaying.artist}</p>
        </div>
      </div>
    </div>
  );
};

export default NowPlayingWidget;
