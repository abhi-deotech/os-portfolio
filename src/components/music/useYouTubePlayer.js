import { useEffect, useRef } from 'react';
import useOSStore from '../../store/osStore';

/**
 * The YouTube IFrame engine, extracted from MusicApp so the component composes views
 * instead of interleaving player lifecycle with layout.
 *
 * Playback is a hidden iframe on youtube-nocookie.com driven through window.YT.Player —
 * an embed, not an <audio> element. Everything that follows from that is owned here:
 *
 *  - the IFrame API script loads once, app-wide, shared via window.onYouTubeIframeAPIReady
 *  - the player is created ONCE per mount; track changes go through loadVideoById, so
 *    the create effect's dep list stays honest instead of tearing the iframe down on
 *    every play/pause/volume render (the old inline version listed six deps and relied
 *    on an early-return guard to not recreate)
 *  - volume: the store's 0–100 scale IS the player's unit — applied on change and again
 *    on ready, because a player created after a volume change boots at the YT default
 *  - duration contract: catalog `duration` values are hand-entered estimates so the UI
 *    can render before the engine spins up; the player's getDuration() is truth. Once
 *    it meaningfully disagrees (>1s) it is synced into the current track via
 *    syncMusicTrack, so seek math and the time display stop lying. The >1s guard makes
 *    this a once-per-track write, and the getVideoData() check keeps a still-loading
 *    NEW track from inheriting the OLD track's measured duration.
 *  - the ended→next chain and all YT callbacks read through refs, so they always see
 *    the state of the render they fire in, not the one the player was created in
 *
 * The iframe's audio can never be tapped from here (cross-origin), which is why the
 * Visualizer stays simulated — see the note in src/components/Visualizer.jsx.
 */
export default function useYouTubePlayer({ onEnded }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const readyRef = useRef(false);

  const youtubeId = useOSStore((s) => s.music.currentTrack.youtubeId);
  const isPlaying = useOSStore((s) => s.music.isPlaying);
  const volume = useOSStore((s) => s.music.volume);
  const setMusicIsPlaying = useOSStore((s) => s.setMusicIsPlaying);
  const setMusicCurrentTime = useOSStore((s) => s.setMusicCurrentTime);
  const syncMusicTrack = useOSStore((s) => s.syncMusicTrack);
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);

  // Latest-value refs for the create-once effect and the async YT callbacks.
  const onEndedRef = useRef(onEnded);
  const bootRef = useRef({ youtubeId, isPlaying, volume });
  useEffect(() => {
    onEndedRef.current = onEnded;
    bootRef.current = { youtubeId, isPlaying, volume };
  });

  // Create the player once per mount.
  useEffect(() => {
    if (!window.YT && !document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    let disposed = false;

    const createPlayer = () => {
      if (disposed || playerRef.current || !window.YT?.Player || !containerRef.current) return;
      try {
        containerRef.current.innerHTML = '';

        // This iframe used to be marked `credentialless`, the Chromium-only escape hatch that let
        // it load inside the app's COEP context. The app no longer sets COEP (see vite.config.js),
        // so the attribute is not just redundant: a credentialless frame gets an ephemeral context
        // with no cookies or storage, which cost the embed its normal YouTube state. Dropping it
        // is also what makes this load at all on Firefox and Safari, which never supported it.
        const iframe = document.createElement('iframe');
        iframe.id = 'yt-player-iframe';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        const origin = window.location.origin;
        iframe.src = `https://www.youtube-nocookie.com/embed/${bootRef.current.youtubeId}?enablejsapi=1&origin=${encodeURIComponent(origin)}&autoplay=0&controls=0&disablekb=1&fs=0&rel=0&modestbranding=1&playsinline=1`;
        containerRef.current.appendChild(iframe);

        playerRef.current = new window.YT.Player(iframe, {
          events: {
            onReady: (event) => {
              readyRef.current = true;
              const { volume: vol, isPlaying: playing, youtubeId: id } = bootRef.current;
              event.target.setVolume(vol);
              // The track can change between iframe construction and API ready; the
              // track-change effect below no-ops while not ready, so catch up here.
              const loaded = event.target.getVideoData?.()?.video_id;
              if (loaded && loaded !== id) event.target.loadVideoById(id);
              if (playing) event.target.playVideo();
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) onEndedRef.current?.();
              if (event.data === window.YT.PlayerState.PLAYING) {
                setMusicIsPlaying(true);
                unlockAchievement('audiophile');
              }
              if (event.data === window.YT.PlayerState.PAUSED) setMusicIsPlaying(false);
            },
            onError: (e) => {
              console.error('YouTube Player Error:', e.data);
              // Invalid/blocked/removed embeds: advance rather than hang the session.
              if ([2, 5, 100, 101, 150].includes(e.data)) onEndedRef.current?.();
            },
          },
        });
      } catch (err) {
        console.warn('Failed to initialize YouTube player:', err);
      }
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        createPlayer();
      };
    }

    return () => {
      // StrictMode mounts → unmounts → remounts: destroy so the second mount builds a
      // fresh player instead of finding a zombie bound to a detached iframe.
      disposed = true;
      readyRef.current = false;
      try {
        playerRef.current?.destroy?.();
      } catch {
        // The iframe may already be gone with the unmounting container.
      }
      playerRef.current = null;
    };
    // Zustand action identities are stable; this effect genuinely runs once per mount.
  }, [setMusicIsPlaying, unlockAchievement]);

  // Track changes ride the existing player. Not ready yet → onReady catches up above.
  useEffect(() => {
    const p = playerRef.current;
    if (readyRef.current && p && typeof p.loadVideoById === 'function') {
      p.loadVideoById(youtubeId);
    }
  }, [youtubeId]);

  // Store → engine transport. The engine → store direction is onStateChange above.
  useEffect(() => {
    const p = playerRef.current;
    if (!p || typeof p.playVideo !== 'function') return;
    const state = p.getPlayerState?.();
    if (isPlaying) {
      if (state !== window.YT?.PlayerState?.PLAYING) p.playVideo();
    } else if (state !== window.YT?.PlayerState?.PAUSED) {
      p.pauseVideo();
    }
  }, [isPlaying]);

  useEffect(() => {
    const p = playerRef.current;
    if (readyRef.current && p && typeof p.setVolume === 'function') p.setVolume(volume);
  }, [volume]);

  // Poll once a second: time for the seek bar, plus the duration reconciliation
  // described in the header. Reads the current track from the store directly so a
  // just-switched track can never be compared against a stale closure.
  useEffect(() => {
    const interval = setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      const track = useOSStore.getState().music.currentTrack;
      const loaded = p.getVideoData?.()?.video_id;
      if (loaded && loaded !== track.youtubeId) return; // old video still winding down
      setMusicCurrentTime(p.getCurrentTime());
      const d = typeof p.getDuration === 'function' ? p.getDuration() : 0;
      if (d > 0 && Math.abs(d - track.duration) > 1) {
        syncMusicTrack({ duration: Math.round(d) });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [setMusicCurrentTime, syncMusicTrack]);

  const seekTo = (seconds) => {
    const p = playerRef.current;
    if (p && typeof p.seekTo === 'function') p.seekTo(seconds, true);
  };

  // Repeat-one's ended→restart: after ENDED the store still says isPlaying, so the
  // transport effect will not fire — play must be commanded directly.
  const restart = () => {
    const p = playerRef.current;
    if (p && typeof p.seekTo === 'function') {
      p.seekTo(0, true);
      p.playVideo?.();
    }
  };

  return { containerRef, seekTo, restart };
}
