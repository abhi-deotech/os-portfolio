import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ListMusic, Plus, ChevronLeft, MoreHorizontal, Pencil, Trash2, X, Check } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { trackById, formatTime } from './playback';
import TrackMenu from './TrackMenu';

/** Shared row table for Liked Songs and playlist detail. `onRemove` adds the × column. */
const TrackTable = ({ tracks, isMobile, currentTrackId, onPlay, onRemove }) => (
  <div className="space-y-1">
    <div
      className={`grid ${isMobile ? 'grid-cols-[30px_1fr_60px_32px]' : 'grid-cols-[30px_1fr_1fr_80px_32px]'} px-4 py-2 text-[10px] font-black uppercase tracking-widest text-os-onSurfaceVariant border-b border-hairline/5 mb-2`}
    >
      <span>#</span>
      <span>Title</span>
      {!isMobile && <span>Album</span>}
      <span className="text-right">Time</span>
      <span />
    </div>
    {tracks.map((track, i) => (
      <div
        key={track.id}
        onMouseDown={() => onPlay(track)}
        className={`grid ${isMobile ? 'grid-cols-[30px_1fr_60px_32px]' : 'grid-cols-[30px_1fr_1fr_80px_32px]'} px-4 py-3 rounded-xl cursor-pointer transition-all group ${currentTrackId === track.id ? 'bg-os-primary/10' : 'hover:bg-veil/5'}`}
      >
        <span className="text-xs flex items-center text-os-onSurfaceVariant">{i + 1}</span>
        <div className="flex flex-col min-w-0">
          <span className={`text-sm font-bold truncate ${currentTrackId === track.id ? 'text-os-primary' : 'text-sdl-ink'}`}>
            {track.title}
          </span>
          <span className="text-[10px] text-os-onSurfaceVariant font-bold truncate">{track.artist}</span>
        </div>
        {!isMobile && (
          <span className="text-xs text-os-onSurfaceVariant font-medium flex items-center truncate">{track.album}</span>
        )}
        <span className="text-xs text-os-onSurfaceVariant font-mono flex items-center justify-end">
          {formatTime(track.duration)}
        </span>
        <span className="flex items-center justify-end">
          {onRemove ? (
            <button
              aria-label={`Remove ${track.title}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(track.id);
              }}
              className="p-1 rounded-lg text-os-onSurfaceVariant hover:text-sdl-alert opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
            >
              <X size={14} />
            </button>
          ) : (
            <TrackMenu track={track} />
          )}
        </span>
      </div>
    ))}
  </div>
);

/**
 * Library: Liked Songs plus user playlists (create / rename / delete / open / Play All).
 * Play All pins the playback context ({ name, ids }) so Next/Prev stay inside the
 * collection while the user browses elsewhere — see playback.js for how the resolver
 * uses it. The 'curator' unlock fires from the create handlers here and in TrackMenu:
 * event handlers, never state updaters (tasks/lessons.md, StrictMode).
 */
const LibraryView = ({ tracks, isMobile }) => {
  const music = useOSStore((s) => s.music);
  const setMusicTrack = useOSStore((s) => s.setMusicTrack);
  const createPlaylist = useOSStore((s) => s.createPlaylist);
  const renamePlaylist = useOSStore((s) => s.renamePlaylist);
  const deletePlaylist = useOSStore((s) => s.deletePlaylist);
  const removeFromPlaylist = useOSStore((s) => s.removeFromPlaylist);
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);

  const [openPlaylistId, setOpenPlaylistId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [menuFor, setMenuFor] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');

  const playlists = music.playlists;
  const likedIds = music.likedSongs || [];
  const openPlaylist = playlists.find((p) => p.id === openPlaylistId) || null;

  const submitCreate = () => {
    const name = nameDraft.trim();
    if (!name) return;
    createPlaylist(name);
    unlockAchievement('curator');
    setNameDraft('');
    setCreating(false);
  };

  const submitRename = () => {
    if (renamingId && renameDraft.trim()) renamePlaylist(renamingId, renameDraft);
    setRenamingId(null);
    setRenameDraft('');
  };

  const playAll = (ids, name) => {
    const first = trackById(ids[0]);
    if (first) setMusicTrack(first, { name, ids });
  };

  // ——— Playlist detail ———
  if (openPlaylist) {
    const plTracks = openPlaylist.trackIds.map(trackById).filter(Boolean);
    const context = { name: openPlaylist.name, ids: openPlaylist.trackIds };
    return (
      <motion.div key={`pl-${openPlaylist.id}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <button
          onClick={() => setOpenPlaylistId(null)}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-os-onSurfaceVariant hover:text-os-primary transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 rounded-lg px-2 py-1 -ml-2"
        >
          <ChevronLeft size={14} /> Library
        </button>

        <div className="flex items-end gap-8 mb-12">
          <div className="w-40 h-40 md:w-56 md:h-56 rounded-3xl bg-sdl-soft border border-sdl-accent/30 flex items-center justify-center shadow-2xl shrink-0">
            <ListMusic size={64} className="text-sdl-aInk" />
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-os-primary">Playlist</span>
            {renamingId === openPlaylist.id ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                  className="bg-veil/10 border border-hairline/20 rounded-xl px-4 py-2 text-2xl font-black tracking-tighter focus:outline-none focus:border-os-primary/50 min-w-0"
                />
                <button onClick={submitRename} aria-label="Save name" className="p-2 rounded-xl bg-os-primary text-sdl-onAccent">
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <h2 className="text-3xl md:text-6xl font-black tracking-tighter truncate">{openPlaylist.name}</h2>
            )}
            <p className="text-os-onSurfaceVariant font-bold">{plTracks.length} tracks</p>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => playAll(openPlaylist.trackIds, openPlaylist.name)}
                disabled={plTracks.length === 0}
                className="px-10 py-4 rounded-full bg-os-primary text-sdl-onAccent font-black hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
              >
                Play All
              </button>
              <button
                onClick={() => {
                  setRenamingId(openPlaylist.id);
                  setRenameDraft(openPlaylist.name);
                }}
                aria-label="Rename playlist"
                className="p-3.5 rounded-full bg-veil/5 border border-hairline/10 text-os-onSurfaceVariant hover:text-sdl-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => {
                  deletePlaylist(openPlaylist.id);
                  setOpenPlaylistId(null);
                }}
                aria-label="Delete playlist"
                className="p-3.5 rounded-full bg-veil/5 border border-hairline/10 text-os-onSurfaceVariant hover:text-sdl-alert transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {plTracks.length === 0 ? (
          <div className="py-16 text-center">
            <ListMusic size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-os-onSurfaceVariant font-bold">
              Empty playlist — add tracks from any list&apos;s ⋯ menu.
            </p>
          </div>
        ) : (
          <TrackTable
            tracks={plTracks}
            isMobile={isMobile}
            currentTrackId={music.currentTrack.id}
            onPlay={(track) => setMusicTrack(track, context)}
            onRemove={(trackId) => removeFromPlaylist(openPlaylist.id, trackId)}
          />
        )}
      </motion.div>
    );
  }

  // ——— Library root ———
  return (
    <motion.div key="library-root" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="flex items-end gap-8 mb-12">
        <div className="w-48 h-48 md:w-64 md:h-64 rounded-3xl bg-gradient-to-br from-os-primary to-os-secondary flex items-center justify-center shadow-2xl border border-hairline/10">
          <Heart size={80} fill="currentColor" strokeWidth={0} className="text-sdl-sec" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-black uppercase tracking-[0.3em] text-os-primary">Collection</span>
          <h2 className="text-4xl md:text-7xl font-black tracking-tighter">Liked Songs</h2>
          <p className="text-os-onSurfaceVariant font-bold">{likedIds.length} tracks in your library</p>
          <button
            onClick={() => playAll(likedIds, 'Liked Songs')}
            disabled={likedIds.length === 0}
            className="mt-4 px-10 py-4 rounded-full bg-os-primary text-sdl-onAccent font-black hover:scale-105 active:scale-95 transition-all w-fit disabled:opacity-40 disabled:hover:scale-100"
          >
            Play All
          </button>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="py-10 text-center mb-12">
          <Heart size={40} className="mx-auto mb-4 opacity-20" />
          <p className="text-os-onSurfaceVariant font-bold">Nothing liked yet — tap a heart anywhere.</p>
        </div>
      ) : (
        <div className="mb-14">
          <TrackTable
            tracks={tracks}
            isMobile={isMobile}
            currentTrackId={music.currentTrack.id}
            onPlay={(track) => setMusicTrack(track)}
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
          <ListMusic className="text-os-primary" /> Playlists
        </h3>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-os-primary/10 border border-os-primary/30 text-os-primary text-xs font-black uppercase tracking-widest hover:bg-os-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
          >
            <Plus size={14} /> New Playlist
          </button>
        )}
      </div>

      {creating && (
        <div className="flex items-center gap-2 mb-6">
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCreate();
              if (e.key === 'Escape') {
                setCreating(false);
                setNameDraft('');
              }
            }}
            placeholder="Playlist name…"
            className="bg-veil/10 border border-hairline/20 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-os-primary/50 w-64"
          />
          <button
            onClick={submitCreate}
            disabled={!nameDraft.trim()}
            className="px-4 py-2.5 rounded-xl bg-os-primary text-sdl-onAccent text-xs font-black uppercase tracking-widest disabled:opacity-40"
          >
            Create
          </button>
          <button
            onClick={() => {
              setCreating(false);
              setNameDraft('');
            }}
            aria-label="Cancel"
            className="p-2.5 rounded-xl bg-veil/5 border border-hairline/10 text-os-onSurfaceVariant hover:text-sdl-ink transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {playlists.length === 0 && !creating ? (
        <p className="text-os-onSurfaceVariant font-medium text-sm py-6">
          No playlists yet. Create one here, or from any track&apos;s ⋯ menu.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {playlists.map((pl) => {
            const coverTrack = trackById(pl.trackIds[0]);
            return (
              <div
                key={pl.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenPlaylistId(pl.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenPlaylistId(pl.id);
                  }
                }}
                className="group relative bg-veil/5 border border-hairline/5 rounded-2xl p-4 cursor-pointer hover:bg-veil/10 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
              >
                <div className="relative aspect-square mb-3 rounded-xl overflow-hidden border border-hairline/10 shadow-lg bg-sdl-soft flex items-center justify-center">
                  {coverTrack ? (
                    <img src={coverTrack.cover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ListMusic size={32} className="text-sdl-aInk" />
                  )}
                </div>
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm truncate">{pl.name}</h4>
                    <p className="text-xs text-os-onSurfaceVariant">{pl.trackIds.length} tracks</p>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      aria-label={`Options for ${pl.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuFor(menuFor === pl.id ? null : pl.id);
                      }}
                      className={`p-1.5 rounded-lg text-os-onSurfaceVariant hover:text-sdl-ink hover:bg-veil/10 transition-colors focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${menuFor === pl.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {menuFor === pl.id && (
                      <>
                        <div
                          className="fixed inset-0 z-[80]"
                          aria-hidden="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuFor(null);
                          }}
                        />
                        <div className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-sdl-surface border border-hairline/10 shadow-lift p-1.5 z-[90]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuFor(null);
                              setOpenPlaylistId(pl.id);
                              setRenamingId(pl.id);
                              setRenameDraft(pl.name);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-bold text-sdl-ink hover:bg-veil/10 transition-colors"
                          >
                            <Pencil size={14} className="text-os-onSurfaceVariant" /> Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuFor(null);
                              deletePlaylist(pl.id);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-bold text-sdl-alert hover:bg-veil/10 transition-colors"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default LibraryView;
