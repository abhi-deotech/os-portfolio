import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy, Skull, RefreshCw } from 'lucide-react';
import GameShell from './GameShell';
import useGameLoop from '../../hooks/useGameLoop';
import useGameInput from '../../hooks/useGameInput';
import useGameAudio from '../../hooks/useGameAudio';
import useHighScore from '../../hooks/useHighScore';
import useOSStore from '../../store/osStore';

const GRID = 20;
const CELLS = GRID * GRID;
const FOOD_POINTS = 10;
const PRO_SCORE = 100;

// 140ms is a readable crawl at three segments; 60ms is about as fast as a 20-cell board can be
// steered without the input feeling like a coin flip. One step off the top per four foods eaten.
const START_MS = 140;
const MIN_MS = 60;
const SPEEDUP_EVERY = 4 * FOOD_POINTS;

const OPPOSITE = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
const DELTA = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };

// One integer per cell rather than an `${x},${y}` string. The occupancy Set is copied once per
// tick and probed twice, and integers keep both cheap enough that collision stays O(1) even when
// the snake is 399 segments long and about to win.
const cellKey = (x, y) => y * GRID + x;

/**
 * Pick a free cell for the next food.
 *
 * The old implementation was `while (true)` rejection sampling: guess a cell, retry if occupied.
 * That has no upper bound on iterations and literally cannot terminate once the snake covers every
 * cell — the reward for playing perfectly was a frozen tab. Enumerating the free cells is O(400)
 * once per food, which is nothing, and it can answer the question rejection sampling could not:
 * null means the board is full, which is a WIN and not a hang.
 */
function pickFood(occupied) {
  const free = [];
  for (let i = 0; i < CELLS; i++) if (!occupied.has(i)) free.push(i);
  if (free.length === 0) return null;
  const i = free[Math.floor(Math.random() * free.length)];
  return { x: i % GRID, y: Math.floor(i / GRID) };
}

function createGame() {
  const snake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
  const occupied = new Set(snake.map((s) => cellKey(s.x, s.y)));
  return {
    snake,
    occupied,
    food: pickFood(occupied),
    // `dir` is the direction the last tick CONSUMED; `pending` is what the player has asked for
    // since. Keeping them apart is what makes the reversal guard correct — see `steer`.
    dir: 'UP',
    pending: 'UP',
    score: 0,
    status: 'idle',
    ate: false,
  };
}

/**
 * Advance the simulation exactly one tick. Pure: same input, same shape of output, no React, no
 * audio, no storage, nothing mutated in place — the caller reads the returned state and decides
 * what that means.
 *
 * The version this replaces spread its state across four `useState` hooks and set the "did we eat"
 * flag inside a `setFood` updater NESTED in a `setSnake` updater, then read the flag on the very
 * next line. That only ever worked because React sometimes evaluates an updater eagerly. When it
 * doesn't, the updater is merely queued, the flag is still false when read, the tail gets popped,
 * and the snake eats and scores without growing. Growth is a rule of the game; it cannot be
 * contingent on an undocumented scheduler optimization. Here eating, growing and scoring are three
 * lines of one function that either all happen or none do.
 */
function step(state) {
  const dir = state.pending;
  const [dx, dy] = DELTA[dir];
  const head = { x: state.snake[0].x + dx, y: state.snake[0].y + dy };

  // Walls kill. No wrap-around — the board edge is the whole difficulty curve of the early game.
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
    return { ...state, dir, status: 'over', ate: false };
  }

  const k = cellKey(head.x, head.y);
  const ate = state.food !== null && k === cellKey(state.food.x, state.food.y);

  const tail = state.snake[state.snake.length - 1];
  const tailK = cellKey(tail.x, tail.y);

  // The tail tip vacates on this same tick unless the snake is eating, so it is not an obstacle.
  // Testing the head against the full previous body — as the old code did — made chasing your own
  // tail an instant, inexplicable game over on a move that is legal in every Snake ever shipped.
  if (state.occupied.has(k) && !(!ate && k === tailK)) {
    return { ...state, dir, status: 'over', ate: false };
  }

  const snake = [head, ...(ate ? state.snake : state.snake.slice(0, -1))];
  const occupied = new Set(state.occupied);
  // ORDER MATTERS. Vacate the tail BEFORE claiming the head. The reverse order is silently wrong
  // on exactly the move the tail exemption above exists to allow: when the head lands on the
  // vacating tail cell, `k === tailK`, so adding the head and then deleting the tail deletes the
  // HEAD. `occupied` loses a cell it should hold and never gets it back — the hole persists,
  // because the later delete of that cell as it becomes the tail is a no-op on a Set that no
  // longer has it. Fuzzing 238k ticks found 2,934 desynced states: undetected self-collisions
  // (the snake drives straight through its own body), food spawning inside the snake, and
  // duplicate `cellKey` React keys from two segments occupying one cell.
  if (!ate) occupied.delete(tailK);
  occupied.add(k);

  if (!ate) return { ...state, snake, occupied, dir, status: 'playing', ate: false };

  const food = pickFood(occupied);
  return {
    ...state,
    snake,
    occupied,
    dir,
    food,
    score: state.score + FOOD_POINTS,
    // No free cell left means the snake is the board. That is the win condition, and it is the
    // same branch that used to be an infinite loop.
    status: food === null ? 'won' : 'playing',
    ate: true,
  };
}

const CELL_PCT = 100 / GRID;
// Sized off the viewport rather than a fixed 420px so the board never overflows a 375px phone,
// and off vh too so a short window doesn't push it under the fold.
//
// `vw`/`vh` measure the VIEWPORT, not the window this game is rendered inside, and Window.jsx sets
// `resize: both` with `minWidth: 400`. Drag Snake down to 400px on a desktop and 85vw is still
// enormous, so the term that actually binds is the 420px cap — 40px wider than the board area,
// which pushed a scrollbar into GameShell's `overflow-auto` container. `maxWidth: 100%` adds the
// missing term (the space actually available), and `aspectRatio` keeps the board square when that
// term is the one that wins — a fixed `height: BOARD` next to a clamped width would have stretched
// every percentage-positioned cell into a rectangle.
const BOARD = 'min(85vw, 60vh, 420px)';
const BOARD_STYLE = { width: BOARD, maxWidth: '100%', aspectRatio: '1 / 1' };

const Snake = ({ onBack }) => {
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);
  const activeWindow = useOSStore((s) => s.activeWindow);
  const play = useGameAudio();
  const [best, submit] = useHighScore('snake');

  // The authoritative game state is the ref; `view` is the copy React renders. Every mutation goes
  // through `commit` from an event handler or the loop callback — never from inside a state
  // updater, which StrictMode invokes twice (see tasks/lessons.md).
  const [view, setView] = useState(createGame);
  const gameRef = useRef(view);

  const commit = useCallback((next) => {
    gameRef.current = next;
    setView(next);
  }, []);

  const tick = useCallback(() => {
    const prev = gameRef.current;
    if (prev.status !== 'playing') return;

    const next = step(prev);
    commit(next);

    // Every side effect below lives here, in the loop callback, reading a value `step` already
    // finished computing. rAF calls this once per tick even under StrictMode.
    if (next.ate && next.status === 'playing') play('eat');
    if (prev.score < PRO_SCORE && next.score >= PRO_SCORE) unlockAchievement('snake_pro');
    if (next.status === 'over' || next.status === 'won') {
      play(next.status === 'won' ? 'win' : 'lose');
      submit(next.score);
    }
  }, [commit, play, submit, unlockAchievement]);

  const stepMs = Math.max(MIN_MS, START_MS - Math.floor(view.score / SPEEDUP_EVERY) * 10);
  useGameLoop(tick, stepMs, view.status === 'playing');

  const steer = useCallback((next) => {
    const g = gameRef.current;
    if (g.status !== 'idle' && g.status !== 'playing') return;

    // Compared against the direction the last tick CONSUMED, not against `pending`. Two taps
    // between one pair of ticks — right then down while travelling up — would otherwise leave
    // `pending` at DOWN, and the next tick would drive the head straight through the neck.
    const pending = OPPOSITE[next] === g.dir ? g.pending : next;
    // A key that changes nothing must not re-render the board 400 cells at a time.
    if (pending === g.pending && g.status === 'playing') return;
    commit({ ...g, pending, status: 'playing' });
  }, [commit]);

  const togglePause = useCallback(() => {
    const g = gameRef.current;
    if (g.status === 'playing') commit({ ...g, status: 'paused' });
    else if (g.status === 'paused') commit({ ...g, status: 'playing' });
  }, [commit]);

  const restart = useCallback(() => commit(createGame()), [commit]);

  // Clicking another window used to leave the snake running behind it, so players came back to a
  // corpse and a score they never saw earned. Pausing is not automatic on the way back: a board
  // that resumes moving the instant it regains focus kills you before you have looked at it.
  useEffect(() => {
    if (activeWindow === 'snake') return;
    const g = gameRef.current;
    if (g.status === 'playing') commit({ ...g, status: 'paused' });
  }, [activeWindow, commit]);

  const inputProps = useGameInput(steer, { onPause: togglePause });

  const won = view.status === 'won';
  const overlay = (
    <>
      {won
        ? <Trophy size={44} className="text-os-secondary mb-3" />
        : <Skull size={44} className="text-sdl-alert mb-3" />}
      <h2 className="text-2xl font-black italic uppercase tracking-tighter">
        {won ? 'Board cleared' : 'Game over'}
      </h2>
      <p className="text-sdl-sec text-[10px] font-black uppercase tracking-[0.25em] mt-2">
        {won
          ? `Every cell, ${view.score} points`
          : `${view.snake.length} long · ${view.score} points`}
      </p>
      <button
        onClick={restart}
        // Keyboard focus must not land on this button. It lives inside GameShell's focusable board,
        // and restarting unmounts it — so a mouse click that focused it first leaves focus on a
        // node that no longer exists, focus falls back to <body>, and the board's onKeyDown (the
        // ONLY keydown binding; there is no window listener by design) stops receiving arrows. The
        // player gets a fresh board that ignores every key until they click it. GameShell focuses
        // the board on mount and never again, and this file must not reach into its ref, so the
        // fix is to never take focus away: mousedown's default action IS the focus, and the click
        // still fires without it.
        onMouseDown={(e) => e.preventDefault()}
        className="mt-6 flex items-center gap-2 px-6 py-3 bg-os-primary text-sdl-onAccent font-black uppercase tracking-widest text-xs rounded-2xl shadow-[var(--sdl-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
      >
        <RefreshCw size={16} />
        Play again
      </button>
    </>
  );

  return (
    <GameShell
      gameId="snake"
      onBack={onBack}
      score={view.score}
      best={best}
      status={view.status}
      onRestart={restart}
      onTogglePause={togglePause}
      boardProps={inputProps}
      overlay={overlay}
      headerExtra={
        <div className="text-right hidden sm:block">
          <p className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em] leading-none">Length</p>
          <p className="text-lg md:text-xl font-black tabular-nums leading-tight text-os-tertiary">{view.snake.length}</p>
        </div>
      }
    >
      <div
        className="relative rounded-[2rem] bg-sdl-sunken border border-hairline/10 overflow-hidden shadow-[var(--sdl-lift)]"
        style={BOARD_STYLE}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgb(var(--sdl-hairline-rgb) / 0.05) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgb(var(--sdl-hairline-rgb) / 0.05) 1px, transparent 1px)',
            backgroundSize: `${CELL_PCT}% ${CELL_PCT}%`,
          }}
        />

        {view.food && (
          <div
            className="absolute"
            style={{
              left: `${view.food.x * CELL_PCT}%`,
              top: `${view.food.y * CELL_PCT}%`,
              width: `${CELL_PCT}%`,
              height: `${CELL_PCT}%`,
            }}
          >
            <div className="absolute inset-[14%] rounded-full bg-os-secondary shadow-[0_0_16px_rgb(var(--os-secondary-rgb)/0.7)] animate-pulse" />
          </div>
        )}

        {/* Keyed by CELL, not by array index. A tick adds one cell at the head and drops one at the
            tail, so React mounts one node and unmounts one node instead of rewriting all 400 —
            which is what keeps the board honest at the 60ms floor. */}
        {view.snake.map((seg, i) => {
          const head = i === 0;
          return (
            <div
              key={cellKey(seg.x, seg.y)}
              className="absolute"
              style={{
                left: `${seg.x * CELL_PCT}%`,
                top: `${seg.y * CELL_PCT}%`,
                width: `${CELL_PCT}%`,
                height: `${CELL_PCT}%`,
              }}
            >
              <div
                className={
                  head
                    ? 'absolute inset-[6%] rounded-[35%] bg-os-primary shadow-[0_0_14px_rgb(var(--os-primary-rgb)/0.75)]'
                    : 'absolute inset-[12%] rounded-[30%] bg-os-primary/50'
                }
                // The taper reads as a direction of travel, which matters when the snake is long
                // enough that the head is off in a corner somewhere.
                style={head ? undefined : { opacity: 1 - Math.min(0.5, (i / view.snake.length) * 0.6) }}
              />
            </div>
          );
        })}

        {view.status === 'idle' && (
          <div className="absolute inset-0 z-20 flex items-end justify-center p-5 pointer-events-none">
            <p className="px-4 py-2 rounded-2xl bg-sdl-surface/90 border border-hairline/10 text-[10px] font-black uppercase tracking-[0.2em] text-sdl-sec text-center">
              Arrow keys or swipe to start
            </p>
          </div>
        )}
      </div>
    </GameShell>
  );
};

export default Snake;
