import { useCallback } from 'react';
import useOSStore from '../store/osStore';

/**
 * One AudioContext for the whole OS, created lazily on the first sound.
 *
 * This hook used to construct an AudioContext in a mount effect — per caller. It is called by
 * Desktop, Taskbar, MenuBar, ControlCenter and every open Window, so a bare desktop held eight
 * live contexts under StrictMode (measured) and each window added two more. Chrome caps a document
 * at six and throws on the seventh; each one also owns a real audio thread. And a context created
 * before any user gesture boots `suspended` and never resumes, so those early sounds were silent
 * anyway (the same note is on useGameAudio.js, which already did this the lazy way).
 *
 * Module scope, never closed: the shell is mounted for the session and a closed context cannot be
 * reopened. `resume()` is a no-op once running and is the sanctioned way past the autoplay gate,
 * since every call site sits inside a click handler.
 */
let sharedCtx = null;
const getAudioContext = () => {
  if (!sharedCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    sharedCtx = new Ctor();
  }
  if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(() => {});
  return sharedCtx;
};

/**
 * Custom hook for generating OS-style sound effects using Web Audio API.
 * Creates synthesized sounds for UI interactions without external audio files.
 *
 * Sound types:
 * - 'click' - Short sine wave for button presses
 * - 'open' - Rising triangle wave for window open
 * - 'close' - Falling triangle wave for window close
 * - 'error' - Low sawtooth for error states
 * - 'achievement' - Ascending chime for achievements
 *
 * @returns {Object} Sound control object
 * @returns {Function} returns.playSound - Function to play a sound by type (stable identity)
 *
 * @example
 * const { playSound } = useSoundEffects();
 * playSound('click');
 * playSound('achievement');
 */
const useSoundEffects = () => {
  // Selectors, not `useOSStore()`. A whole-store subscription re-renders this component on
  // every state change anywhere in the OS, not just the fields it reads.
  const soundEnabled = useOSStore((s) => s.soundEnabled);

  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'open':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'close':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'error':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.setValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'achievement':
        // A little chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      default:
        break;
    }
  }, [soundEnabled]);

  return { playSound };
};

export default useSoundEffects;
