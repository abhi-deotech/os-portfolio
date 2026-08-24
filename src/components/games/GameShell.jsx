import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Pause, Play, Volume2, VolumeX, HelpCircle, Trophy } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { GAME_BY_ID } from '../../config/games';

/**
 * The chrome every game shares: title, score/best readouts, pause, restart, mute, how-to-play,
 * exit — and the focusable board element that scopes keyboard input.
 *
 * Before this, each of the five games re-implemented its own header, its own back button and its
 * own overlay markup, and none of them had pause, sound or a how-to-play. The controls text comes
 * from the registry entry, so the on-screen instructions cannot drift from the keys the game
 * actually binds (which is exactly how the old emulator overlay ended up advertising WASD, Space
 * and Escape when none of the three were bound).
 *
 * `children` receives nothing; the game renders its own board inside. The shell owns the frame.
 */
const GameShell = ({
  gameId,
  onBack,
  score,
  best,
  bestLabel = 'Best',
  scoreLabel = 'Score',
  status,            // 'idle' | 'playing' | 'paused' | 'over' | 'won'
  onRestart,
  onTogglePause,
  boardProps = {},   // spread onto the focusable board wrapper (from useGameInput)
  overlay,           // game-over / win content
  headerExtra,
  children,
}) => {
  const game = GAME_BY_ID[gameId];
  const soundEnabled = useOSStore((s) => s.soundEnabled);
  const setSoundEnabled = useOSStore((s) => s.setSoundEnabled);
  const [showHelp, setShowHelp] = useState(false);
  const boardRef = useRef(null);

  // Focus on mount so the game is playable immediately. Without this a player has to click the
  // board first, which reads as "the keys don't work".
  useEffect(() => { boardRef.current?.focus(); }, []);

  const canPause = status === 'playing' || status === 'paused';

  return (
    <div className="h-full w-full bg-sdl-plane text-sdl-ink flex flex-col relative overflow-hidden select-none font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(var(--sdl-accent-rgb)/0.06)_0%,transparent_60%)] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 shrink-0 px-4 md:px-6 py-3 flex items-center justify-between gap-3 border-b border-hairline/10">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            aria-label="Back to Game Center"
            className="p-2 rounded-xl bg-sdl-sunken border border-hairline/10 hover:bg-veil/10 transition-all text-sdl-sec hover:text-sdl-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display font-black text-base md:text-lg tracking-tight truncate">
            {game?.title ?? gameId}
          </h1>
        </div>

        <div className="flex items-center gap-3 md:gap-5 shrink-0">
          {headerExtra}
          <div className="text-right">
            <p className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em] leading-none">{scoreLabel}</p>
            <p className="text-lg md:text-xl font-black tabular-nums leading-tight text-os-primary">{score}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em] leading-none">{bestLabel}</p>
            <p className="text-lg md:text-xl font-black tabular-nums leading-tight text-sdl-sec">{best ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="relative z-10 shrink-0 px-4 md:px-6 py-2 flex items-center gap-2 border-b border-hairline/10">
        <ToolButton onClick={onRestart} label="Restart" icon={RefreshCw} />
        {onTogglePause && (
          <ToolButton
            onClick={onTogglePause}
            label={status === 'paused' ? 'Resume' : 'Pause'}
            icon={status === 'paused' ? Play : Pause}
            disabled={!canPause}
          />
        )}
        <ToolButton
          onClick={() => setSoundEnabled(!soundEnabled)}
          label={soundEnabled ? 'Mute' : 'Unmute'}
          icon={soundEnabled ? Volume2 : VolumeX}
        />
        <ToolButton onClick={() => setShowHelp((v) => !v)} label="How to play" icon={HelpCircle} active={showHelp} />
        <div className="ml-auto text-[10px] font-bold text-sdl-sec hidden sm:block">
          {game?.controls?.desc}
        </div>
      </div>

      {/* Board */}
      <div className="relative z-10 flex-grow min-h-0 flex items-center justify-center p-3 md:p-5 overflow-auto">
        <div
          ref={boardRef}
          tabIndex={0}
          role="application"
          aria-label={`${game?.title ?? gameId} board. ${game?.controls?.desc ?? ''}`}
          {...boardProps}
          className="relative outline-none touch-none max-w-full"
        >
          {children}

          {/* Overlays live INSIDE the board wrapper and absolutely positioned, so they cannot be
              clipped by an ancestor's overflow — Memory's win panel used to be normal flow inside
              an `overflow-hidden` container and vanished entirely at the default window size. */}
          <AnimatePresence>
            {status === 'paused' && (
              <Veil key="paused">
                <Pause size={40} className="text-os-primary mb-3" />
                <h2 className="text-xl font-black italic uppercase tracking-tighter">Paused</h2>
                <p className="text-sdl-sec text-[10px] font-black uppercase tracking-[0.25em] mt-2">
                  Space or Escape to resume
                </p>
              </Veil>
            )}
            {(status === 'over' || status === 'won') && overlay && (
              <Veil key="end">{overlay}</Veil>
            )}
            {showHelp && (
              <Veil key="help" onClick={() => setShowHelp(false)}>
                <Trophy size={32} className="text-os-secondary mb-3" />
                <h2 className="text-lg font-black uppercase tracking-tight mb-2">How to play</h2>
                <p className="text-sdl-sec text-sm max-w-xs leading-relaxed">{game?.controls?.desc}</p>
                {game?.controls?.keys?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                    {game.controls.keys.map((k) => (
                      <span key={k} className="px-2 py-1 rounded-lg bg-sdl-sunken border border-hairline/10 text-xs font-mono">{k}</span>
                    ))}
                  </div>
                )}
                <p className="text-sdl-sec/60 text-[10px] mt-5 uppercase tracking-widest font-bold">Click to dismiss</p>
              </Veil>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const Veil = ({ children, onClick }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClick}
    className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center p-6 bg-scrim backdrop-blur-xl rounded-[2rem] border border-hairline/10"
  >
    {children}
  </motion.div>
);

const ToolButton = ({ onClick, label, icon: Icon, disabled, active }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`p-2 rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 disabled:opacity-30 disabled:cursor-not-allowed ${
      active
        ? 'bg-os-primary/20 border-os-primary/40 text-os-primary'
        : 'bg-sdl-sunken border-hairline/10 text-sdl-sec hover:text-sdl-ink hover:bg-veil/10'
    }`}
  >
    <Icon size={16} />
  </button>
);

export default GameShell;
