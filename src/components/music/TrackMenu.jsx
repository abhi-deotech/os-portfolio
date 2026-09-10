import React, { useState } from 'react';
import { MoreHorizontal, ListStart, ListEnd, Heart, Plus, ListMusic } from 'lucide-react';
import useOSStore from '../../store/osStore';

const MenuItem = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-bold text-sdl-ink hover:bg-veil/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
  >
    <Icon size={14} className="text-os-onSurfaceVariant shrink-0" />
    <span className="truncate">{label}</span>
  </button>
);

/**
 * Per-track overflow menu: Play next / Add to queue / Like / Add to playlist.
 *
 * Self-contained — own open state plus a fixed click-catcher — so any row or card can
 * drop it in without the parent tracking which menu is open. The root swallows
 * mousedown because every track row/card starts playback on mousedown; without the
 * stop, opening a menu would also switch the song.
 */
const TrackMenu = ({ track, align = 'right' }) => {
  const [open, setOpen] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const queueNext = useOSStore((s) => s.queueNext);
  const queueLast = useOSStore((s) => s.queueLast);
  const toggleLikeSong = useOSStore((s) => s.toggleLikeSong);
  const likedSongs = useOSStore((s) => s.music.likedSongs);
  const playlists = useOSStore((s) => s.music.playlists);
  const addToPlaylist = useOSStore((s) => s.addToPlaylist);
  const createPlaylist = useOSStore((s) => s.createPlaylist);
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);

  const liked = likedSongs?.includes(track.id);
  const close = () => {
    setOpen(false);
    setShowPlaylists(false);
  };
  const act = (fn) => (e) => {
    e.stopPropagation();
    fn();
    close();
  };

  return (
    <div className="relative shrink-0" onMouseDown={(e) => e.stopPropagation()}>
      <button
        aria-label={`More options for ${track.title}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
          setShowPlaylists(false);
        }}
        className={`p-1.5 rounded-lg text-os-onSurfaceVariant hover:text-sdl-ink hover:bg-veil/10 transition-colors focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${open ? 'opacity-100 text-sdl-ink' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[80]" aria-hidden="true" onClick={(e) => { e.stopPropagation(); close(); }} />
          <div
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 w-52 rounded-xl bg-sdl-surface border border-hairline/10 shadow-lift p-1.5 z-[90]`}
          >
            <MenuItem icon={ListStart} label="Play next" onClick={act(() => queueNext(track.id))} />
            <MenuItem icon={ListEnd} label="Add to queue" onClick={act(() => queueLast(track.id))} />
            <MenuItem
              icon={Heart}
              label={liked ? 'Remove from Liked' : 'Like'}
              onClick={act(() => toggleLikeSong(track.id))}
            />
            <div className="my-1 border-t border-hairline/10" />
            {!showPlaylists ? (
              <MenuItem
                icon={ListMusic}
                label="Add to playlist…"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlaylists(true);
                }}
              />
            ) : (
              <div className="max-h-44 overflow-y-auto custom-scrollbar">
                {playlists.map((p) => (
                  <MenuItem key={p.id} icon={ListMusic} label={p.name} onClick={act(() => addToPlaylist(p.id, track.id))} />
                ))}
                <MenuItem
                  icon={Plus}
                  label="New playlist"
                  onClick={act(() => {
                    // Event handler, not a state updater — the StrictMode-safe home for
                    // the unlock (tasks/lessons.md). Idempotent past the first creation.
                    const id = createPlaylist(`Playlist ${playlists.length + 1}`);
                    unlockAchievement('curator');
                    addToPlaylist(id, track.id);
                  })}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TrackMenu;
