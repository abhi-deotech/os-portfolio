export const createMusicSlice = (set) => ({
  music: {
    isPlaying: false,
    currentTrack: {
      id: 'metro-niagara',
      youtubeId: 'v9l4yv3w-0w',
      title: 'Niagara Falls (Foot or 2)',
      artist: 'Metro Boomin, Travis Scott, 21 Savage',
      album: 'HEROES & VILLAINS',
      cover: 'https://images.weserv.nl/?url=https://img.youtube.com/vi/v9l4yv3w-0w/hqdefault.jpg',
      duration: 207
    },
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
