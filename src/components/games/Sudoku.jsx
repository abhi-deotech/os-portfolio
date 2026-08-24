import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, PencilLine, Trophy, Undo2 } from 'lucide-react';
import GameShell from './GameShell';
import useGameInput from '../../hooks/useGameInput';
import useGameAudio from '../../hooks/useGameAudio';
import useHighScore from '../../hooks/useHighScore';
import useOSStore from '../../store/osStore';

/**
 * Sudoku, with a real generator.
 *
 * What shipped before was a single 36-clue board pasted into the file as a literal, and a
 * "New Puzzle" button that re-copied that same literal — so the game was over for good once you
 * solved it, and every player saw the identical grid. Everything below the component is the
 * replacement: a randomized fill, a bitmask solver, and a digger that only removes a clue when
 * the puzzle still has exactly one solution. A sudoku with two solutions is not a sudoku; it is a
 * guessing game where the mistake counter lies to you.
 */

const CELLS = 81;
const ALL = 0b1111111110; // bits 1..9; bit 0 unused so a digit d maps to (1 << d)

const ROW = new Int8Array(CELLS);
const COL = new Int8Array(CELLS);
const BOX = new Int8Array(CELLS);
for (let i = 0; i < CELLS; i++) {
  ROW[i] = (i / 9) | 0;
  COL[i] = i % 9;
  BOX[i] = ((ROW[i] / 3) | 0) * 3 + ((COL[i] / 3) | 0);
}

/** The 27 units (9 rows, 9 columns, 9 boxes), used for conflict detection. */
const UNITS = [];
for (let u = 0; u < 9; u++) {
  const r = [], c = [], b = [];
  for (let i = 0; i < CELLS; i++) {
    if (ROW[i] === u) r.push(i);
    if (COL[i] === u) c.push(i);
    if (BOX[i] === u) b.push(i);
  }
  UNITS.push(r, c, b);
}

const INDICES = Array.from({ length: CELLS }, (_, i) => i);
const ROWS = Array.from({ length: 9 }, (_, i) => i);
const EMPTY_GRID = new Int8Array(CELLS);
const EMPTY_NOTES = new Uint16Array(CELLS);
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', clues: 45 },
  { id: 'medium', label: 'Medium', clues: 36 },
  { id: 'hard', label: 'Hard', clues: 30 },
  { id: 'expert', label: 'Expert', clues: 26 },
];
const DIFF_BY_ID = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d]));

/**
 * Wall-clock ceiling for one generation. Expert (26 clues) is the only target that ever gets
 * close: each candidate removal costs a full two-solution search, and the last few clues are the
 * expensive ones. Rather than hang the window we stop digging and hand back whatever clue count
 * we reached — a 29-clue "Expert" is a worse-graded puzzle, not a broken one.
 */
const GEN_BUDGET_MS = 900;

const popcount = (m) => {
  let n = 0;
  while (m) { m &= m - 1; n++; }
  return n;
};

/**
 * Fisher-Yates. Deliberately not `sort(() => Math.random() - 0.5)`: that comparator is not a
 * consistent ordering, so the engine's sort leaves a strongly biased permutation — measured at
 * 31.2% vs 18.8% for slots that should both be 11.1%. A biased shuffle here would mean the same
 * regions of the board getting dug out every time.
 */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Counts solutions of `grid`, stopping the moment it has found `limit` of them.
 *
 * Constraint propagation is implicit in the MRV choice: the cell with the fewest candidates is
 * expanded first, and a cell with zero candidates prunes the branch immediately. That is what
 * makes it cheap enough to run ~80 times per generated puzzle without a worker.
 *
 * @param {Int8Array} grid   81 cells, 0 = empty. Not mutated.
 * @param {number} limit     stop after this many solutions (2 is all uniqueness needs)
 * @param {boolean} random   shuffle candidate order — only wanted when generating a fresh board
 * @param {Int8Array} [out]  receives the last solution found
 * @returns {number} solutions found, capped at `limit`
 */
function search(grid, limit, random, out) {
  const rows = new Int32Array(9);
  const cols = new Int32Array(9);
  const boxes = new Int32Array(9);
  const work = Int8Array.from(grid);

  for (let i = 0; i < CELLS; i++) {
    const v = work[i];
    if (!v) continue;
    const b = 1 << v;
    rows[ROW[i]] |= b; cols[COL[i]] |= b; boxes[BOX[i]] |= b;
  }

  let found = 0;

  // Returns true to unwind the whole search (limit reached), false to keep exploring siblings.
  const step = () => {
    let best = -1, bestMask = 0, bestN = 10;
    for (let i = 0; i < CELLS; i++) {
      if (work[i]) continue;
      const mask = ALL & ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]);
      const n = popcount(mask);
      if (n === 0) return false;
      if (n < bestN) { bestN = n; best = i; bestMask = mask; if (n === 1) break; }
    }
    if (best === -1) {
      found++;
      if (out) out.set(work);
      return found >= limit;
    }

    const candidates = [];
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) candidates.push(d);
    if (random) shuffle(candidates);

    for (const d of candidates) {
      const b = 1 << d;
      work[best] = d;
      rows[ROW[best]] |= b; cols[COL[best]] |= b; boxes[BOX[best]] |= b;
      const stop = step();
      work[best] = 0;
      rows[ROW[best]] &= ~b; cols[COL[best]] &= ~b; boxes[BOX[best]] &= ~b;
      if (stop) return true;
    }
    return false;
  };

  step();
  return found;
}

/** Clears `cells` only if the puzzle survives with a unique solution. Returns clues removed. */
function tryClear(puzzle, cells) {
  const saved = cells.map((k) => puzzle[k]);
  const removed = saved.filter((v) => v !== 0).length;
  if (!removed) return 0;
  for (const k of cells) puzzle[k] = 0;
  if (search(puzzle, 2, false) === 1) return removed;
  cells.forEach((k, n) => { puzzle[k] = saved[n]; });
  return 0;
}

/**
 * A fresh puzzle at the requested difficulty.
 *
 * Digging runs in two passes. The first takes 180°-rotational pairs, which is what makes a hand-set
 * sudoku look like one and halves the number of uniqueness checks. Symmetry alone often stalls
 * above the target (removing a pair can break uniqueness when removing one of the two would not),
 * so a second single-cell pass tops it up. Uniqueness is checked on every removal in both passes.
 */
function generatePuzzle(difficulty) {
  const solution = new Int8Array(CELLS);
  search(EMPTY_GRID, 1, true, solution);

  const target = (DIFF_BY_ID[difficulty] ?? DIFF_BY_ID.medium).clues;
  const deadline = performance.now() + GEN_BUDGET_MS;
  const puzzle = Int8Array.from(solution);
  let clues = CELLS;

  for (const i of shuffle(Array.from({ length: 41 }, (_, n) => n))) {
    if (clues <= target || performance.now() > deadline) break;
    clues -= tryClear(puzzle, i === 40 ? [40] : [i, 80 - i]);
  }
  if (clues > target) {
    for (const i of shuffle([...INDICES])) {
      if (clues <= target || performance.now() > deadline) break;
      if (puzzle[i]) clues -= tryClear(puzzle, [i]);
    }
  }

  return { puzzle, solution, clues, difficulty };
}

/**
 * Every cell that duplicates a digit inside a row, column or box.
 *
 * Derived from the whole grid on every change rather than stored. The old code pushed the typed
 * cell onto an `errors` array and only ever re-examined that one cell, so erasing the digit a red
 * cell collided with left the red mark behind, and a cell that became invalid because of a *later*
 * entry elsewhere was never marked at all.
 */
function findConflicts(grid) {
  const bad = new Set();
  for (const unit of UNITS) {
    const seen = new Map();
    for (const i of unit) {
      const v = grid[i];
      if (!v) continue;
      const first = seen.get(v);
      if (first === undefined) seen.set(v, i);
      else { bad.add(i); bad.add(first); }
    }
  }
  return bad;
}

const conflictsAt = (grid, idx) => {
  const v = grid[idx];
  if (!v) return false;
  for (let i = 0; i < CELLS; i++) {
    if (i === idx || grid[i] !== v) continue;
    if (ROW[i] === ROW[idx] || COL[i] === COL[idx] || BOX[i] === BOX[idx]) return true;
  }
  return false;
};

const isSolved = (grid, solution) => {
  for (let i = 0; i < CELLS; i++) if (grid[i] !== solution[i]) return false;
  return true;
};

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * The board is square, so one length drives both axes and the cell metrics derive from it via a
 * custom property. 90vw keeps it inside a 375px phone (337px, ~37px cells); the vh term stops a
 * short window from pushing the digit pad out of reach.
 */
const BOARD = 'min(90vw, 52vh, 520px)';

const INITIAL = {
  status: 'idle',           // 'idle' only while a puzzle is being generated
  difficulty: 'medium',
  puzzle: EMPTY_GRID,       // the givens; a non-zero here is not editable
  solution: EMPTY_GRID,
  grid: EMPTY_GRID,
  notes: EMPTY_NOTES,       // per-cell bitmask of pencil marks
  history: [],
  mistakes: 0,
  selected: null,
  clues: 0,
  noteMode: false,
};

const Sudoku = ({ onBack }) => {
  /**
   * One state object, mirrored in one ref, replaced wholesale on every change.
   *
   * Handlers read `gameRef.current` and never `setGame(prev => ...)`. StrictMode double-invokes
   * updater functions, so anything with a side effect — a sound, a mistake increment, an
   * achievement — is wrong inside one, and deferring it with queueMicrotask does not help because
   * the *scheduling* runs twice too (see tasks/lessons.md; this is what made 2048 score 8 for a
   * single merge of two 2s). Computing the next state in the event handler makes that class of bug
   * unreachable rather than merely absent.
   */
  const [game, setGame] = useState(INITIAL);
  const gameRef = useRef(game);
  const apply = useCallback((next) => { gameRef.current = next; setGame(next); }, []);

  const [elapsed, setElapsed] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [best, submitBest] = useHighScore('sudoku', 'min');
  const play = useGameAudio();
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);

  // Seconds banked from earlier segments, plus the timestamp the running segment started at.
  // Wall-clock rather than a tick count, so a throttled background tab cannot slow the clock down.
  const clock = useRef({ accum: 0, since: null });
  const readElapsed = useCallback(() => {
    const { accum, since } = clock.current;
    return accum + (since == null ? 0 : (performance.now() - since) / 1000);
  }, []);

  const genRef = useRef({ id: 0, timer: null });
  const gridRef = useRef(null);

  /**
   * Every key binding rides on GameShell's board element, so anything that takes focus away from
   * it silently kills the keyboard until the player clicks the grid again. The difficulty picker
   * sits in the shell's header, and the shell's own Restart button and the win overlay's button
   * are ordinary buttons — all three grab focus on click. The board is found by its documented
   * role rather than by walking a fixed number of parents, so shell markup changes cannot quietly
   * turn this into a no-op.
   */
  const refocusBoard = useCallback(() => {
    gridRef.current?.closest('[role="application"]')?.focus();
  }, []);

  /**
   * Generation is deferred by a frame rather than run inline. That is the whole reason the 'idle'
   * status exists: a puzzle costs a few ms of tight backtracking today, but the digger is
   * budget-bound and an unlucky Expert can run far longer — done in the click handler, the
   * "Dealing a fresh grid" state would never paint and the window would simply freeze for the
   * duration. `id` invalidates a run whose difficulty has already been superseded (and covers
   * StrictMode's double mount, where the first schedule is cleared before it fires).
   */
  const scheduleGeneration = useCallback((difficulty) => {
    const gen = genRef.current;
    const id = ++gen.id;
    clearTimeout(gen.timer);
    gen.timer = setTimeout(() => {
      if (gen.id !== id) return;
      const made = generatePuzzle(difficulty);
      const first = made.puzzle.indexOf(0);
      clock.current = { accum: 0, since: performance.now() };
      apply({
        ...INITIAL,
        difficulty,
        noteMode: gameRef.current.noteMode,
        status: 'playing',
        puzzle: made.puzzle,
        solution: made.solution,
        grid: Int8Array.from(made.puzzle),
        notes: new Uint16Array(CELLS),
        clues: made.clues,
        selected: first < 0 ? 0 : first,
      });
    }, 16);
  }, [apply]);

  const startPuzzle = useCallback((difficulty) => {
    clock.current = { accum: 0, since: null };
    setElapsed(0);
    setNewRecord(false);
    apply({ ...INITIAL, difficulty, noteMode: gameRef.current.noteMode });
    scheduleGeneration(difficulty);
    refocusBoard();
  }, [apply, refocusBoard, scheduleGeneration]);

  // Only the schedule happens here — INITIAL already *is* the pre-generation state, so the mount
  // effect has no state to reset and never renders twice on the way to the first puzzle.
  useEffect(() => {
    const gen = genRef.current;
    scheduleGeneration(INITIAL.difficulty);
    return () => clearTimeout(gen.timer);
  }, [scheduleGeneration]);

  useEffect(() => {
    if (game.status !== 'playing') return undefined;
    const id = setInterval(() => setElapsed(readElapsed()), 250);
    return () => clearInterval(id);
  }, [game.status, readElapsed]);

  const togglePause = useCallback(() => {
    const g = gameRef.current;
    refocusBoard();
    if (g.status === 'playing') {
      clock.current = { accum: readElapsed(), since: null };
      apply({ ...g, status: 'paused' });
    } else if (g.status === 'paused') {
      clock.current = { accum: clock.current.accum, since: performance.now() };
      apply({ ...g, status: 'playing' });
    }
  }, [apply, readElapsed, refocusBoard]);

  const select = useCallback((idx) => {
    const g = gameRef.current;
    if (g.status !== 'playing') return;
    apply({ ...g, selected: idx });
  }, [apply]);

  const moveSelection = useCallback((dir) => {
    const g = gameRef.current;
    if (g.status !== 'playing') return;
    const from = g.selected ?? 40;
    const dr = dir === 'UP' ? -1 : dir === 'DOWN' ? 1 : 0;
    const dc = dir === 'LEFT' ? -1 : dir === 'RIGHT' ? 1 : 0;
    // Clamped, not wrapped: on a 9x9 logic grid, wrapping off the right edge onto the next row
    // reads as the selection jumping somewhere random.
    const r = Math.min(8, Math.max(0, ROW[from] + dr));
    const c = Math.min(8, Math.max(0, COL[from] + dc));
    const to = r * 9 + c;
    if (to !== from) { apply({ ...g, selected: to }); play('move'); }
  }, [apply, play]);

  const finish = useCallback((solvedState) => {
    const secs = Math.max(1, Math.round(readElapsed()));
    clock.current = { accum: secs, since: null };
    setElapsed(secs);
    apply({ ...solvedState, status: 'won' });
    setNewRecord(submitBest(secs));
    unlockAchievement('sudoku_pro');
    play('win');
  }, [apply, play, readElapsed, submitBest, unlockAchievement]);

  /**
   * `digit` 1-9 places (or, when it repeats what is already there, clears); 0 erases.
   * In note mode a digit toggles a pencil mark instead.
   */
  const enterDigit = useCallback((digit) => {
    const g = gameRef.current;
    const idx = g.selected;
    if (g.status !== 'playing' || idx == null) return;
    if (g.puzzle[idx] !== 0) { play('wrong'); return; } // givens are read-only

    const history = [...g.history, { idx, value: g.grid[idx], note: g.notes[idx] }];

    if (g.noteMode && digit !== 0) {
      if (g.grid[idx] !== 0) return; // a filled cell has nothing to pencil around
      const notes = Uint16Array.from(g.notes);
      notes[idx] ^= 1 << digit;
      apply({ ...g, notes, history });
      play('flip');
      return;
    }

    const value = digit === 0 || g.grid[idx] === digit ? 0 : digit;
    if (value === 0 && g.grid[idx] === 0 && g.notes[idx] === 0) return; // nothing to erase

    const grid = Int8Array.from(g.grid);
    const notes = Uint16Array.from(g.notes);
    grid[idx] = value;
    notes[idx] = 0;

    if (value === 0) {
      apply({ ...g, grid, notes, history });
      play('move');
      return;
    }

    // The mistake counter is graded against the solution, not just against the visible grid: a
    // digit can be wrong long before it collides with anything, and a counter that only reacts to
    // collisions would credit you for an error you have already committed to.
    const wrong = value !== g.solution[idx];
    const collides = conflictsAt(grid, idx);
    const next = { ...g, grid, notes, history, mistakes: g.mistakes + (wrong ? 1 : 0) };

    if (isSolved(grid, g.solution)) { finish(next); return; }

    apply(next);
    play(wrong || collides ? 'wrong' : 'place');
  }, [apply, finish, play]);

  const undo = useCallback(() => {
    const g = gameRef.current;
    if (g.status !== 'playing' || g.history.length === 0) return;
    const last = g.history[g.history.length - 1];
    const grid = Int8Array.from(g.grid);
    const notes = Uint16Array.from(g.notes);
    grid[last.idx] = last.value;
    notes[last.idx] = last.note;
    // Mistakes are not refunded. The count is a record of errors made, not of errors left on the
    // board, and refunding it would make undo a free "was that right?" probe against the solution.
    apply({ ...g, grid, notes, history: g.history.slice(0, -1), selected: last.idx });
    play('move');
  }, [apply, play]);

  const toggleNoteMode = useCallback(() => {
    const g = gameRef.current;
    apply({ ...g, noteMode: !g.noteMode });
    play('flip');
  }, [apply, play]);

  const onKey = useCallback((key) => {
    if (key >= '1' && key <= '9') { enterDigit(Number(key)); return true; }
    if (key === '0' || key === 'Backspace' || key === 'Delete') { enterDigit(0); return true; }
    if (key === 'n' || key === 'N') { toggleNoteMode(); return true; }
    if (key === 'u' || key === 'U') { undo(); return true; }
    return false;
  }, [enterDigit, toggleNoteMode, undo]);

  const inputProps = useGameInput(moveSelection, {
    enabled: game.status === 'playing',
    onPause: togglePause,
    onKey,
  });

  const conflicts = useMemo(() => findConflicts(game.grid), [game.grid]);
  const remaining = useMemo(() => {
    const left = new Array(10).fill(9);
    for (const v of game.grid) if (v) left[v]--;
    return left;
  }, [game.grid]);

  const sel = game.selected;
  const selDigit = sel == null ? 0 : game.grid[sel];
  const generating = game.status === 'idle';

  const headerExtra = (
    <div className="flex items-center gap-3">
      <select
        value={game.difficulty}
        onChange={(e) => startPuzzle(e.target.value)}
        aria-label="Difficulty"
        className="bg-sdl-sunken border border-hairline/10 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-sdl-sec hover:text-sdl-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
      >
        {DIFFICULTIES.map((d) => (
          <option key={d.id} value={d.id}>{d.label}</option>
        ))}
      </select>
      <div className="text-right">
        <p className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em] leading-none">Errors</p>
        <p className={`text-lg md:text-xl font-black tabular-nums leading-tight ${game.mistakes ? 'text-sdl-alert' : 'text-sdl-sec'}`}>
          {game.mistakes}
        </p>
      </div>
    </div>
  );

  const overlay = (
    <>
      <Trophy size={40} className="text-os-secondary mb-3" />
      <h2 className="text-2xl font-black italic uppercase tracking-tighter">Solved</h2>
      <p className="text-sdl-sec text-[10px] font-black uppercase tracking-[0.25em] mt-2">
        {DIFF_BY_ID[game.difficulty]?.label} · {game.clues} clues · {fmtTime(elapsed)} · {game.mistakes} errors
      </p>
      {newRecord && (
        <p className="text-os-primary text-[10px] font-black uppercase tracking-[0.25em] mt-2">Fastest yet</p>
      )}
      <button
        onClick={() => startPuzzle(gameRef.current.difficulty)}
        className="mt-6 px-8 py-3 rounded-2xl bg-os-primary text-sdl-onAccent font-black uppercase tracking-widest text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
      >
        New puzzle
      </button>
    </>
  );

  return (
    <GameShell
      gameId="sudoku"
      onBack={onBack}
      score={fmtTime(elapsed)}
      best={best == null ? null : fmtTime(best)}
      scoreLabel="Time"
      bestLabel="Fastest"
      status={game.status}
      onRestart={() => startPuzzle(gameRef.current.difficulty)}
      onTogglePause={togglePause}
      boardProps={inputProps}
      overlay={overlay}
      headerExtra={headerExtra}
    >
      <div className="flex flex-col items-center gap-3">
        {/* Real row elements rather than 81 flat children: `role="gridcell"` is only meaningful
            under a row, and a column of flex rows each holding a 9-column grid keeps the cells
            exactly square without leaning on `display: contents`. */}
        <div
          ref={gridRef}
          role="grid"
          aria-label="Sudoku board"
          className="relative flex flex-col rounded-2xl overflow-hidden bg-sdl-surface border border-hairline/25 shadow-lift"
          style={{ width: BOARD, height: BOARD, fontSize: `calc(${BOARD} / 9 * 0.52)` }}
        >
          {ROWS.map((r) => (
            <div key={r} role="row" className="grid grid-cols-9 flex-1 min-h-0">
              {INDICES.slice(r * 9, r * 9 + 9).map((i) => {
                const given = game.puzzle[i] !== 0;
                const value = game.grid[i];
                const note = game.notes[i];
                const isSel = sel === i;
                const peer = sel != null && (ROW[i] === ROW[sel] || COL[i] === COL[sel] || BOX[i] === BOX[sel]);
                const twin = selDigit !== 0 && value === selDigit && !isSel;
                const bad = conflicts.has(i);

                // Each side gets exactly one width class. Emitting `border-r` and `border-r-2`
                // together would leave the winner to stylesheet order rather than intent.
                const rBorder = COL[i] === 8 ? ''
                  : COL[i] % 3 === 2 ? 'border-r-2 border-r-hairline/25' : 'border-r border-r-hairline/10';
                const bBorder = ROW[i] === 8 ? ''
                  : ROW[i] % 3 === 2 ? 'border-b-2 border-b-hairline/25' : 'border-b border-b-hairline/10';

                const tone = bad ? 'bg-sdl-alert/15'
                  : isSel ? 'bg-os-primary/25'
                  : twin ? 'bg-os-secondary/15'
                  : peer ? 'bg-veil/[0.06]'
                  : given ? 'bg-veil/[0.02]'
                  : '';

                // Givens carry the ink colour and the heaviest weight; anything the player typed is
                // accent-coloured, so "what did I put there" is answerable at a glance.
                const ink = bad ? 'text-sdl-alert'
                  : given ? 'text-sdl-ink font-black'
                  : 'text-os-primary';

                return (
                  <div
                    key={i}
                    role="gridcell"
                    aria-selected={isSel}
                    aria-readonly={given || undefined}
                    aria-invalid={bad || undefined}
                    aria-label={`Row ${ROW[i] + 1} column ${COL[i] + 1}, ${value ? value : 'empty'}${given ? ', given' : ''}`}
                    onClick={() => select(i)}
                    className={`relative flex items-center justify-center font-bold tabular-nums leading-none cursor-pointer transition-colors duration-hover ${tone} ${ink} ${rBorder} ${bBorder}`}
                  >
                    {value !== 0 && value}
                    {value === 0 && note !== 0 && (
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 p-[6%] text-sdl-sec font-bold" style={{ fontSize: '0.42em' }}>
                        {DIGITS.map((d) => (
                          <span key={d} className="flex items-center justify-center leading-none">
                            {note & (1 << d) ? d : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {generating && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-scrim backdrop-blur-md text-center px-4">
              <p className="text-sm font-black uppercase tracking-tight">Dealing a fresh grid</p>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sdl-sec">
                Verifying a single solution
              </p>
            </div>
          )}
        </div>

        {/* Digit pad and actions share the board's width so the three rows read as one block. */}
        <div className="flex flex-col gap-2" style={{ width: BOARD }}>
          <div className="grid grid-cols-9 gap-1">
            {DIGITS.map((d) => (
              <PadButton
                key={d}
                onClick={() => enterDigit(d)}
                disabled={game.status !== 'playing'}
                dim={remaining[d] <= 0}
                label={`Enter ${d}`}
              >
                <span className="font-black text-base leading-none">{d}</span>
                <span className="text-[8px] font-black tabular-nums text-sdl-sec leading-none">
                  {Math.max(0, remaining[d])}
                </span>
              </PadButton>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <PadButton
              onClick={toggleNoteMode}
              disabled={game.status !== 'playing'}
              active={game.noteMode}
              label={`Pencil marks ${game.noteMode ? 'on' : 'off'}`}
            >
              <PencilLine size={15} />
              <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                Notes {game.noteMode ? 'on' : 'off'}
              </span>
            </PadButton>
            <PadButton onClick={() => enterDigit(0)} disabled={game.status !== 'playing'} label="Erase cell">
              <Eraser size={15} />
              <span className="text-[8px] font-black uppercase tracking-widest leading-none">Erase</span>
            </PadButton>
            <PadButton
              onClick={undo}
              disabled={game.status !== 'playing' || game.history.length === 0}
              label="Undo"
            >
              <Undo2 size={15} />
              <span className="text-[8px] font-black uppercase tracking-widest leading-none">Undo</span>
            </PadButton>
          </div>
        </div>
      </div>
    </GameShell>
  );
};

/**
 * A pad button never takes pointer focus and never lets Space or Enter escape.
 *
 * Both matter because the pad lives *inside* GameShell's focusable board: a click that moved focus
 * to the button would leave the board's key handling intact (keydown bubbles) but a subsequent
 * Space would fire the button's own activation AND reach the board's pause binding, so tapping a
 * digit then pressing Space would both re-enter the digit and pause the game.
 */
const PadButton = ({ onClick, disabled, active, dim, label, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={active}
    onMouseDown={(e) => e.preventDefault()}
    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') e.stopPropagation(); }}
    className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl border transition-all duration-hover disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${
      active
        ? 'bg-os-primary/20 border-os-primary/40 text-os-primary'
        : 'bg-sdl-sunken border-hairline/10 text-sdl-ink hover:bg-veil/10 hover:border-os-primary/30'
    } ${dim ? 'opacity-40' : ''}`}
  >
    {children}
  </button>
);

export default Sudoku;
