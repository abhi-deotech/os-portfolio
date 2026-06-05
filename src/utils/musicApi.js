const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY;
const LASTFM_USERNAME = import.meta.env.VITE_LASTFM_USERNAME || 'rj'; // Fallback to a Last.fm founder's username if not provided
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

const fetchLastFm = async (method, params = {}) => {
  if (!LASTFM_API_KEY) {
    console.warn(`Last.fm API key is missing. Set VITE_LASTFM_API_KEY. Mocking response for ${method}`);
    return null; // Handle mock data in the caller or return a predefined mock here
  }

  const queryParams = new URLSearchParams({
    method,
    api_key: LASTFM_API_KEY,
    format: 'json',
    ...params
  });

  try {
    const response = await fetch(`${BASE_URL}?${queryParams}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    if (data.error) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error(`Error fetching Last.fm API (${method}):`, error);
    return null;
  }
};

export const getNowPlaying = async () => {
  const data = await fetchLastFm('user.getrecenttracks', {
    user: LASTFM_USERNAME,
    limit: 1
  });
  
  if (data?.recenttracks?.track?.length > 0) {
    const track = data.recenttracks.track[0];
    const isNowPlaying = track['@attr']?.nowplaying === 'true';
    return {
      title: track.name,
      artist: track.artist['#text'],
      album: track.album['#text'],
      cover: track.image[track.image.length - 1]['#text'] || null, // Highest res
      isNowPlaying
    };
  }
  
  // Return mock if no API key or no data
  return {
    title: 'Offline',
    artist: 'Not listening currently',
    album: '',
    cover: null,
    isNowPlaying: false
  };
};

export const getArtistBio = async (artistName) => {
  const data = await fetchLastFm('artist.getinfo', {
    artist: artistName
  });
  
  if (data?.artist?.bio?.summary) {
    // Strip HTML links from summary (Last.fm adds "Read more on Last.fm")
    const cleanSummary = data.artist.bio.summary.replace(/<a href="(.*?)".*?>(.*?)<\/a>/gi, '$2');
    return cleanSummary;
  }
  return null;
};

export const getTopTracks = async (limit = 10) => {
  const data = await fetchLastFm('user.gettoptracks', {
    user: LASTFM_USERNAME,
    limit,
    period: '7day' // 'overall', '7day', '1month', '3month', '6month', '12month'
  });
  
  if (data?.toptracks?.track) {
    return data.toptracks.track.map(track => ({
      id: track.mbid || track.name,
      title: track.name,
      artist: track.artist.name,
      playcount: track.playcount,
      cover: track.image[track.image.length - 1]['#text'] || null
    }));
  }
  return [];
};

export const getSimilarTracks = async (artist, track, limit = 5) => {
  const data = await fetchLastFm('track.getsimilar', {
    artist,
    track,
    limit
  });
  
  if (data?.similartracks?.track) {
    return data.similartracks.track.map(t => ({
      id: t.mbid || t.name,
      title: t.name,
      artist: t.artist.name,
      cover: t.image[t.image.length - 1]['#text'] || null
    }));
  }
  return [];
};
