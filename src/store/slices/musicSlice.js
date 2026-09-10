// Extension-explicit so the persistence harness can import this module under plain Node
// (which refuses extensionless ESM specifiers) — same rule as components/music/playback.js.
import { MUSIC_DATA } from '../../data/musicData.js';

/** Catalog lookup shared by the default state and the rehydrate sanitizer below. */
const TRACKS = new Map(MUSIC_DATA.map((t) => [t.id, t]));
const inCatalog = (ids) => (Array.isArray(ids) ? ids.filter((id) => TRACKS.has(id)) : []);

// A live catalog entry, not a hand-copied literal: the old inline default ('metro-niagara')
// had drifted from the catalog — a different id AND a dead youtubeId — so fresh visitors
// started on a track that Next could not even locate in the list.
const DEFAULT_TRACK = TRACKS.get('niagara-falls') || MUSIC_DATA[0];

const EMPTY_LASTFM = { nowPlaying: null, artistBio: null, topTracks: [], similarTracks: [] };

/**
 * Repair a persisted `music` payload against the live catalog. Called from osStore's
 * merge() on EVERY load (not at a version bump) because these are invariants of the
 * catalog, not one-time migrations:
 *
 *  - never rehydrate as "playing" — no audio engine is running yet
 *  - re-resolve currentTrack by id so a removed/renamed catalog entry cannot leave a
 *    dead track loaded. This also snaps a reconciled duration back to the catalog
 *    estimate; the player re-measures within a second of the next play (see the
 *    duration contract in components/music/useYouTubePlayer.js)
 *  - queue / playContext / playlist trackIds drop ids whose track left the catalog —
 *    the currentTrack rule applied element-wise
 *  - VOLUME MIGRATION: volume was stored 0–1 (only the ControlCenter slider wrote it;
 *    the player kept a separate local 0–100 state it never read back). Canonical is now
 *    0–100, the YT player's native unit. A persisted value ≤ 1 can only be the old
 *    scale — the new scale stores integers — so it is multiplied by 100. The one
 *    ambiguous input, a deliberate new-scale volume of 1%, gets promoted to 100;
 *    accepted, because old payloads are the entire migrating population and a 1% volume
 *    is indistinguishable from muted anyway.
 */
export function sanitizePersistedMusic(persisted) {
  const p = persisted || {};
  const rawVol = p.volume;
  const volume = typeof rawVol === 'number' && Number.isFinite(rawVol)
    ? Math.max(0, Math.min(100, Math.round(rawVol <= 1 ? rawVol * 100 : rawVol)))
    : 70;
  const ctxIds = inCatalog(p.playContext?.ids);
  return {
    ...p,
    currentTrack: TRACKS.get(p.currentTrack?.id) || MUSIC_DATA[0],
    isPlaying: false,
    currentTime: 0,
    volume,
    likedSongs: Array.isArray(p.likedSongs) ? p.likedSongs : [],
    activeView: typeof p.activeView === 'string' ? p.activeView : 'Home',
    shuffle: !!p.shuffle,
    repeatMode: ['none', 'one', 'all'].includes(p.repeatMode) ? p.repeatMode : 'none',
    history: Array.isArray(p.history) ? p.history : [],
    queue: inCatalog(p.queue),
    playContext: ctxIds.length
      ? { name: typeof p.playContext?.name === 'string' ? p.playContext.name : 'Playlist', ids: ctxIds }
      : null,
    playlists: (Array.isArray(p.playlists) ? p.playlists : [])
      .filter((pl) => pl && typeof pl.id === 'string' && typeof pl.name === 'string')
      .map((pl) => ({
        id: pl.id,
        name: pl.name,
        trackIds: inCatalog(pl.trackIds),
        createdAt: Number.isFinite(pl.createdAt) ? pl.createdAt : Date.now(),
      })),
    lastFmData: p.lastFmData ?? EMPTY_LASTFM,
  };
}

export const createMusicSlice = (set) => ({
  music: {
    isPlaying: false,
    currentTrack: DEFAULT_TRACK,
    // 0–100, the YT player's native unit — see the volume-migration note above.
    volume: 70,
    currentTime: 0,
    likedSongs: [], // Track IDs of liked songs
    activeView: 'Home', // Current UI view (Home, Library, etc)
    shuffle: false,
    repeatMode: 'none', // 'none', 'one', 'all'
    history: [], // Last played track IDs
    // Explicit user queue: track ids, head plays next. Consumed by the resolver in
    // components/music/playback.js — full resolution order documented there.
    queue: [],
    // The context Next/Prev resolve inside: { name, ids } pinned by an explicit
    // "Play All" (playlist, Liked Songs), or null = follow the active view's list.
    playContext: null,
    // User playlists: [{ id, name, trackIds, createdAt }]. Persisted via osStore.
    playlists: [],
    lastFmData: EMPTY_LASTFM,
  },

  setMusicIsPlaying: (isPlaying) => set((state) => ({
    music: { ...state.music, isPlaying }
  })),

  // `contextIds` pins the playback context this track was launched from (a playlist's
  // Play All) so Next/Prev stay inside it while the user browses other views. Omitted
  // means "follow whatever list the active view shows" — the pre-queue behaviour.
  setMusicTrack: (track, context = null) => set((state) => ({
    music: {
      ...state.music,
      currentTrack: track,
      currentTime: 0,
      isPlaying: true,
      playContext: context,
      history: [state.music.currentTrack.id, ...(state.music.history || [])].slice(0, 50)
    }
  })),

  // Merge engine-measured facts (today: the real duration) into the current track
  // without resetting playback the way setMusicTrack does.
  syncMusicTrack: (track) => set((state) => ({
    music: { ...state.music, currentTrack: { ...state.music.currentTrack, ...track } }
  })),

  setMusicCurrentTime: (currentTime) => set((state) => ({
    music: { ...state.music, currentTime }
  })),

  toggleLikeSong: (trackId) => set((state) => {
    const likedSongs = state.music.likedSongs || [];
    const isLiked = likedSongs.includes(trackId);
    const newLikedSongs = isLiked
      ? likedSongs.filter(id => id !== trackId)
      : [...likedSongs, trackId];
    return {
      music: { ...state.music, likedSongs: newLikedSongs }
    };
  }),

  setMusicView: (view) => set((state) => ({
    music: { ...state.music, activeView: view }
  })),

  toggleShuffle: () => set((state) => ({
    music: { ...state.music, shuffle: !state.music.shuffle }
  })),

  setRepeatMode: (mode) => set((state) => ({
    music: { ...state.music, repeatMode: mode }
  })),

  // Canonical 0–100 (the player's own unit). Clamped+rounded here so every caller —
  // the in-app slider, ControlCenter's clicks and arrow keys — lands on the same scale.
  setMusicVolume: (value) => set((state) => ({
    music: { ...state.music, volume: Math.max(0, Math.min(100, Math.round(value))) }
  })),

  // ——— Explicit queue ———

  queueNext: (trackId) => set((state) => ({
    music: { ...state.music, queue: [trackId, ...state.music.queue] }
  })),

  queueLast: (trackId) => set((state) => ({
    music: { ...state.music, queue: [...state.music.queue, trackId] }
  })),

  // Accepts an index (number — remove that row) or a track id (string — remove its
  // first occurrence; duplicates are legal in a queue, so id-removal takes one).
  dequeue: (indexOrId) => set((state) => {
    const queue = [...state.music.queue];
    const idx = typeof indexOrId === 'number' ? indexOrId : queue.indexOf(indexOrId);
    if (idx < 0 || idx >= queue.length) return state;
    queue.splice(idx, 1);
    return { music: { ...state.music, queue } };
  }),

  clearQueue: () => set((state) => ({
    music: { ...state.music, queue: [] }
  })),

  // ——— User playlists ———
  // Pure state transitions only. The 'curator' achievement fires from the CREATE
  // button's event handler, never in here — side effects inside updaters run twice
  // under StrictMode (tasks/lessons.md).

  // Returns the new playlist's id so the creating handler can chain (open it, add the
  // menu's track to it). The id is minted OUTSIDE set() so a re-invoked updater cannot
  // disagree with the value the caller was handed.
  createPlaylist: (name) => {
    const id = `pl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      music: {
        ...state.music,
        playlists: [
          ...state.music.playlists,
          { id, name: (name || '').trim() || 'New Playlist', trackIds: [], createdAt: Date.now() },
        ],
      },
    }));
    return id;
  },

  renamePlaylist: (playlistId, name) => set((state) => ({
    music: {
      ...state.music,
      playlists: state.music.playlists.map((p) =>
        p.id === playlistId ? { ...p, name: (name || '').trim() || p.name } : p
      ),
    },
  })),

  deletePlaylist: (playlistId) => set((state) => ({
    music: { ...state.music, playlists: state.music.playlists.filter((p) => p.id !== playlistId) }
  })),

  addToPlaylist: (playlistId, trackId) => set((state) => ({
    music: {
      ...state.music,
      playlists: state.music.playlists.map((p) =>
        p.id === playlistId && !p.trackIds.includes(trackId)
          ? { ...p, trackIds: [...p.trackIds, trackId] }
          : p
      ),
    },
  })),

  removeFromPlaylist: (playlistId, trackId) => set((state) => ({
    music: {
      ...state.music,
      playlists: state.music.playlists.map((p) =>
        p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) } : p
      ),
    },
  })),

  setLastFmNowPlaying: (data) => set((state) => ({
    music: { ...state.music, lastFmData: { ...state.music.lastFmData, nowPlaying: data } }
  })),

  setLastFmArtistBio: (bio) => set((state) => ({
    music: { ...state.music, lastFmData: { ...state.music.lastFmData, artistBio: bio } }
  })),

  setLastFmTopTracks: (tracks) => set((state) => ({
    music: { ...state.music, lastFmData: { ...state.music.lastFmData, topTracks: tracks } }
  })),

  setLastFmSimilarTracks: (tracks) => set((state) => ({
    music: { ...state.music, lastFmData: { ...state.music.lastFmData, similarTracks: tracks } }
  }))
});
