import { useCallback, useEffect, useRef } from 'react';
import useOSStore from '../store/osStore';

/**
 * Synthesized game sounds, on the same WebAudio approach as useSoundEffects and honouring the
 * same persisted `soundEnabled` preference — so the OS-wide mute in Control Center silences the
 * games too, rather than each game inventing its own toggle.
 *
 * None of the five games had any audio at all. These are short and dry on purpose: a portfolio
 * may well be opened in an office, so nothing here is longer than 260ms or louder than 0.09 gain.
 *
 * One shared AudioContext per game instance, created lazily on the first play. Creating it at
 * mount (as useSoundEffects does) means a suspended context on every window open, since browsers
 * will not start one before a user gesture.
 */

const VOICES = {
  // [waveform, startHz, endHz, seconds, gain]
  move: ['sine', 220, 180, 0.05, 0.03],
  merge: ['triangle', 440, 660, 0.1, 0.06],
  eat: ['square', 520, 780, 0.07, 0.045],
  flip: ['sine', 660, 660, 0.05, 0.04],
  match: ['triangle', 520, 880, 0.14, 0.06],
  wrong: ['sawtooth', 200, 120, 0.16, 0.05],
  place: ['sine', 380, 460, 0.06, 0.045],
  win: ['triangle', 523, 1046, 0.26, 0.07],
  lose: ['sawtooth', 300, 90, 0.26, 0.06],
  tick: ['sine', 900, 900, 0.03, 0.025],
};

export default function useGameAudio() {
  const soundEnabled = useOSStore((s) => s.soundEnabled);
  const ctxRef = useRef(null);

  useEffect(() => () => {
    // Closing on unmount matters here: a window can be opened and closed repeatedly, and each
    // orphaned AudioContext holds an audio thread open. Browsers cap them per page.
    ctxRef.current?.close();
    ctxRef.current = null;
  }, []);

  const play = useCallback((name) => {
    if (!soundEnabled) return;
    const spec = VOICES[name];
    if (!spec) return;

    try {
      if (!ctxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        ctxRef.current = new Ctx();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const [type, from, to, dur, vol] = spec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(from, now);
      if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.start(now);
      osc.stop(now + dur);
    } catch {
      // Audio is a garnish. A blocked or exhausted context must never take a game down with it.
    }
  }, [soundEnabled]);

  return play;
}
