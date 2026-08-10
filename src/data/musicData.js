import localTracks from 'virtual:music-manifest';

const YOUTUBE_TRACKS = [
  // CHILL/SAFE (Permissive Embeds)
  {
    id: 'lofi-beats',
    youtubeId: 'jfKfPfyJRdk',
    title: 'Lofi Study Radio',
    artist: 'Lofi Girl',
    album: 'Lumina Study Session',
    cover: 'https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg',
    duration: 3600,
    genre: 'Indie'
  },
  // TRAP & HIP HOP
  {
    id: 'niagara-falls',
    youtubeId: 'Z8vDU6vUTj4',
    title: 'Niagara Falls (Foot or 2)',
    artist: 'Metro Boomin, Travis Scott, 21 Savage',
    album: 'HEROES & VILLAINS',
    cover: 'https://i.ytimg.com/vi/Z8vDU6vUTj4/mqdefault.jpg',
    duration: 207,
    genre: 'Trap'
  },
  {
    id: 'fein',
    youtubeId: 'B9synWjqBn8',
    title: 'FE!N',
    artist: 'Travis Scott ft. Playboi Carti',
    album: 'UTOPIA',
    cover: 'https://i.ytimg.com/vi/B9synWjqBn8/mqdefault.jpg',
    duration: 191,
    genre: 'Trap'
  },
  {
    id: 'not-like-us',
    youtubeId: 'H58vbez_m4E',
    title: 'Not Like Us',
    artist: 'Kendrick Lamar',
    album: 'Single',
    cover: 'https://i.ytimg.com/vi/H58vbez_m4E/mqdefault.jpg',
    duration: 274,
    genre: 'Hip Hop'
  },
  {
    id: 'mask-off',
    youtubeId: 'xvZqHgFz51I',
    title: 'Mask Off',
    artist: 'Future',
    album: 'FUTURE',
    cover: 'https://i.ytimg.com/vi/xvZqHgFz51I/mqdefault.jpg',
    duration: 204,
    genre: 'Trap'
  },
  {
    id: 'magnolia',
    youtubeId: 'RLYksQvr5zY',
    title: 'Magnolia',
    artist: 'Playboi Carti',
    album: 'Playboi Carti',
    cover: 'https://i.ytimg.com/vi/RLYksQvr5zY/mqdefault.jpg',
    duration: 181,
    genre: 'Trap'
  },
  {
    id: 'pushin-p',
    youtubeId: '9g08kucPQtE',
    title: 'pushin P',
    artist: 'Gunna, Future, ft. Young Thug',
    album: 'DS4Ever',
    cover: 'https://i.ytimg.com/vi/9g08kucPQtE/mqdefault.jpg',
    duration: 136,
    genre: 'Trap'
  },
  {
    id: 'too-many-nights',
    youtubeId: '3q_ijl-aaTI',
    title: 'Too Many Nights',
    artist: 'Metro Boomin, Don Toliver, Future',
    album: 'HEROES & VILLAINS',
    cover: 'https://i.ytimg.com/vi/3q_ijl-aaTI/mqdefault.jpg',
    duration: 199,
    genre: 'Trap'
  },
  {
    id: 'humble',
    youtubeId: 'tvTRZJ-4EyI',
    title: 'HUMBLE.',
    artist: 'Kendrick Lamar',
    album: 'DAMN.',
    cover: 'https://i.ytimg.com/vi/tvTRZJ-4EyI/mqdefault.jpg',
    duration: 177,
    genre: 'Hip Hop'
  },
  {
    id: 'gods-plan',
    youtubeId: 'xpVfcZ0ZcFM',
    title: "God's Plan",
    artist: 'Drake',
    album: 'Scorpion',
    cover: 'https://i.ytimg.com/vi/xpVfcZ0ZcFM/mqdefault.jpg',
    duration: 198,
    genre: 'Hip Hop'
  },
  {
    id: 'sicko-mode',
    youtubeId: '6ONRf7h3Mdk',
    title: 'SICKO MODE',
    artist: 'Travis Scott',
    album: 'ASTROWORLD',
    cover: 'https://i.ytimg.com/vi/6ONRf7h3Mdk/mqdefault.jpg',
    duration: 312,
    genre: 'Trap'
  },

  // R&B & CHILL
  {
    id: 'tmbtla',
    youtubeId: 'tYvKLO0wOcU',
    title: 'Take Me Back To LA',
    artist: 'The Weeknd',
    album: 'Hurry Up Tomorrow',
    cover: 'https://i.ytimg.com/vi/tYvKLO0wOcU/mqdefault.jpg',
    duration: 240,
    genre: 'R&B'
  },
  {
    id: 'snooze',
    youtubeId: '2fP6_6EwEqY',
    title: 'Snooze',
    artist: 'SZA',
    album: 'SOS',
    cover: 'https://i.ytimg.com/vi/2fP6_6EwEqY/mqdefault.jpg',
    duration: 201,
    genre: 'R&B'
  },
  {
    id: 'passionfruit',
    youtubeId: 'COz9lDCFHjw',
    title: 'Passionfruit',
    artist: 'Drake',
    album: 'More Life',
    cover: 'https://i.ytimg.com/vi/COz9lDCFHjw/mqdefault.jpg',
    duration: 298,
    genre: 'R&B'
  },
  {
    id: 'telepatia',
    youtubeId: 'bnVUHWCynig',
    title: 'telepatía',
    artist: 'Kali Uchis',
    album: 'Sin Miedo',
    cover: 'https://i.ytimg.com/vi/bnVUHWCynig/mqdefault.jpg',
    duration: 160,
    genre: 'R&B'
  },
  {
    id: 'die-for-you',
    youtubeId: 'QLCpqdqeoII',
    title: 'Die For You',
    artist: 'The Weeknd',
    album: 'Starboy',
    cover: 'https://i.ytimg.com/vi/QLCpqdqeoII/mqdefault.jpg',
    duration: 260,
    genre: 'R&B'
  },
  {
    id: 'redbone',
    youtubeId: 'nxuzYWcY2O0',
    title: 'Redbone',
    artist: 'Childish Gambino',
    album: '"Awaken, My Love!"',
    cover: 'https://i.ytimg.com/vi/nxuzYWcY2O0/mqdefault.jpg',
    duration: 326,
    genre: 'R&B'
  },
  {
    id: 'best-part',
    youtubeId: 'vBy7FaapGRo',
    title: 'Best Part',
    artist: 'Daniel Caesar ft. H.E.R.',
    album: 'Freudian',
    cover: 'https://i.ytimg.com/vi/vBy7FaapGRo/mqdefault.jpg',
    duration: 209,
    genre: 'R&B'
  },
  {
    id: 'coffee',
    youtubeId: 'c3hPS6OdFbs',
    title: 'Coffee',
    artist: 'Miguel',
    album: 'Wildheart',
    cover: 'https://i.ytimg.com/vi/c3hPS6OdFbs/mqdefault.jpg',
    duration: 286,
    genre: 'R&B'
  },

  // INDIE & CHILL
  {
    id: 'chamber-reflection',
    youtubeId: 'NY8IS0ssnXQ',
    title: 'Chamber of Reflection',
    artist: 'Mac DeMarco',
    album: 'Salad Days',
    cover: 'https://i.ytimg.com/vi/NY8IS0ssnXQ/mqdefault.jpg',
    duration: 231,
    genre: 'Indie'
  },
  {
    id: 'the-less-i-know',
    youtubeId: '2SUwOgmvzK4',
    title: 'The Less I Know The Better',
    artist: 'Tame Impala',
    album: 'Currents',
    cover: 'https://i.ytimg.com/vi/2SUwOgmvzK4/mqdefault.jpg',
    duration: 218,
    genre: 'Indie'
  },
  {
    id: 'borderline',
    youtubeId: '2g5xkLqIElU',
    title: 'Borderline',
    artist: 'Tame Impala',
    album: 'The Slow Rush',
    cover: 'https://i.ytimg.com/vi/2g5xkLqIElU/mqdefault.jpg',
    duration: 237,
    genre: 'Indie'
  },
  {
    id: 'sweater-weather',
    youtubeId: 'GCdwKhTtNNw',
    title: 'Sweater Weather',
    artist: 'The Neighbourhood',
    album: 'I Love You.',
    cover: 'https://i.ytimg.com/vi/GCdwKhTtNNw/mqdefault.jpg',
    duration: 240,
    genre: 'Indie'
  },
  {
    id: 'heat-waves',
    youtubeId: 'mRD0-GxqHVo',
    title: 'Heat Waves',
    artist: 'Glass Animals',
    album: 'Dreamland',
    cover: 'https://i.ytimg.com/vi/mRD0-GxqHVo/mqdefault.jpg',
    duration: 238,
    genre: 'Indie'
  },
  {
    id: 'fluorescent-adolescent',
    youtubeId: 'ma9I9VBKPiw',
    title: 'Fluorescent Adolescent',
    artist: 'Arctic Monkeys',
    album: 'Favourite Worst Nightmare',
    cover: 'https://i.ytimg.com/vi/ma9I9VBKPiw/mqdefault.jpg',
    duration: 177,
    genre: 'Indie'
  },

  // ELECTRONIC & POP
  {
    id: 'get-lucky',
    youtubeId: '5NV6Rdv1a3I',
    title: 'Get Lucky',
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    cover: 'https://i.ytimg.com/vi/5NV6Rdv1a3I/mqdefault.jpg',
    duration: 248,
    genre: 'Electronic'
  },
  {
    id: 'starboy',
    youtubeId: '34Na4j8AVgA',
    title: 'Starboy',
    artist: 'The Weeknd ft. Daft Punk',
    album: 'Starboy',
    cover: 'https://i.ytimg.com/vi/34Na4j8AVgA/mqdefault.jpg',
    duration: 230,
    genre: 'Electronic'
  },
  {
    id: 'midnight-city',
    youtubeId: 'dX3k_QDnzHE',
    title: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We\'re Dreaming',
    cover: 'https://i.ytimg.com/vi/dX3k_QDnzHE/mqdefault.jpg',
    duration: 243,
    genre: 'Electronic'
  },
  {
    id: 'after-dark',
    youtubeId: 'sVx1mJDeUjY',
    title: 'After Dark',
    artist: 'Mr.Kitty',
    album: 'Time',
    cover: 'https://i.ytimg.com/vi/sVx1mJDeUjY/mqdefault.jpg',
    duration: 257,
    genre: 'Electronic'
  },
  {
    id: 'blinding-lights',
    youtubeId: '4NRXx6U8ABQ',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    cover: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg',
    duration: 200,
    genre: 'Pop'
  },
  {
    id: 'levitating',
    youtubeId: 'TUVcZfQe-Kw',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    cover: 'https://i.ytimg.com/vi/TUVcZfQe-Kw/mqdefault.jpg',
    duration: 203,
    genre: 'Pop'
  },
  {
    id: 'stay',
    youtubeId: 'kTJczUoc26U',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    album: 'F*CK LOVE 3: OVER YOU',
    cover: 'https://i.ytimg.com/vi/kTJczUoc26U/mqdefault.jpg',
    duration: 141,
    genre: 'Pop'
  },
  {
    id: 'as-it-was',
    youtubeId: 'H5v3kku4y6Q',
    title: 'As It Was',
    artist: 'Harry Styles',
    album: "Harry's House",
    cover: 'https://i.ytimg.com/vi/H5v3kku4y6Q/mqdefault.jpg',
    duration: 167,
    genre: 'Pop'
  }
];

// Local tracks are discovered at build/dev time from public/assets/music/*.mp3
// (see plugins/musicManifest.js) — drop a tagged MP3 there and it appears here.
export const MUSIC_DATA = [
  ...localTracks,
  ...YOUTUBE_TRACKS.map((t) => ({ ...t, source: 'youtube' })),
];

export const CATEGORIES = [
  { id: 'trap', name: 'Trap Essentials', color: 'from-purple-500 to-indigo-600' },
  { id: 'rb', name: 'R&B Vibez', color: 'from-pink-500 to-rose-600' },
  { id: 'indie', name: 'Indie/Chill', color: 'from-emerald-400 to-cyan-500' },
  { id: 'electronic', name: 'Electronic Night', color: 'from-blue-500 to-blue-700' },
];
