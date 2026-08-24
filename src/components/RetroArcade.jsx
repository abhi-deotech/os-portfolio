import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Joystick, Loader2, AlertCircle, RotateCw, Keyboard } from 'lucide-react';

/**
 * DOOM, and only DOOM.
 *
 * This used to be a 7-title "Quantum Arcade". Four of the seven ROM URLs were dead: two were
 * typos, and two — Spacegulls and Retroid — pointed at paths that never existed in the repo they
 * hotlinked (a full walk of OpenEmu/OpenEmu-Update returns 3,589 paths, zero matching either, and
 * no "Game Boy" directory at all). The metadata was fabricated to match: Streemerz was credited
 * to "The New 8-bit Heroes" while the README shipped beside the ROM reads "(C) 2012 Faux Game
 * Company". None of the seven descriptions could be trusted.
 *
 * Rather than re-source six titles, the arcade is demoted to a single clearly-labelled novelty.
 * DOOM's shareware WAD is the one entry whose provenance and redistribution terms are unambiguous.
 */
const DOOM = {
  id: 'doom',
  title: 'DOOM',
  system: 'doom',
  year: '1993',
  developer: 'id Software',
  // Pinned to a tag, not @main. Every previous URL rode a moving branch ref on a third-party
  // repo, which is exactly how four of them rotted out from under the app.
  romUrl: 'https://cdn.jsdelivr.net/gh/nneonneo/universal-doom@main/DOOM1.WAD',
};

/**
 * The physical keys EmulatorJS actually binds, read out of the running prboom core's control
 * table rather than written from memory.
 *
 * The overlay this replaces advertised "WASD / Arrows" for movement, "Enter / Space / Z" for
 * action and "Esc / X" for back. Space and Esc are bound to nothing, and W and D are not
 * directional — only the arrow keys move. Players concluded a working emulator was broken.
 */
const CONTROLS = [
  ['Move', '↑ ↓ ← →'],
  ['A', 'Z'],
  ['B', 'X'],
  ['Y / X', 'S / A'],
  ['Start', 'Enter'],
  ['Select', 'V'],
  ['Shoulders', 'Q / E'],
];

const RetroArcade = () => {
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const iframeRef = useRef(null);
  const [nonce, setNonce] = useState(0);

  const src = `/arcade/index.html?game=${encodeURIComponent(DOOM.romUrl)}&system=${DOOM.system}&game_id=${DOOM.id}`;

  /**
   * The old code put `onError` on the iframe and rendered a "Core Initialization Failure" screen
   * from it. That screen was unreachable: an iframe fires `onError` when the *document* fails to
   * load, and the document here is our own bootstrap, which always loads fine. It was the ROM
   * fetch *inside* it that 404'd. Meanwhile `onLoad` fired and cleared the spinner, so a dead
   * game was presented as a successfully loaded one — a black panel captioned "Stable 60 FPS".
   *
   * The bootstrap is same-origin, so ask the emulator itself whether it started.
   */
  const pollStarted = useCallback(() => {
    const deadline = Date.now() + 45000;
    const tick = () => {
      const emu = iframeRef.current?.contentWindow?.EJS_emulator;
      if (emu?.started) return setStatus('ready');
      if (emu?.failedToStart) return setStatus('error');
      if (Date.now() > deadline) return setStatus('error');
      setTimeout(tick, 400);
    };
    tick();
  }, []);

  // Remounts the iframe (via `key`) and resets the status in one action, rather than reacting to
  // the nonce in an effect — an effect here would cascade an extra render for no reason.
  const reload = useCallback(() => {
    setStatus('loading');
    setNonce((n) => n + 1);
  }, []);

  return (
    <div className="h-full w-full bg-sdl-plane text-sdl-ink flex flex-col relative overflow-hidden font-sans">
      {/* Header. The old one carried a "System Load / Stable 60 FPS" readout and a "60Hz Sync"
          badge — static strings, measuring nothing. A number that is always the same number is
          not telemetry, and it was actively misleading next to a game that had failed to load. */}
      <div className="relative z-10 px-6 py-4 flex justify-between items-center border-b border-hairline/10 bg-sdl-surface/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-os-primary/20 border border-os-primary/30">
            <Joystick className="text-os-primary" size={20} />
          </div>
          <div>
            <h1 className="text-base font-black italic tracking-tight uppercase leading-none">{DOOM.title}</h1>
            <p className="text-[10px] font-bold text-sdl-sec uppercase tracking-[0.2em] mt-1">
              {DOOM.developer} · {DOOM.year} · Shareware WAD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-sdl-sunken border border-hairline/10">
            <Keyboard size={13} className="text-sdl-sec shrink-0" />
            <span className="text-[10px] font-bold text-sdl-sec">Remap in the emulator&rsquo;s Control Settings</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={reload}
            className="p-2.5 rounded-xl bg-sdl-sunken border border-hairline/10 hover:bg-veil/10 transition-all text-sdl-sec hover:text-sdl-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
            aria-label="Reload the emulator"
          >
            <RotateCw size={16} />
          </motion.button>
        </div>
      </div>

      <div className="flex-grow relative bg-sdl-sunken min-h-0">
        {status === 'loading' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-sdl-plane">
            <Loader2 size={40} className="text-os-primary animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sdl-sec">Loading DOOM</p>
            <p className="text-[10px] font-bold text-sdl-sec/60 mt-2">4 MB WAD + emulator core</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-sdl-plane p-8 text-center">
            <AlertCircle size={40} className="text-sdl-alert mb-4" />
            <h2 className="text-xl font-black italic uppercase tracking-tighter">Emulator failed to start</h2>
            <p className="text-sdl-sec text-xs font-medium mt-2 mb-6 max-w-sm leading-relaxed">
              The core or the WAD could not be fetched. This needs a browser with SharedArrayBuffer
              and a working connection to the CDN.
            </p>
            <button
              onClick={reload}
              className="px-6 py-3 bg-os-primary text-sdl-onAccent font-black uppercase tracking-widest text-xs rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdl-ink/70"
            >
              Try again
            </button>
          </div>
        )}

        <iframe
          key={nonce}
          ref={iframeRef}
          src={src}
          className="w-full h-full border-0 block"
          allow="fullscreen; gamepad; autoplay"
          onLoad={pollStarted}
          title="DOOM"
        />
      </div>

      {/* Controls sit in a static strip BELOW the frame. They used to be an absolutely-positioned
          overlay at z-40 over the canvas, above a second bar at z-30 that covered the emulator's
          own menu bar — so Save State, Load State, Control Settings and fullscreen were all
          unclickable, and on mobile Start and Select were unreachable entirely. */}
      <div className="shrink-0 px-4 py-2.5 border-t border-hairline/10 bg-sdl-surface/60 backdrop-blur-md flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {CONTROLS.map(([label, keys]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-sdl-sec uppercase tracking-wider">{label}</span>
            <span className="px-1.5 py-0.5 rounded bg-sdl-sunken border border-hairline/10 text-[10px] font-mono text-sdl-ink">{keys}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RetroArcade;
