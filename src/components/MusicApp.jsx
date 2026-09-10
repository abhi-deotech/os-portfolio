import React, { useEffect, useRef, useState, useMemo } from 'react';
import { List, Music, ChevronLeft, Search, Radio, Library, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import Visualizer from './Visualizer';
import { MUSIC_DATA } from '../data/musicData';
import { useColorway } from '../theme/useColorway';
import { getArtistBio, getSimilarTracks } from '../utils/musicApi';
import useYouTubePlayer from './music/useYouTubePlayer';
import { resolveNextTrack, resolvePrevTrack, trackById, upcomingFromContext } from './music/playback';
import HomeView from './music/HomeView';
import ExploreView from './music/ExploreView';
import LibraryView from './music/LibraryView';
import HistoryView from './music/HistoryView';
import PlayerBar from './music/PlayerBar';
import FullscreenPlayer from './music/FullscreenPlayer';
import UpNextPanel from './music/UpNextPanel';

/**
 * Composing entry for the Music app. The moving parts live in src/components/music/:
 * the YouTube engine in useYouTubePlayer, playback-order rules in playback.js (pure,
 * harness-tested), and one file per view. This component owns what genuinely spans
 * them — the playback context, the shuffle bag, and the next/prev handlers.
 */
const MusicApp = () => {
  // Selectors, not `useOSStore()`. A whole-store subscription re-renders this component on
  // every state change anywhere in the OS, not just the fields it reads.
  const music = useOSStore((s) => s.music);
  const setMusicIsPlaying = useOSStore((s) => s.setMusicIsPlaying);
  const setMusicTrack = useOSStore((s) => s.setMusicTrack);
  const setMusicCurrentTime = useOSStore((s) => s.setMusicCurrentTime);
  const setMusicView = useOSStore((s) => s.setMusicView);
  const dequeue = useOSStore((s) => s.dequeue);
  const setLastFmArtistBio = useOSStore((s) => s.setLastFmArtistBio);
  const setLastFmSimilarTracks = useOSStore((s) => s.setLastFmSimilarTracks);

  // Canvas, so it cannot read a CSS variable — a sanctioned useColorway consumer. The old ternary
  // chain tested `activeAccent === 'blue'`, a value the accent preset never took, so the visualizer
  // only ever rendered one of two hardcoded colours regardless of the theme.
  //
  // The raw accent, not accentAtLightness(). That helper pins lightness for surfaces that do NOT
  // follow the mode — and this app's plane used to be a hardcoded near-black, which is exactly why
  // it was needed here. Now that the plane is `bg-sdl-plane`, SDL already guarantees the accent
  // reads against it in both modes, and pinning would fight the theme instead of serving it.
  const vizAccent = useColorway().roles.accent;

  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [upNextOpen, setUpNextOpen] = useState(false);
  // The shuffle bag ({ sig, ids }) — the not-yet-played remainder of a shuffled
  // permutation of the context. Session state, deliberately not persisted: a reload
  // starting a fresh cycle costs nothing, and the resolver rebuilds on demand.
  const [shuffleBag, setShuffleBag] = useState({ sig: '', ids: [] });

  // What the active view is showing. Doubles as the default playback context below —
  // clicking a track in a view means "play from what I'm looking at".
  const displayPlaylist = useMemo(() => {
    let list = MUSIC_DATA;
    if (music.activeView === 'Library') {
      list = MUSIC_DATA.filter((t) => music.likedSongs?.includes(t.id));
    } else if (music.activeView === 'Explore') {
      list = MUSIC_DATA;
    }
    return list.filter(
      (track) =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [music.activeView, music.likedSongs, searchQuery]);

  // Sync sidebar with mobile state during render
  const [prevIsMobile, setPrevIsMobile] = useState(isMobile);
  if (isMobile !== prevIsMobile) {
    setPrevIsMobile(isMobile);
    setShowSidebar(!isMobile);
  }

  // The context Next/Prev resolve inside: pinned by an explicit Play All
  // (music.playContext), else whatever list the active view shows.
  const contextIds = useMemo(() => {
    if (music.playContext?.ids?.length) return music.playContext.ids;
    const list = displayPlaylist.length > 0 ? displayPlaylist : MUSIC_DATA;
    return list.map((t) => t.id);
  }, [music.playContext, displayPlaylist]);

  // handleNext is defined before the engine hook (it is the hook's onEnded), so the
  // one engine call it needs — repeat-one's restart — goes through a ref filled in
  // after the hook runs.
  const restartRef = useRef(() => {});

  const handleNext = () => {
    const res = resolveNextTrack({
      repeatMode: music.repeatMode,
      shuffle: music.shuffle,
      queue: music.queue,
      bag: shuffleBag,
      contextIds,
      currentId: music.currentTrack.id,
    });
    if (res.restart) {
      restartRef.current();
      return;
    }
    if (res.queue !== music.queue) dequeue(0);
    if (res.bag !== shuffleBag) setShuffleBag(res.bag);
    const next = res.trackId ? trackById(res.trackId) : null;
    if (next) {
      setMusicTrack(next, music.playContext);
    } else {
      // Finite context ran out with repeat off. The old code just returned, leaving
      // isPlaying true — a pause button lying about an engine that had ENDED.
      setMusicIsPlaying(false);
    }
  };

  const { containerRef, seekTo, restart } = useYouTubePlayer({ onEnded: handleNext });
  useEffect(() => {
    restartRef.current = restart;
  });

  const handlePrev = () => {
    // More than 5s in, Prev restarts the track instead of leaving it.
    if (music.currentTime > 5) {
      seekTo(0);
      return;
    }
    const prevId = resolvePrevTrack({ contextIds, currentId: music.currentTrack.id });
    const prev = prevId ? trackById(prevId) : null;
    if (prev) setMusicTrack(prev, music.playContext);
  };

  const handleSeek = (e) => {
    const target = (parseFloat(e.target.value) / 100) * music.currentTrack.duration;
    seekTo(target);
    setMusicCurrentTime(target);
  };

  // Last.fm enrichment for the fullscreen view. Keyed on the identity fields it
  // actually uses — depending on the track OBJECT would refetch on every duration
  // reconciliation, since syncMusicTrack builds a new object.
  const { artist: currentArtist, title: currentTitle } = music.currentTrack;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const primaryArtist = currentArtist.split(',')[0];
      const bio = await getArtistBio(primaryArtist);
      if (!cancelled && bio) setLastFmArtistBio(bio);
      const similar = await getSimilarTracks(primaryArtist, currentTitle);
      if (!cancelled && similar) setLastFmSimilarTracks(similar);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentArtist, currentTitle, setLastFmArtistBio, setLastFmSimilarTracks]);

  const upcoming = useMemo(
    () =>
      upcomingFromContext({
        contextIds,
        currentId: music.currentTrack.id,
        repeatMode: music.repeatMode,
      })
        .map(trackById)
        .filter(Boolean),
    [contextIds, music.currentTrack.id, music.repeatMode]
  );

  const contextLabel =
    music.playContext?.name ||
    (music.activeView === 'Library'
      ? 'Liked Songs'
      : searchQuery
        ? `results for "${searchQuery}"`
        : 'All Tracks');

  return (
    <div className="flex h-full bg-sdl-plane text-sdl-ink overflow-hidden rounded-b-2xl relative">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-os-primary/5 to-transparent pointer-events-none" />
      {/* Sidebar */}
      {(showSidebar || !isMobile) && (
        <motion.div
          initial={isMobile ? { x: -300 } : false}
          animate={{ x: 0 }}
          className={`${isMobile ? 'absolute inset-y-0 left-0 z-50 w-64' : 'w-64'} bg-veil/[0.06] md:bg-veil/[0.03] border-r border-hairline/5 p-6 flex flex-col gap-8 h-full`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-os-primary">
              <Music size={24} />
              <span className="font-black tracking-tighter text-xl">Lumina Music</span>
            </div>
            {isMobile && (
              <button onClick={() => setShowSidebar(false)} className="p-2 hover:bg-veil/5 rounded-xl">
                <ChevronLeft size={20} />
              </button>
            )}
          </div>

          <nav className="flex flex-col gap-2">
            {[
              { id: 'Home', icon: Home },
              { id: 'Explore', icon: Search },
              { id: 'Library', icon: Library },
              { id: 'History', icon: Radio },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setMusicView(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left font-bold text-sm ${music.activeView === item.id ? 'bg-os-primary/10 text-os-primary shadow-sm' : 'hover:bg-veil/5 text-os-onSurfaceVariant hover:text-sdl-ink'}`}
              >
                <item.icon size={18} />
                {item.id}
              </button>
            ))}
          </nav>

          <div className="mt-auto">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-os-primary/20 to-os-secondary/20 border border-hairline/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-os-primary mb-1">Now Playing</p>
              <p className="text-xs font-bold truncate">{music.currentTrack.title}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex-grow flex flex-col relative overflow-hidden bg-veil/[0.02]">
        <div className="absolute inset-0 z-0 opacity-40">
          <Visualizer isPlaying={music.isPlaying} accentColor={vizAccent} />
        </div>
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-os-primary/10 to-transparent pointer-events-none" />

        <div className="flex-grow overflow-y-auto p-4 md:p-8 z-10 custom-scrollbar relative">
          {isMobile && (
            <button
              onClick={() => setShowSidebar(true)}
              className="absolute top-4 left-4 p-2 bg-veil/[0.06] rounded-xl border border-hairline/10 z-20"
            >
              <List size={20} />
            </button>
          )}

          <AnimatePresence mode="wait">
            {music.activeView === 'Home' && <HomeView key="home" />}
            {music.activeView === 'Explore' && (
              <ExploreView key="explore" searchQuery={searchQuery} onSearchChange={setSearchQuery} />
            )}
            {music.activeView === 'Library' && (
              <LibraryView key="library" tracks={displayPlaylist} isMobile={isMobile} />
            )}
            {music.activeView === 'History' && <HistoryView key="history" />}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {upNextOpen && (
            <UpNextPanel
              onClose={() => setUpNextOpen(false)}
              upcoming={upcoming}
              shuffle={music.shuffle}
              contextLabel={contextLabel}
            />
          )}
        </AnimatePresence>

        <PlayerBar
          isMobile={isMobile}
          onPrev={handlePrev}
          onNext={handleNext}
          onSeek={handleSeek}
          onOpenFullscreen={() => setIsFullScreen(true)}
          onToggleUpNext={() => setUpNextOpen((o) => !o)}
          upNextOpen={upNextOpen}
        />
      </div>

      {/* Full Screen Mode */}
      <AnimatePresence>
        {isFullScreen && (
          <FullscreenPlayer
            onClose={() => setIsFullScreen(false)}
            onPrev={handlePrev}
            onNext={handleNext}
            onSeek={handleSeek}
            vizAccent={vizAccent}
          />
        )}
      </AnimatePresence>

      {/* The engine's hidden iframe mounts here. */}
      <div ref={containerRef} className="absolute -z-50 pointer-events-none opacity-0"></div>
    </div>
  );
};

export default MusicApp;
