import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, Sparkles, Play } from 'lucide-react';
import useOSStore from '../../store/osStore';
import GameShell from './GameShell';
import useGameInput from '../../hooks/useGameInput';
import useGameAudio from '../../hooks/useGameAudio';
import useHighScore from '../../hooks/useHighScore';

const GRID_SIZE = 4;

/** Rotate 90° clockwise: out[c][j] === grid[N-1-j][c]. */
const rotateGrid = (grid) => grid[0].map((_, index) => grid.map(row => row[index]).reverse());

/**
 * How many clockwise rotations bring `direction` to the left edge, so one slide-left kernel can
 * serve all four directions.
 *
 * This map used to read UP:1 / RIGHT:2 / DOWN:3 — and UP and DOWN were therefore SWAPPED. After
 * one clockwise rotation the original BOTTOM edge is on the left, so `UP: 1` slid tiles down.
 * A differential test against a reference implementation put it beyond doubt: LEFT and RIGHT
 * matched on 200,000 random grids, UP and DOWN mismatched on 198,991 of 200,000 each, and
 * swapping the two took it to 0 mismatches in 800,000 moves.
 */
const ROTATIONS = { LEFT: 0, DOWN: 1, RIGHT: 2, UP: 3 };

/**
 * Pure. Returns the post-move grid (no new tile), whether anything moved, and the points gained.
 *
 * The merge kernel itself was always correct and is unchanged: the `row.length - 1` bound is
 * re-read as the row shrinks and `c` advances past the tile it just merged, so no tile can merge
 * twice in one move — the classic 2048 bug this does NOT have.
 */
function applyMove(prevGrid, direction) {
  let grid = prevGrid.map(row => [...row]);
  let moved = false;
  let addedScore = 0;

  const rotations = ROTATIONS[direction] ?? 0;
  for (let i = 0; i < rotations; i++) grid = rotateGrid(grid);

  for (let r = 0; r < GRID_SIZE; r++) {
    const original = grid[r];
    const row = original.filter(val => val !== 0);
    for (let c = 0; c < row.length - 1; c++) {
      if (row[c] === row[c + 1]) {
        row[c] *= 2;
        addedScore += row[c];
        row.splice(c + 1, 1);
      }
    }
    while (row.length < GRID_SIZE) row.push(0);
    if (original.some((v, i) => v !== row[i])) moved = true;
    grid[r] = row;
  }

  for (let i = 0; i < (4 - rotations) % 4; i++) grid = rotateGrid(grid);
  return { grid, moved, addedScore };
}

const emptyGrid = () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

/** Pure spawn — returns a new grid with one 2 (90%) or 4 placed on a random empty cell. */
function addRandomTile(currentGrid) {
  const emptyTiles = [];
  currentGrid.forEach((row, r) => {
    row.forEach((tile, c) => {
      if (tile === 0) emptyTiles.push({ r, c });
    });
  });

  if (emptyTiles.length === 0) return currentGrid;

  const { r, c } = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
  const newGrid = currentGrid.map(row => [...row]);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
}

/**
 * One opening board. Both the initial state and Restart go through here, so the two can never
 * drift apart — the previous version had a second, subtly different spawn routine inlined in the
 * useState initializer purely because `addRandomTile` was trapped inside the component.
 */
const newBoard = () => addRandomTile(addRandomTile(emptyGrid()));

function checkGameOver(currentGrid) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (currentGrid[r][c] === 0) return false;
    }
  }
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = currentGrid[r][c];
      if (r < GRID_SIZE - 1 && val === currentGrid[r + 1][c]) return false;
      if (c < GRID_SIZE - 1 && val === currentGrid[r][c + 1]) return false;
    }
  }
  return true;
}

// The ladder is three accent-family hues at rising saturation, then the top two tiers as solids.
// 1024 was `bg-white` — which is not a role, and paired with `text-sdl-onAccent` (ink measured
// against the ACCENT) it went unreadable the moment a colorway made the accent pale. Ink-on-plane
// keeps it the maximum-contrast rung it was meant to be, in both modes.
const tileColors = {
  2: 'bg-os-primary/20 text-os-primary border-os-primary/20 shadow-[0_0_15px_rgb(var(--os-primary-rgb)/0.1)]',
  4: 'bg-os-primary/30 text-os-primary border-os-primary/30 shadow-[0_0_20px_rgb(var(--os-primary-rgb)/0.2)]',
  8: 'bg-os-secondary/20 text-os-secondary border-os-secondary/20 shadow-[0_0_25px_rgb(var(--os-secondary-rgb)/0.1)]',
  16: 'bg-os-secondary/30 text-os-secondary border-os-secondary/30 shadow-[0_0_30px_rgb(var(--os-secondary-rgb)/0.2)]',
  32: 'bg-os-tertiary/20 text-os-tertiary border-os-tertiary/20 shadow-[0_0_35px_rgb(var(--os-tertiary-rgb)/0.1)]',
  64: 'bg-os-tertiary/30 text-os-tertiary border-os-tertiary/30 shadow-[0_0_40px_rgb(var(--os-tertiary-rgb)/0.2)]',
  128: 'bg-os-primary text-sdl-onAccent border-hairline/20 shadow-[0_0_30px_rgb(var(--os-primary-rgb))]',
  256: 'bg-os-secondary text-sdl-onAccent border-hairline/20 shadow-[0_0_35px_rgb(var(--os-secondary-rgb))]',
  512: 'bg-os-tertiary text-sdl-onAccent border-hairline/20 shadow-[0_0_40px_rgb(var(--os-tertiary-rgb))]',
  1024: 'bg-sdl-ink text-sdl-plane border-hairline/40 shadow-[0_0_50px_var(--sdl-glow)]',
  2048: 'bg-gradient-to-br from-os-primary via-os-secondary to-os-tertiary text-sdl-onAccent border-hairline/50 shadow-[0_0_60px_rgb(var(--os-primary-rgb))]',
};

// Board size bounds, in px. The cap is a design choice; the floor keeps a cell at ~50px so it is
// still a tap target on the narrowest window the OS allows.
const MAX_BOARD = 380;
const MIN_BOARD = 232;
const clampBoard = (px) => Math.max(MIN_BOARD, Math.min(MAX_BOARD, Math.floor(px) || MIN_BOARD));

const Game2048 = ({ onBack }) => {
  const [grid, setGrid] = useState(newBoard);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('playing');
  const [best, submitBest] = useHighScore('2048', 'max');
  const play = useGameAudio();
  // Selector rather than destructuring the whole store: this component re-renders on every move
  // and has no business also re-rendering on unrelated OS state.
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);

  // Every piece of state `move` reads is mirrored in a ref so the whole turn can be computed from
  // plain values inside the event handler. See tasks/lessons.md — the original computed the move
  // inside a `setGrid(prev => …)` updater and StrictMode's deliberate double-invocation counted
  // each move twice (one merged pair of 2s scored 8, not 4). Deferring the effects to a microtask
  // does not help, because the scheduling itself is what runs twice.
  const gridRef = useRef(grid);
  const scoreRef = useRef(0);
  const statusRef = useRef(status);
  // Reaching 2048 shows a win panel exactly once per game. Without this latch, every subsequent
  // move would re-detect the 2048 tile and yank a player who chose "keep playing" back into the
  // overlay they just dismissed.
  const celebratedRef = useRef(false);

  const boardRef = useRef(null);
  const [boardSize, setBoardSize] = useState(MAX_BOARD);

  // The board is sized off the SHELL, not the viewport. `min(78vw, 380px)` was wrong inside a
  // windowing OS: a game window is resizable down to 400px (Window.jsx `minWidth = 400`) while the
  // viewport stays 1920 wide, so 78vw pinned the board at 380px and it overflowed the window by
  // ~60px once the shell's padding was counted.
  //
  // GameShell centres us as an auto-width flex item, so measuring our own wrapper would just hand
  // back the width we last chose. The grandparent is the padded, flex-grow board area — a stretch
  // item in a column flex container, so its width comes from the window and never from us. No
  // feedback loop. Same measurement trick as Minesweeper, and the paddings are read rather than
  // hardcoded because the shell's is `p-3 md:p-5` and ours is `p-2 md:p-3`.
  useEffect(() => {
    const el = boardRef.current;
    const box = el?.parentElement?.parentElement;
    if (!el || !box || typeof ResizeObserver === 'undefined') return undefined;

    const read = () => {
      const outer = getComputedStyle(box);
      const inner = getComputedStyle(el);
      const px = (s) => parseFloat(s) || 0;
      const padX = px(outer.paddingLeft) + px(outer.paddingRight) + px(inner.paddingLeft) + px(inner.paddingRight);
      const padY = px(outer.paddingTop) + px(outer.paddingBottom) + px(inner.paddingTop) + px(inner.paddingBottom);
      // Bounded on BOTH axes. The board is square, so sizing it off width alone lets it outgrow a
      // short window, which raises a vertical scrollbar, which narrows `clientWidth`, which
      // reshrinks the board — a ResizeObserver oscillation. Fitting both axes means no scrollbar
      // ever appears, and the MIN_BOARD floor makes the value idempotent if one somehow does.
      setBoardSize(clampBoard(Math.min(box.clientWidth - padX, box.clientHeight - padY)));
    };

    const ro = new ResizeObserver(read);
    ro.observe(box);
    read();
    return () => ro.disconnect();
  }, []);

  // Any button that ends a phase lives either inside GameShell's overlay (and unmounts on click,
  // dropping focus to <body>) or in GameShell's toolbar (which is outside the board's key handler).
  // Either way the arrow keys go dead, because the shell focuses the board on mount only and
  // useGameInput is DOM-scoped to that element. Hand focus back explicitly.
  const focusBoard = useCallback(() => {
    boardRef.current?.closest('[role="application"]')?.focus();
  }, []);

  // The single writer for the phase, so the ref the handler reads can never lag the rendered
  // status. Only ever called from an event handler or the loop — never from a state updater.
  const setPhase = useCallback((next) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const initGame = useCallback(() => {
    const fresh = newBoard();
    gridRef.current = fresh;
    setGrid(fresh);
    scoreRef.current = 0;
    setScore(0);
    celebratedRef.current = false;
    setPhase('playing');
    focusBoard();
  }, [setPhase, focusBoard]);

  /**
   * Runs entirely in the event handler — there is no state-updater function anywhere in here, and
   * nothing below may move into one.
   */
  const move = useCallback((direction) => {
    if (statusRef.current !== 'playing') return;

    const { grid: movedGrid, moved, addedScore } = applyMove(gridRef.current, direction);
    if (!moved) return;

    const nextGrid = addRandomTile(movedGrid);
    gridRef.current = nextGrid;
    setGrid(nextGrid);

    const newScore = scoreRef.current + addedScore;
    scoreRef.current = newScore;
    setScore(newScore);
    submitBest(newScore);

    // One voice per turn. A merge is also a slide, so playing both would stack two oscillators on
    // the same gesture and just sound like a click.
    play(addedScore > 0 ? 'merge' : 'move');

    // Was `addedScore >= 2048`, which fires on any single move that merges 2048 points' worth of
    // tiles — four pairs of 256s would do it. The achievement says "reached the 2048 tile", so
    // test the board for one.
    const reached2048 = nextGrid.some(row => row.some(v => v >= 2048));
    if (reached2048) unlockAchievement('2048_master');

    if (checkGameOver(nextGrid)) {
      play('lose');
      setPhase('over');
    } else if (reached2048 && !celebratedRef.current) {
      celebratedRef.current = true;
      play('win');
      setPhase('won');
    }
  }, [play, submitBest, unlockAchievement, setPhase]);

  // Input is DOM-scoped through the board element rather than bound to `window`. App.jsx keeps
  // minimized windows mounted, so a window listener meant a minimized 2048 kept swallowing every
  // arrow key in the OS and shuffling its own hidden grid.
  const inputProps = useGameInput(move, { enabled: status === 'playing' });

  const keepPlaying = useCallback(() => {
    setPhase('playing');
    focusBoard();
  }, [setPhase, focusBoard]);

  const overlay = status === 'won' ? (
    <>
      <Sparkles size={48} className="text-os-secondary mb-4 drop-shadow-[0_0_20px_var(--sdl-glow)]" />
      <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter mb-1">2048 Reached</h2>
      <p className="text-os-secondary font-black tracking-[0.3em] uppercase text-[10px] mb-6">Score {score}</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={keepPlaying}
          className="flex items-center gap-2 px-6 py-3 bg-os-secondary text-sdl-onAccent font-black uppercase tracking-widest text-xs rounded-2xl shadow-[var(--sdl-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
        >
          <Play size={16} />
          Keep playing
        </button>
        <button
          onClick={initGame}
          className="flex items-center gap-2 px-6 py-3 bg-sdl-sunken border border-hairline/10 text-sdl-sec hover:text-sdl-ink font-black uppercase tracking-widest text-xs rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
        >
          <RefreshCw size={16} />
          New game
        </button>
      </div>
    </>
  ) : (
    <>
      <Trophy size={48} className="text-os-secondary mb-4 drop-shadow-[0_0_20px_var(--sdl-glow)]" />
      <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter mb-1">No moves left</h2>
      <p className="text-os-secondary font-black tracking-[0.3em] uppercase text-[10px] mb-6">Score {score}</p>
      <button
        onClick={initGame}
        className="flex items-center gap-2 px-6 py-3 bg-os-secondary text-sdl-onAccent font-black uppercase tracking-widest text-xs rounded-2xl shadow-[var(--sdl-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
      >
        <RefreshCw size={16} />
        Play again
      </button>
    </>
  );

  return (
    <GameShell
      gameId="2048"
      onBack={onBack}
      score={score}
      best={best}
      status={status}
      onRestart={initGame}
      boardProps={inputProps}
      overlay={overlay}
    >
      {/* No onTogglePause: 2048 is turn-based, so there is nothing running to pause — a pause
          button here would be a control that does nothing. */}
      <div
        ref={boardRef}
        className="relative p-2 md:p-3 bg-veil/[0.03] border border-hairline/5 rounded-[2rem] backdrop-blur-xl shadow-[var(--sdl-lift)] overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-veil/[0.05] to-transparent pointer-events-none" />

        {/* Square, and measured off the shell's board area — see the ResizeObserver above. */}
        <div
          className="grid grid-cols-4 gap-2 md:gap-3 relative z-10"
          style={{ width: boardSize, height: boardSize }}
        >
          {grid.flat().map((tile, i) => (
            <div key={i} className="bg-sdl-sunken rounded-[1rem] border border-hairline/5 relative overflow-hidden h-full w-full">
              <AnimatePresence mode="popLayout">
                {tile !== 0 && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    key={`tile-${i}-${tile}`}
                    // Four-digit values get a smaller step so 1024 and 2048 still fit inside a
                    // cell on a 375px-wide phone, where a cell is only about 65px across.
                    className={`absolute inset-0 flex items-center justify-center font-black tabular-nums rounded-[1rem] border transition-all duration-300 ${
                      tile >= 1024 ? 'text-base md:text-2xl' : 'text-xl md:text-3xl'
                    } ${tileColors[tile] || 'bg-sdl-sunken text-sdl-ink border-hairline/10'}`}
                  >
                    {tile}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </GameShell>
  );
};

export default Game2048;
