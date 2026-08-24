import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bomb, Flag, Trophy, X } from 'lucide-react';
import GameShell from './GameShell';
import useGameInput from '../../hooks/useGameInput';
import useGameAudio from '../../hooks/useGameAudio';
import useHighScore from '../../hooks/useHighScore';

const DIFFICULTIES = {
  beginner: { label: 'Beginner', rows: 9, cols: 9, mines: 10, maxCell: 40 },
  intermediate: { label: 'Intermediate', rows: 16, cols: 16, mines: 40, maxCell: 34 },
  expert: { label: 'Expert', rows: 16, cols: 30, mines: 99, maxCell: 30 },
};

const HIDDEN = 0;
const REVEALED = 1;
const FLAGGED = 2;

const GAP = 2;
// 18px is the floor a thumb can still hit. Expert is 30 columns wide, so on a 375px phone the
// board simply becomes wider than the viewport and scrolls sideways inside its own scroller —
// shrinking cells to ~11px to make it "fit" would make it unplayable rather than responsive.
const MIN_CELL = 18;
// How far a finger may travel before the gesture is a pan rather than a press. Below this, hand
// tremor during a long-press would cancel the flag; above it, a deliberate drag would still flag.
const DRAG_SLOP = 10;
const LONG_PRESS_MS = 420;

/**
 * The classic 1–8 palette is hardcoded blue/green/red/navy/…, which is exactly the kind of
 * off-theme colour this app spent a whole migration removing. These are SDL roles instead, so the
 * numbers re-tint with the active colorway. Six roles cannot separate eight digits, so `warn` and
 * `done` join the set — the digits only have to be mutually distinguishable, not semantic.
 */
const NUMBER_TONE = [
  '',
  'text-os-primary',
  'text-os-secondary',
  'text-sdl-alert',
  'text-os-tertiary',
  'text-sdl-warn',
  'text-sdl-done',
  'text-sdl-ink',
  'text-sdl-sec',
];

const createBoard = (key) => {
  const { rows, cols, mines } = DIFFICULTIES[key];
  const n = rows * cols;
  return {
    key,
    rows,
    cols,
    mines,
    mine: new Uint8Array(n),
    adj: new Uint8Array(n),
    cell: new Uint8Array(n),
    seeded: false,
    exploded: -1,
    revealedCount: 0,
  };
};

const cloneBoard = (b) => ({ ...b, mine: b.mine.slice(), adj: b.adj.slice(), cell: b.cell.slice() });

const neighbours = (b, i) => {
  const r = (i / b.cols) | 0;
  const c = i % b.cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= b.rows || nc >= b.cols) continue;
      out.push(nr * b.cols + nc);
    }
  }
  return out;
};

/**
 * Mines are laid AFTER the first click, with that cell and its eight neighbours excluded. Two
 * things fall out of it: the opening click can never lose, and because the safe cell is guaranteed
 * to have zero adjacent mines it always cascades into a region instead of a lone "1". Seeding up
 * front and re-rolling until the click happens to be safe gives a legal board but a miserable
 * opening — half the games start on a single isolated digit.
 *
 * Fisher-Yates, not `sort(() => Math.random() - 0.5)`: the comparator shuffle is measurably biased
 * (31% vs 19% on the slots at the ends), which on a mine field means mines clustering by index.
 */
const seedMines = (b, safeIndex) => {
  const safe = new Set(neighbours(b, safeIndex));
  safe.add(safeIndex);

  const pool = [];
  for (let i = 0; i < b.cell.length; i++) if (!safe.has(i)) pool.push(i);

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }

  const count = Math.min(b.mines, pool.length);
  for (let k = 0; k < count; k++) b.mine[pool[k]] = 1;

  for (let i = 0; i < b.cell.length; i++) {
    if (b.mine[i]) continue;
    let n = 0;
    for (const j of neighbours(b, i)) if (b.mine[j]) n++;
    b.adj[i] = n;
  }
  b.seeded = true;
};

/**
 * Iterative flood fill. A 16x30 board with a wide open region can nest ~470 deep, and a recursive
 * reveal is one engine's stack limit away from taking the window down mid-game. Flagged cells are
 * not HIDDEN, so they block the fill for free — which is also the correct rule.
 */
const floodReveal = (b, start) => {
  const stack = [start];
  while (stack.length) {
    const i = stack.pop();
    if (b.cell[i] !== HIDDEN) continue;
    b.cell[i] = REVEALED;
    b.revealedCount++;
    if (b.mine[i] || b.adj[i] !== 0) continue;
    for (const j of neighbours(b, i)) if (b.cell[j] === HIDDEN) stack.push(j);
  }
};

const isCleared = (b) => b.revealedCount === b.cell.length - b.mines;

// The keyboard cursor starts in the middle: the centre of a fresh board is the statistically
// kindest opening square, and on Expert it also parks the horizontal scroller mid-field.
const centerIndex = (b) => ((b.rows / 2) | 0) * b.cols + ((b.cols / 2) | 0);

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const Minesweeper = ({ onBack }) => {
  const [difficulty, setDifficulty] = useState('beginner');
  const [board, setBoard] = useState(() => createBoard('beginner'));
  const [status, setStatus] = useState('idle');
  const [cursor, setCursor] = useState(() => centerIndex(DIFFICULTIES.beginner));
  const [elapsed, setElapsed] = useState(0);
  const [isRecord, setIsRecord] = useState(false);
  const [avail, setAvail] = useState(320);

  // Everything a handler needs to READ is mirrored in a ref. The rule this repo learned the hard
  // way (tasks/lessons.md) is that nothing may compute or fire a side effect from inside a
  // `setX(prev => …)` updater, because StrictMode invokes updaters twice — so reveals would seed
  // two different mine layouts and the timer would submit twice. Handlers run once; refs let them.
  const boardRef = useRef(board);
  const statusRef = useRef(status);
  const cursorRef = useRef(centerIndex(DIFFICULTIES.beginner));
  const clockRef = useRef({ accum: 0, since: null });
  // One record for the whole touch gesture: the long-press timer, whether that timer already
  // flagged, whether the finger turned the press into a pan, and where the pan started from.
  const gesture = useRef({ timer: null, flagged: false, dragged: false, panning: false, x: 0, y: 0, left: 0 });
  const rootRef = useRef(null);
  const scrollerRef = useRef(null);

  const play = useGameAudio();
  // One key for all three difficulties: useHighScore snapshots its storage key on first render, so
  // a per-difficulty key would stop refreshing the moment the picker changed. The board size is
  // part of the run, not part of the record — the readout is simply the fastest clear so far.
  const [best, submitBest] = useHighScore('minesweeper', 'min');

  const { rows, cols, maxCell } = DIFFICULTIES[difficulty];

  const commit = useCallback((b) => {
    boardRef.current = b;
    setBoard(b);
  }, []);

  const setPhase = useCallback((s) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const readClock = useCallback(() => {
    const { accum, since } = clockRef.current;
    return Math.floor((accum + (since != null ? performance.now() - since : 0)) / 1000);
  }, []);

  const stopClock = useCallback(() => {
    const { accum, since } = clockRef.current;
    const total = accum + (since != null ? performance.now() - since : 0);
    clockRef.current = { accum: total, since: null };
    return Math.floor(total / 1000);
  }, []);

  useEffect(() => {
    if (status !== 'playing') return undefined;
    // Sampled at 250ms rather than 1000ms so the readout never sits a whole second behind the
    // wall clock it is derived from; the value itself is always recomputed from timestamps, so a
    // throttled background tab cannot drift the recorded time.
    const id = setInterval(() => setElapsed(readClock()), 250);
    return () => clearInterval(id);
  }, [status, readClock]);

  useEffect(() => () => clearTimeout(gesture.current.timer), []);

  // GameShell centres the board as an auto-width flex item, so measuring our own wrapper would
  // just hand back the width we last chose. Its grandparent is the padded, flex-grow board area —
  // that is the real budget, and it is sized by the window, not by us, so there is no feedback loop.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const box = el.parentElement?.parentElement ?? el.parentElement;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    // clientWidth INCLUDES the element's own padding, and that box is `p-3 md:p-5`. Taking it raw
    // over-reports the usable width by 24px on a phone and 40px on desktop, which is why the
    // scroller — max-width'd from this number — hung out past the pane and put a second horizontal
    // scrollbar on the board area at every difficulty, Beginner included.
    const measure = () => {
      const cs = window.getComputedStyle(box);
      const inner = box.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      setAvail(inner > 0 ? inner : 320);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    measure();
    return () => ro.disconnect();
  }, []);

  const cellSize = useMemo(() => {
    const raw = Math.floor((avail - 24 - GAP * (cols - 1)) / cols);
    return Math.max(MIN_CELL, Math.min(maxCell, raw));
  }, [avail, cols, maxCell]);

  // Keep the keyboard cursor in view on Expert, by nudging the board's own scroller only. A
  // scrollIntoView() here would walk every scrollable ancestor and yank the whole window instead.
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const x = (cursor % cols) * (cellSize + GAP);
    if (x < sc.scrollLeft) sc.scrollLeft = x;
    else if (x + cellSize > sc.scrollLeft + sc.clientWidth) sc.scrollLeft = x + cellSize - sc.clientWidth;
  }, [cursor, cols, cellSize]);

  const flagsPlaced = useMemo(() => {
    let n = 0;
    for (let i = 0; i < board.cell.length; i++) if (board.cell[i] === FLAGGED) n++;
    return n;
  }, [board]);

  const reset = useCallback((key) => {
    clearTimeout(gesture.current.timer);
    gesture.current = { timer: null, flagged: false, dragged: false, panning: false, x: 0, y: 0, left: 0 };
    clockRef.current = { accum: 0, since: null };
    const b = createBoard(key);
    commit(b);
    setPhase('idle');
    setElapsed(0);
    setIsRecord(false);
    const middle = centerIndex(b);
    cursorRef.current = middle;
    setCursor(middle);
  }, [commit, setPhase]);

  const restart = useCallback(() => reset(difficulty), [reset, difficulty]);

  const changeDifficulty = useCallback((key) => {
    setDifficulty(key);
    reset(key);
    // The picker sits in GameShell's header, outside the focusable board, and keyboard input is
    // DOM-scoped to that board. Leaving focus on the <select> means the next arrow key picks a
    // different difficulty instead of moving the cursor, and Enter/F do nothing at all — the game
    // reads as "the keys stopped working" the moment you touch the dropdown.
    rootRef.current?.closest('[role="application"]')?.focus({ preventScroll: true });
  }, [reset]);

  const endLoss = useCallback((b, hit) => {
    b.exploded = hit;
    for (let i = 0; i < b.cell.length; i++) {
      if (b.mine[i] && b.cell[i] === HIDDEN) b.cell[i] = REVEALED;
    }
    stopClock();
    commit(b);
    setPhase('over');
    play('lose');
  }, [commit, setPhase, play, stopClock]);

  const endWin = useCallback((b) => {
    // Flagging the leftovers is cosmetic, but a board that ends with mines still showing as blank
    // covered squares reads as unfinished.
    for (let i = 0; i < b.cell.length; i++) if (b.mine[i]) b.cell[i] = FLAGGED;
    const seconds = stopClock();
    commit(b);
    setPhase('won');
    setElapsed(seconds);
    setIsRecord(submitBest(seconds));
    play('win');
  }, [commit, setPhase, play, stopClock, submitBest]);

  const revealAt = useCallback((idx) => {
    const phase = statusRef.current;
    if (phase !== 'idle' && phase !== 'playing') return;
    const cur = boardRef.current;
    if (idx < 0 || idx >= cur.cell.length) return;
    if (cur.cell[idx] === FLAGGED) return;

    const b = cloneBoard(cur);

    if (b.cell[idx] === REVEALED) {
      // Chording. Anyone who has played this expects a satisfied number to open its neighbours;
      // without it Expert is an exercise in clicking rather than in deduction.
      if (b.adj[idx] === 0) return;
      const around = neighbours(b, idx);
      let flags = 0;
      for (const j of around) if (b.cell[j] === FLAGGED) flags++;
      if (flags !== b.adj[idx]) return;

      let hit = -1;
      let opened = 0;
      for (const j of around) {
        if (b.cell[j] !== HIDDEN) continue;
        opened++;
        if (b.mine[j]) { hit = j; break; }
        floodReveal(b, j);
      }
      if (hit >= 0) {
        // No revealedCount++ here: the counter means "safe squares opened" — `isCleared` compares
        // it against `cell.length - mines`, and floodReveal can never reach a mine (it only expands
        // out of zero cells, whose neighbours are mine-free by definition). Counting the mine you
        // detonated made the loss overlay claim "71 of 71 squares cleared" under "Boom".
        b.cell[hit] = REVEALED;
        endLoss(b, hit);
        return;
      }
      if (opened === 0) return;
      if (isCleared(b)) { endWin(b); return; }
      commit(b);
      play('place');
      return;
    }

    if (!b.seeded) {
      seedMines(b, idx);
      clockRef.current = { accum: 0, since: performance.now() };
      setPhase('playing');
    }

    if (b.mine[idx]) {
      b.cell[idx] = REVEALED;
      endLoss(b, idx);
      return;
    }

    floodReveal(b, idx);
    if (isCleared(b)) { endWin(b); return; }
    commit(b);
    play('place');
  }, [commit, setPhase, play, endLoss, endWin]);

  const toggleFlag = useCallback((idx) => {
    const phase = statusRef.current;
    if (phase !== 'idle' && phase !== 'playing') return;
    const cur = boardRef.current;
    if (idx < 0 || idx >= cur.cell.length) return;
    if (cur.cell[idx] === REVEALED) return;

    const b = cloneBoard(cur);
    b.cell[idx] = b.cell[idx] === FLAGGED ? HIDDEN : FLAGGED;
    commit(b);
    play('flip');
  }, [commit, play]);

  const togglePause = useCallback(() => {
    const phase = statusRef.current;
    if (phase === 'playing') {
      stopClock();
      setPhase('paused');
    } else if (phase === 'paused') {
      clockRef.current = { ...clockRef.current, since: performance.now() };
      setPhase('playing');
    }
  }, [setPhase, stopClock]);

  const moveCursor = useCallback((dir) => {
    const b = boardRef.current;
    const i = cursorRef.current;
    const r = (i / b.cols) | 0;
    const c = i % b.cols;
    const nr = dir === 'UP' ? Math.max(0, r - 1) : dir === 'DOWN' ? Math.min(b.rows - 1, r + 1) : r;
    const nc = dir === 'LEFT' ? Math.max(0, c - 1) : dir === 'RIGHT' ? Math.min(b.cols - 1, c + 1) : c;
    const next = nr * b.cols + nc;
    if (next === i) return;
    cursorRef.current = next;
    setCursor(next);
  }, []);

  const handleKey = useCallback((key) => {
    if (key === 'Enter') { revealAt(cursorRef.current); return true; }
    if (key === 'f' || key === 'F') { toggleFlag(cursorRef.current); return true; }
    return false;
  }, [revealAt, toggleFlag]);

  // Only the keyboard half of useGameInput is wired up. Its swipe handler turns any finger travel
  // over 24px into a direction, and Minesweeper's board is the one that PANS under the finger on
  // Expert: a sideways drag ended in moveCursor('RIGHT'), and the cursor-follow effect below then
  // rewrote scrollLeft to bring the cursor back into view, snapping the board back where it was.
  // Minesweeper has no swipe verb — it taps, long-presses and pans — so the gesture is pure
  // interference. onKeyDown still carries arrows, Enter, F and Space/Escape.
  const { onKeyDown } = useGameInput(moveCursor, {
    enabled: status === 'idle' || status === 'playing',
    onPause: togglePause,
    onKey: handleKey,
  });
  const boardProps = useMemo(() => ({ onKeyDown }), [onKeyDown]);

  const indexFromEvent = (e) => {
    const el = e.target.closest?.('[data-i]');
    return el ? Number(el.dataset.i) : -1;
  };

  const onGridClick = (e) => {
    // A long-press already flagged this cell, or the finger was panning the board — either way the
    // trailing click must not also reveal the square the player was marking as dangerous. The flags
    // are cleared on the next pointerdown rather than here, so a gesture that produces no click at
    // all (a drag usually doesn't) cannot leave the guard armed and swallow the following tap.
    const g = gesture.current;
    if (g.flagged || g.dragged) return;
    const i = indexFromEvent(e);
    if (i >= 0) revealAt(i);
  };

  const onGridContextMenu = (e) => {
    e.preventDefault();
    // Android fires a native contextmenu at its own long-press threshold, a little after ours.
    // Without this guard the two handlers toggle the same cell twice and the flag the player just
    // held their finger down for disappears again.
    const g = gesture.current;
    if (g.flagged || g.dragged) return;
    const i = indexFromEvent(e);
    if (i >= 0) toggleFlag(i);
  };

  const onGridPointerDown = (e) => {
    const g = gesture.current;
    clearTimeout(g.timer);
    g.timer = null;
    g.flagged = false;
    g.dragged = false;
    g.panning = false;
    // Mouse keeps native semantics: wheel and the scrollbar pan, right-click flags, and there is no
    // press-and-hold. Only touch and pen get the gesture layer.
    if (e.pointerType === 'mouse') return;
    g.panning = true;
    g.x = e.clientX;
    g.y = e.clientY;
    g.left = scrollerRef.current?.scrollLeft ?? 0;
    const i = indexFromEvent(e);
    if (i < 0) return;
    g.timer = setTimeout(() => {
      g.timer = null;
      g.flagged = true;
      toggleFlag(i);
    }, LONG_PRESS_MS);
  };

  // The board is panned by hand rather than by the browser. GameShell's board wrapper carries
  // `touch-none`, and touch-action is intersected down the ancestor chain — a descendant cannot
  // widen what an ancestor forbade, so the `touch-pan-x` this used to declare on the scroller was
  // inert and Expert's 598px-wide board could not be moved by finger at all. Driving scrollLeft
  // from pointermove works regardless of what touch-action resolves to, and it also gives the
  // long-press timer something to be cancelled by: a finger that is travelling is panning, not
  // flagging, and previously a slow drag flagged whichever cell it started on.
  const onGridPointerMove = (e) => {
    const g = gesture.current;
    if (!g.panning) return;
    const dx = e.clientX - g.x;
    if (!g.dragged && Math.max(Math.abs(dx), Math.abs(e.clientY - g.y)) < DRAG_SLOP) return;
    if (!g.dragged) {
      g.dragged = true;
      clearTimeout(g.timer);
      g.timer = null;
      // Captured only once the gesture is committed to being a pan, never before: Pointer Events 3
      // retargets `click` and `contextmenu` to the capture element, which for a tap would mean the
      // click arriving at the scroller with no `[data-i]` under it and no cell ever being revealed.
      // A drag already suppresses its trailing click, so here the retarget costs nothing and the
      // capture keeps the pan alive when the finger slides off the top edge of a 318px-tall board.
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    }
    const sc = scrollerRef.current;
    if (sc) sc.scrollLeft = g.left - dx;
  };

  const endGesture = () => {
    const g = gesture.current;
    clearTimeout(g.timer);
    g.timer = null;
    g.panning = false;
  };

  // A finger that leaves the board without lifting must not leave an armed long-press behind to
  // flag a cell it is no longer touching. An in-flight pan is exempt — it holds pointer capture.
  const onGridPointerLeave = () => {
    if (!gesture.current.dragged) endGesture();
  };

  const minesLeft = board.mines - flagsPlaced;
  const iconSize = Math.round(cellSize * 0.56);
  const lost = status === 'over';

  const overlay = status === 'won' ? (
    <>
      <Trophy size={40} className="text-os-secondary mb-3" />
      <h2 className="text-xl font-black italic uppercase tracking-tighter">Field cleared</h2>
      <p className="text-sdl-sec text-[10px] font-black uppercase tracking-[0.25em] mt-2">
        {DIFFICULTIES[difficulty].label} in {fmtTime(elapsed)}
      </p>
      {isRecord && (
        <p className="text-os-primary text-[10px] font-black uppercase tracking-[0.25em] mt-1">New record</p>
      )}
      <button
        onClick={restart}
        className="mt-6 px-8 py-3 bg-os-primary text-sdl-onAccent font-black uppercase tracking-widest text-xs rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
      >
        Play again
      </button>
    </>
  ) : (
    <>
      <Bomb size={40} className="text-sdl-alert mb-3" />
      <h2 className="text-xl font-black italic uppercase tracking-tighter">Boom</h2>
      <p className="text-sdl-sec text-[10px] font-black uppercase tracking-[0.25em] mt-2">
        {board.revealedCount} of {board.cell.length - board.mines} squares cleared
      </p>
      <button
        onClick={restart}
        className="mt-6 px-8 py-3 bg-os-primary text-sdl-onAccent font-black uppercase tracking-widest text-xs rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
      >
        Try again
      </button>
    </>
  );

  const headerExtra = (
    <div className="flex items-center gap-2 md:gap-4 shrink-0">
      <div className="text-right">
        <p className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em] leading-none">Mines</p>
        <p className="text-lg md:text-xl font-black tabular-nums leading-tight text-sdl-alert">{minesLeft}</p>
      </div>
      <select
        value={difficulty}
        onChange={(e) => changeDifficulty(e.target.value)}
        aria-label="Difficulty"
        className="w-[74px] md:w-[104px] px-1.5 py-1.5 rounded-xl bg-sdl-sunken border border-hairline/10 text-sdl-sec text-[10px] font-black uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
      >
        {Object.entries(DIFFICULTIES).map(([key, d]) => (
          <option key={key} value={key} className="bg-sdl-surface text-sdl-ink">
            {d.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <GameShell
      gameId="minesweeper"
      onBack={onBack}
      score={fmtTime(elapsed)}
      best={best == null ? null : fmtTime(best)}
      scoreLabel="Time"
      bestLabel="Fastest"
      status={status}
      onRestart={restart}
      onTogglePause={togglePause}
      boardProps={boardProps}
      overlay={overlay}
      headerExtra={headerExtra}
    >
      <div ref={rootRef} className="flex flex-col items-center gap-3">
        <div
          ref={scrollerRef}
          // `touch-none` is deliberate and matches GameShell's wrapper: the pan is ours (see
          // onGridPointerMove), so the browser must not also run one. `overflow-x-auto` stays —
          // it is what makes scrollLeft mean anything, and on desktop the wheel still works.
          className="max-w-full overflow-x-auto overflow-y-hidden touch-none p-3 rounded-[1.75rem] bg-sdl-surface border border-hairline/10 shadow-[var(--sdl-lift)]"
          style={{ maxWidth: Math.max(160, avail) }}
          onClick={onGridClick}
          onContextMenu={onGridContextMenu}
          onPointerDown={onGridPointerDown}
          onPointerMove={onGridPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          onPointerLeave={onGridPointerLeave}
        >
          <div
            role="grid"
            aria-label={`${rows} by ${cols} mine field, ${minesLeft} mines unflagged`}
            aria-rowcount={rows}
            aria-colcount={cols}
            // w-max, and `shrink-0` on every cell below: flex items shrink by default, so on a
            // 375px screen the 30 columns of Expert quietly squeezed themselves down to 9px each
            // to fit the scroller instead of overflowing it. The board looked "responsive" and was
            // unplayable — the horizontal scroll only exists if the row is allowed to be too wide.
            className="flex flex-col w-max"
            style={{ gap: GAP }}
          >
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} role="row" className="flex" style={{ gap: GAP }}>
                {Array.from({ length: cols }, (_, c) => {
                  const i = r * cols + c;
                  const state = board.cell[i];
                  const mine = board.mine[i] === 1;
                  const n = board.adj[i];
                  const wrongFlag = lost && state === FLAGGED && !mine;
                  const isCursor = i === cursor;

                  let face = null;
                  let tone = 'bg-sdl-sunken border border-hairline/10 hover:bg-veil/10 cursor-pointer';
                  let label;

                  if (state === FLAGGED) {
                    face = <Flag size={iconSize} className={wrongFlag ? 'text-sdl-sec' : 'text-sdl-alert'} />;
                    label = wrongFlag ? 'wrong flag' : 'flagged';
                    if (wrongFlag) {
                      tone = 'bg-sdl-alert/10 border border-sdl-alert/30';
                      face = <X size={iconSize} className="text-sdl-alert" />;
                    }
                  } else if (state === REVEALED && mine) {
                    tone = i === board.exploded
                      ? 'bg-sdl-alert/40 border border-sdl-alert/60'
                      : 'bg-sdl-alert/10 border border-hairline/10';
                    face = <Bomb size={iconSize} className="text-sdl-alert" />;
                    label = 'mine';
                  } else if (state === REVEALED) {
                    tone = 'bg-veil/[0.04] border border-hairline/5';
                    face = n > 0 ? n : null;
                    label = n > 0 ? `${n}` : 'empty';
                  } else {
                    label = 'covered';
                  }

                  return (
                    <div
                      key={c}
                      data-i={i}
                      role="gridcell"
                      aria-label={`Row ${r + 1} column ${c + 1}, ${label}`}
                      className={`shrink-0 flex items-center justify-center rounded-[4px] font-black leading-none select-none transition-colors ${tone} ${
                        typeof face === 'number' ? NUMBER_TONE[face] : ''
                      } ${isCursor ? 'ring-2 ring-inset ring-os-primary/70' : ''}`}
                      style={{ width: cellSize, height: cellSize, fontSize: Math.round(cellSize * 0.55) }}
                    >
                      {face}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em] text-center px-2">
          Tap to clear · long-press or right-click to flag · tap a number to chord
        </p>
      </div>
    </GameShell>
  );
};

export default Minesweeper;
