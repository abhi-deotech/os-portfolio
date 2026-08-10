/**
 * Global music playback engine (module singleton).
 *
 * Lives outside React so playback survives any window/component unmount.
 * Two backends, selected per track via `track.source`:
 *   - 'local'   → shared HTML5 Audio element (+ lazy Web Audio AnalyserNode)
 *   - 'youtube' → hidden YouTube IFrame player (lazy-created on first use)
 *
 * Driven entirely by the zustand store: attach(useOSStore) subscribes to
 * currentTrack / isPlaying / volume and publishes currentTime, duration and
 * track-end transitions back. UI components never talk to backends directly —
 * only seek() and getLiveAnalyser() are exposed for imperative needs.
 */

let store = null;
let attached = false;

// --- local backend ---
let audio = null;
let audioCtx = null;
let analyser = null;

// --- youtube backend ---
let yt = null;
let ytReady = false;
let ytLoading = false;
let pendingYt = null; // videoId queued while the player/API is still loading

const isLocal = (track) => track?.source === 'local';

const state = () => store.getState();
const music = () => state().music;

/* ------------------------------- local audio ------------------------------ */

function ensureAudio() {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'none';
  audio.crossOrigin = 'anonymous'; // CORS fetch so the AnalyserNode isn't tainted
  audio.volume = music().volume;

  audio.addEventListener('loadedmetadata', () => {
    const duration = Math.round(audio.duration);
    if (duration && Number.isFinite(duration)) {
      state().syncMusicTrack({ duration });
    }
  });
  audio.addEventListener('ended', handleTrackEnd);
  audio.addEventListener('play', () => {
    state().setMusicIsPlaying(true);
    state().unlockAchievement?.('audiophile');
  });
  audio.addEventListener('error', () => {
    console.error('[MusicEngine] Audio error for', audio.src);
    state().nextTrack();
  });
  return audio;
}

function ensureAnalyser() {
  if (audioCtx || !audio) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    const source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  } catch (err) {
    // Audio still plays through the element's default output.
    console.warn('[MusicEngine] AnalyserNode unavailable:', err);
    audioCtx = null;
    analyser = null;
  }
}

function playLocal(track) {
  const el = ensureAudio();
  const src = new URL(track.src, window.location.origin).href;
  if (el.src !== src) {
    el.src = src;
    el.load();
  }
  ensureAnalyser();
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  el.play().catch((err) => {
    // Autoplay policy or decode failure — don't lie about playing state.
    console.warn('[MusicEngine] play() rejected:', err.message);
    state().setMusicIsPlaying(false);
  });
}

/* ----------------------------- youtube backend ---------------------------- */

function loadYouTubeApi() {
  if (window.YT?.Player) {
    createYtPlayer();
    return;
  }
  if (!document.getElementById('youtube-iframe-api')) {
    const tag = document.createElement('script');
    tag.id = 'youtube-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
  const previousCallback = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (previousCallback) previousCallback();
    createYtPlayer();
  };
}

function createYtPlayer() {
  if (yt || !window.YT?.Player) return;

  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1;';
  document.body.appendChild(container);

  const iframe = document.createElement('iframe');
  iframe.id = 'lumina-yt-player';
  iframe.setAttribute('credentialless', 'true');
  iframe.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  const origin = window.location.origin;
  const videoId = pendingYt || music().currentTrack?.youtubeId || '';
  iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(origin)}&widget_referrer=${encodeURIComponent(origin)}&autoplay=1&controls=0&disablekb=1&fs=0&rel=0&modestbranding=1&playsinline=1`;
  container.appendChild(iframe);

  yt = new window.YT.Player('lumina-yt-player', {
    host: 'https://www.youtube.com',
    events: {
      onReady: (event) => {
        ytReady = true;
        event.target.unMute();
        event.target.setVolume(music().volume * 100);
        if (music().isPlaying && !isLocal(music().currentTrack)) {
          event.target.playVideo();
        }
        pendingYt = null;
      },
      onStateChange: (event) => {
        if (isLocal(music().currentTrack)) return; // stale events while local track active
        if (event.data === window.YT.PlayerState.ENDED) {
          handleTrackEnd();
        }
        if (event.data === window.YT.PlayerState.PLAYING) {
          state().setMusicIsPlaying(true);
          state().unlockAchievement?.('audiophile');
          const duration = Math.round(yt.getDuration?.() || 0);
          if (duration && Math.abs(duration - music().currentTrack.duration) > 2) {
            state().syncMusicTrack({ duration });
          }
        }
        if (event.data === window.YT.PlayerState.PAUSED) {
          state().setMusicIsPlaying(false);
        }
      },
      onError: (e) => {
        console.error('[MusicEngine] YouTube error:', e.data);
        if ([2, 5, 100, 101, 150].includes(e.data)) {
          state().nextTrack();
        }
      },
    },
  });
}

function playYouTube(track) {
  if (!yt) {
    pendingYt = track.youtubeId;
    if (!ytLoading) {
      ytLoading = true;
      loadYouTubeApi();
    }
    return;
  }
  if (!ytReady) {
    pendingYt = track.youtubeId;
    return;
  }
  const currentId = yt.getVideoData?.()?.video_id;
  if (currentId !== track.youtubeId) {
    yt.loadVideoById(track.youtubeId);
  } else if (yt.getPlayerState?.() !== window.YT?.PlayerState?.PLAYING) {
    yt.playVideo();
  }
}

/* ------------------------------ orchestration ----------------------------- */

function pauseInactiveBackend(track) {
  if (isLocal(track)) {
    if (ytReady && yt.getPlayerState?.() === window.YT?.PlayerState?.PLAYING) {
      yt.stopVideo();
    }
  } else if (audio && !audio.paused) {
    audio.pause();
  }
}

function applyPlayback() {
  const m = music();
  const track = m.currentTrack;
  if (!track) return;
  pauseInactiveBackend(track);

  if (m.isPlaying) {
    if (isLocal(track)) playLocal(track);
    else playYouTube(track);
  } else {
    if (isLocal(track)) {
      if (audio && !audio.paused) audio.pause();
    } else if (ytReady && yt.getPlayerState?.() === window.YT?.PlayerState?.PLAYING) {
      yt.pauseVideo();
    }
  }
}

function handleTrackEnd() {
  const m = music();
  if (m.repeatMode === 'one') {
    seek(0);
    applyPlayback();
  } else {
    state().nextTrack();
  }
}

/* -------------------------------- public api ------------------------------ */

export function attach(osStore) {
  if (attached) return;
  attached = true;
  store = osStore;

  store.subscribe((curr, prev) => {
    const m = curr.music;
    const pm = prev.music;
    if (m === pm) return;
    if (m.currentTrack?.id !== pm.currentTrack?.id || m.isPlaying !== pm.isPlaying) {
      applyPlayback();
    }
    if (m.volume !== pm.volume) {
      if (audio) audio.volume = m.volume;
      if (ytReady) yt.setVolume(m.volume * 100);
    }
  });

  // Single clock for both backends: publish position once per second.
  setInterval(() => {
    const m = music();
    if (!m.isPlaying) return;
    let t = null;
    if (isLocal(m.currentTrack)) {
      if (audio) t = audio.currentTime;
    } else if (ytReady && yt.getCurrentTime) {
      t = yt.getCurrentTime();
    }
    if (typeof t === 'number' && !Number.isNaN(t)) {
      state().setMusicCurrentTime(t);
    }
  }, 1000);
}

export function seek(seconds) {
  const m = music();
  if (isLocal(m.currentTrack)) {
    if (audio) audio.currentTime = seconds;
  } else if (ytReady) {
    yt.seekTo(seconds, true);
  }
  state().setMusicCurrentTime(seconds);
}

/**
 * Returns the AnalyserNode only while a local track is actually producing
 * audio — callers fall back to synthetic animation otherwise.
 */
export function getLiveAnalyser() {
  if (!analyser || !audio || audio.paused || audioCtx?.state !== 'running') return null;
  return analyser;
}
