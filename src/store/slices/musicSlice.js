import { MUSIC_DATA } from '../../data/musicData';

// Queue the transport operates on: liked songs in Library view, else everything.
const getQueue = (music) => {
  if (music.activeView === 'Library') {
    const liked = MUSIC_DATA.filter((t) => music.likedSongs?.includes(t.id));
    if (liked.length > 0) return liked;
  }
  return MUSIC_DATA;
};

const advanceTo = (music, track) => ({
  music: {
    ...music,
    currentTrack: track,
    currentTime: 0,
    isPlaying: true,
    history: [music.currentTrack.id, ...(music.history || [])].slice(0, 50)
  }
});

export const createMusicSlice = (set) => ({
  music: {
    isPlaying: false,
    currentTrack: MUSIC_DATA[0],
    volume: 0.7,
    currentTime: 0,
    likedSongs: [], // Track IDs of liked songs
    activeView: 'Home', // Current UI view (Home, Library, etc)
    shuffle: false,
    repeatMode: 'none', // 'none', 'one', 'all'
    history: [] // Last played track IDs
  },

  setMusicIsPlaying: (isPlaying) => set((state) => ({
    music: { ...state.music, isPlaying }
  })),

  setMusicTrack: (track) => set((state) => ({
    music: { 
      ...state.music, 
      currentTrack: track, 
      currentTime: 0, 
      isPlaying: true,
      history: [state.music.currentTrack.id, ...(state.music.history || [])].slice(0, 50)
    }
  })),

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

  nextTrack: () => set((state) => {
    const m = state.music;
    const list = getQueue(m);
    let next;
    if (m.shuffle) {
      const others = list.filter((t) => t.id !== m.currentTrack.id);
      next = others[Math.floor(Math.random() * others.length)];
    } else {
      const idx = list.findIndex((t) => t.id === m.currentTrack.id);
      if (idx === -1) next = list[0];
      else if (idx === list.length - 1) {
        if (m.repeatMode === 'all') next = list[0];
        else return { music: { ...m, isPlaying: false } }; // end of queue
      } else next = list[idx + 1];
    }
    if (!next) return { music: { ...m, isPlaying: false } };
    return advanceTo(m, next);
  }),

  prevTrack: () => set((state) => {
    const m = state.music;
    const list = getQueue(m);
    const idx = list.findIndex((t) => t.id === m.currentTrack.id);
    const prev = idx > 0 ? list[idx - 1] : list[list.length - 1];
    if (!prev) return {};
    return advanceTo(m, prev);
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

  setMusicVolume: (value) => set((state) => ({
    music: { ...state.music, volume: value }
  })),
});
