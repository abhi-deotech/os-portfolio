import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Atom, Brain, Cpu, Database, Globe, Layers, Radar, RefreshCw, Rocket,
  ShieldCheck, Timer, Trophy, Zap,
} from 'lucide-react';
import useOSStore from '../../store/osStore';
import { useColorway } from '../../theme/useColorway';
import { iconStyle } from '../../theme/icons';
import GameShell from './GameShell';
import useGameInput from '../../hooks/useGameInput';
import useGameAudio from '../../hooks/useGameAudio';
import useHighScore from '../../hooks/useHighScore';

// Game pieces, not chrome: a pair is matched by eye on colour + glyph before `label` ever confirms
// it, so these eight have to stay eight mutually distinguishable hues. Folding them onto accent /
// barA / barB would leave three colours for eight symbols and make the board unplayable.
//
// But "must stay eight" does not mean "must stay these eight LITERALS". They were the legacy neon
// palette, and the card back tints itself with them, so on any of the ten light colorways a
// #00f5a0 glyph landed on a near-white card at about 1.4:1 — the same bug the app icons were
// rebuilt to fix. So: identity is the HUE, discipline is the colorway, exactly as in
// src/theme/icons.js. `harmonized` re-renders each hue at the active colorway's chroma and
// lightness and walks lightness until it measures 3:1 against the plane, so all eight stay
// mutually distinguishable AND readable in both modes.
const SYMBOLS = [
  { icon: Cpu, hue: 300, label: 'Processing' },
  { icon: Zap, hue: 216, label: 'Quantum' },
  { icon: Brain, hue: 160, label: 'Neural' },
  { icon: Trophy, hue: 330, label: 'Node' },
  { icon: Timer, hue: 96, label: 'Sync' },
  { icon: Layers, hue: 28, label: 'Data' },
  { icon: Globe, hue: 140, label: 'Network' },
  { icon: ShieldCheck, hue: 254, label: 'Secure' }
];

// The hard board needs twelve faces, and the eight above are the curated set — so these four are an
// EXTENSION, not a replacement. Their hues were chosen to land in the widest gaps left on the wheel
// (160→216, 330→28, 28→96, 254→300) so that adding them does not push any existing pair closer
// together than the pairs already are. They ride the same `harmonized` contract, so the colorway
// still owns chroma and lightness; only the hue angle is ours.
const EXTRA_SYMBOLS = [
  { icon: Radar, hue: 188, label: 'Signal' },
  { icon: Rocket, hue: 8, label: 'Boost' },
  { icon: Atom, hue: 62, label: 'Core' },
  { icon: Database, hue: 276, label: 'Store' },
];

const DECK = [...SYMBOLS, ...EXTRA_SYMBOLS];

/**
 * Column counts are written out as literal class strings rather than built by interpolation,
 * because Tailwind scans source text — `grid-cols-${n}` produces no CSS at all.
 *
 * The two boards that would otherwise get cramped narrow below the `sm` breakpoint: twelve pairs
 * goes 6×4 → 4×6 (a 46px card becomes a 74px one at 375px) and six pairs 4×3 → 3×4 (77px → 101px).
 * Eight pairs is 4×4 at every width on purpose — 375px already yields a ~74px card there, and
 * dropping it to three columns would only make the board taller for nothing. `maxPx` is the upper
 * bound; the `min(85vw, …)` below is what actually holds the board inside a narrow window.
 */
const LAYOUTS = {
  6: { grid: 'grid-cols-3 sm:grid-cols-4', maxPx: 380, showLabel: true },
  8: { grid: 'grid-cols-4', maxPx: 460, showLabel: true },
  12: { grid: 'grid-cols-4 sm:grid-cols-6', maxPx: 640, showLabel: false },
};

const SIZES = [6, 8, 12];

/** How long a mismatched pair stays readable before it turns back over. */
const PEEK_MS = 850;

/**
 * Fisher-Yates. The old deal was `sort(() => Math.random() - 0.5)`, which is not a shuffle: the
 * comparator is inconsistent, so the sort's decisions depend on the order it happens to visit
 * elements in. Measured over 200,000 deals of the sixteen-card board, one card landed in its
 * most-favoured slot 13.3% of the time and its least-favoured 4.4%, where every slot should be
 * 6.25% — a three-fold skew. The loop below measures 6.16%–6.33% over the same 200,000 deals.
 * A memory game whose layout is predictable is a memory game with a tell.
 */
function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `dealId` is folded into the React key so a new deal remounts the cards instead of animating the
 *  old faces into new positions. */
function dealCards(pairs, dealId) {
  const faces = DECK.slice(0, pairs);
  return shuffle([...faces, ...faces]).map((face, i) => ({ ...face, id: `${dealId}:${i}` }));
}

const mmss = (total) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

/**
 * Activation keys must not reach the shell's board wrapper.
 *
 * GameShell binds Space and Escape to pause on the element that contains every control here, so
 * without this a Space on a focused card would flip it AND pause the game in the same keystroke.
 * Only bound while the control is genuinely actionable — see `cardGuards`.
 */
const swallowActivationKeys = (e) => {
  if (e.key === ' ' || e.key === 'Enter') e.stopPropagation();
};

/**
 * Cards are `aria-disabled`, never `disabled`.
 *
 * A focused element that becomes `disabled` is blurred by the browser and focus falls to `<body>` —
 * measured, not assumed. Body is not inside the shell's board wrapper, and React only runs a
 * handler for elements on the target's ancestor chain, so the wrapper's keydown stops firing: after
 * pausing with Escape from a focused card, neither Space nor Escape resumed, while the pause veil
 * sat there saying "Space or Escape to resume". Leaving the card focusable keeps the key path
 * alive. `tabIndex -1` still takes the dead board out of the tab order, and nothing is reachable by
 * pointer anyway because the veil covers the board — `flip` re-checks the phase regardless.
 */
const cardGuards = (interactive) => ({
  'aria-disabled': !interactive,
  tabIndex: interactive ? 0 : -1,
  // Swallowing Space only while the board is live is the other half of the same fix: while paused,
  // Space on a focused card has to reach the wrapper instead of being eaten as a flip.
  onKeyDown: interactive ? swallowActivationKeys : undefined,
});

const MemoryGame = ({ onBack }) => {
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);
  const play = useGameAudio();
  // Resolved at render, not stored on the card: the board must retint when the colorway changes
  // mid-game, and shuffled state should not carry a frozen palette.
  const cw = useColorway();
  const faceOf = (hue) => iconStyle('harmonized', cw, { hue });

  const [pairs, setPairs] = useState(8);
  const [cards, setCards] = useState(() => dealCards(8, 0));
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState('idle');

  // Every piece of game state is mirrored in a ref. Nothing below reads state through a
  // `setX(prev => …)` updater, because StrictMode is on and deliberately invokes updaters twice —
  // this is the bug that made 2048 score 8 for a single pair of 2s. Event handlers run once, so
  // the whole turn is computed out here from refs and written with plain values.
  const cardsRef = useRef(cards);
  const flippedRef = useRef(flipped);
  const solvedRef = useRef(solved);
  const movesRef = useRef(0);
  const statusRef = useRef('idle');
  const dealRef = useRef(0);
  // The flip-lock. Without it a fast third click during the mismatch peek pushed a third index into
  // `flipped`, and the next click compared indexes 0 and 1 of a three-card array.
  const lockRef = useRef(false);
  const peekRef = useRef(null);
  // The peek is wall-clock time, so it has to be banked across a pause exactly like the game clock
  // is. Without these two, pausing on a mismatch let the 850ms drain behind the pause veil and the
  // player came back to two face-down cards they never got to read — game state advancing while
  // the game says it is stopped, which is the one thing pause is for.
  const peekLeftRef = useRef(0);
  const peekAtRef = useRef(0);

  // Elapsed time is banked in milliseconds rather than counted in ticks, so pausing (and the
  // interval being torn down and rebuilt by StrictMode's double-mount) cannot lose or gain a second.
  const accumRef = useRef(0);
  const runStartRef = useRef(null);

  // Three separate records, because "17 moves" means nothing without the board size it was set on —
  // a six-pair clear will beat a twelve-pair clear essentially always. Eight pairs keeps the bare
  // `memory` key: that is where useHighScore folds the legacy `memory-best-moves` value, and the
  // old board was always eight pairs, so the migrated number is genuinely comparable.
  const best6 = useHighScore('memory-6', 'min');
  const best8 = useHighScore('memory', 'min');
  const best12 = useHighScore('memory-12', 'min');
  const [best, submitBest] = pairs === 6 ? best6 : pairs === 12 ? best12 : best8;

  // The two clock mutations are memoized helpers rather than inline statements because
  // `performance.now()` is impure and the react-hooks purity rule cannot see that `flip` only ever
  // runs from a click. Hoisting the impurity into a stable callback states the boundary explicitly.
  const startClock = useCallback(() => { runStartRef.current = performance.now(); }, []);

  const bankClock = useCallback(() => {
    if (runStartRef.current == null) return;
    accumRef.current += performance.now() - runStartRef.current;
    runStartRef.current = null;
    setElapsed(Math.floor(accumRef.current / 1000));
  }, []);

  // The peek timer is armed and disarmed as one unit, on the same banked-milliseconds discipline as
  // the clock above, so `lockRef` and `flipped` can never be left stranded by a pause.
  const armPeek = useCallback(() => {
    peekAtRef.current = performance.now();
    peekRef.current = setTimeout(() => {
      peekRef.current = null;
      peekLeftRef.current = 0;
      lockRef.current = false;
      flippedRef.current = [];
      setFlipped([]);
    }, peekLeftRef.current);
  }, []);

  const holdPeek = useCallback(() => {
    if (peekRef.current == null) return;
    clearTimeout(peekRef.current);
    peekRef.current = null;
    peekLeftRef.current = Math.max(0, peekLeftRef.current - (performance.now() - peekAtRef.current));
  }, []);

  const initGame = useCallback((nextPairs) => {
    clearTimeout(peekRef.current);
    peekRef.current = null;
    peekLeftRef.current = 0;
    lockRef.current = false;
    dealRef.current += 1;

    const deck = dealCards(nextPairs, dealRef.current);
    cardsRef.current = deck;
    setCards(deck);
    flippedRef.current = [];
    setFlipped([]);
    solvedRef.current = [];
    setSolved([]);
    movesRef.current = 0;
    setMoves(0);
    accumRef.current = 0;
    runStartRef.current = null;
    setElapsed(0);
    statusRef.current = 'idle';
    setStatus('idle');
    setPairs(nextPairs);
  }, []);

  // A pending peek timer outlives the component otherwise, and it writes state when it fires.
  useEffect(() => () => clearTimeout(peekRef.current), []);

  useEffect(() => {
    if (status !== 'playing') return undefined;
    const id = setInterval(() => {
      if (runStartRef.current == null) return;
      setElapsed(Math.floor((accumRef.current + (performance.now() - runStartRef.current)) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [status]);

  const flip = (index) => {
    const phase = statusRef.current;
    if (phase !== 'idle' && phase !== 'playing') return;
    if (lockRef.current) return;
    if (solvedRef.current.includes(index) || flippedRef.current.includes(index)) return;

    // The clock starts on the first card, not on mount — otherwise the timer is already running
    // while the player is still reading the how-to-play overlay.
    if (phase === 'idle') {
      startClock();
      statusRef.current = 'playing';
      setStatus('playing');
    }

    play('flip');
    const next = [...flippedRef.current, index];
    flippedRef.current = next;
    setFlipped(next);
    if (next.length < 2) return;

    const movesNow = movesRef.current + 1;
    movesRef.current = movesNow;
    setMoves(movesNow);

    const [a, b] = next;
    if (cardsRef.current[a].label !== cardsRef.current[b].label) {
      play('wrong');
      lockRef.current = true;
      peekLeftRef.current = PEEK_MS;
      armPeek();
      return;
    }

    // Matched cards move from `flipped` to `solved` in the same turn; both lists feed the same
    // face-up test, so the pair never blinks between the two.
    const solvedNow = [...solvedRef.current, a, b];
    solvedRef.current = solvedNow;
    setSolved(solvedNow);
    flippedRef.current = [];
    setFlipped([]);

    if (solvedNow.length < cardsRef.current.length) {
      play('match');
      return;
    }

    bankClock();
    statusRef.current = 'won';
    setStatus('won');
    play('win');
    submitBest(movesNow);
    unlockAchievement('memory_master');
  };

  const togglePause = () => {
    if (statusRef.current === 'playing') {
      bankClock();
      holdPeek();
      statusRef.current = 'paused';
      setStatus('paused');
    } else if (statusRef.current === 'paused') {
      startClock();
      // Keyed off the lock rather than off a stored handle: the lock is what a pending peek exists
      // to hold, so re-arming whenever it is set means the lock can never outlive its timer.
      if (lockRef.current) armPeek();
      statusRef.current = 'playing';
      setStatus('playing');
    }
  };

  // Memory has no directional input — the whole game is taps. useGameInput is still the source of
  // board props because it is the only thing that binds keys to the BOARD element; a window
  // listener would let a minimized game keep eating Escape for the whole OS. Its swipe handler
  // ignores travel under 24px, so a tap on a card is never also read as a gesture.
  const noDirection = useCallback(() => {}, []);
  const boardProps = useGameInput(noDirection, { onPause: togglePause });

  const layout = LAYOUTS[pairs];
  const interactive = status === 'idle' || status === 'playing';

  return (
    <GameShell
      gameId="memory"
      onBack={onBack}
      score={moves}
      best={best}
      scoreLabel="Moves"
      bestLabel="Fewest"
      status={status}
      onRestart={() => initGame(pairs)}
      onTogglePause={togglePause}
      boardProps={boardProps}
      headerExtra={(
        <div className="text-right">
          <p className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em] leading-none">Time</p>
          <p className="text-lg md:text-xl font-black tabular-nums leading-tight text-os-secondary">{mmss(elapsed)}</p>
        </div>
      )}
      overlay={(
        <>
          <div className="w-14 h-14 rounded-full bg-sdl-accent flex items-center justify-center mb-4 shadow-[var(--sdl-lift)]">
            <Trophy size={28} className="text-sdl-onAccent" />
          </div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter">Board cleared</h2>
          <p className="text-os-primary text-[10px] font-black uppercase tracking-[0.25em] mt-2">
            {pairs} pairs · {moves} moves · {mmss(elapsed)}
          </p>
          {best != null && (
            <p className="text-sdl-sec text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
              Fewest at this size: {best}
            </p>
          )}
          <button
            onClick={() => initGame(pairs)}
            onKeyDown={swallowActivationKeys}
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-sdl-accent text-sdl-onAccent font-black uppercase tracking-widest text-xs rounded-sdl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
          >
            <RefreshCw size={16} />
            Deal again
          </button>
        </>
      )}
    >
      {/* Sized in viewport units rather than a fixed pixel width: at 375px the old `max-w-md`
          board ran past the edge of the screen. `maxWidth: 100%` keeps it inside a small floating
          window too, where 85vw is far wider than the window itself. */}
      <div
        className="flex flex-col items-center gap-3"
        style={{ width: `min(85vw, ${layout.maxPx}px)`, maxWidth: '100%' }}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em] mr-1">Pairs</span>
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => initGame(size)}
              onKeyDown={swallowActivationKeys}
              aria-pressed={size === pairs}
              className={`px-3 py-1 rounded-sdl-sm border text-xs font-black tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${
                size === pairs
                  ? 'bg-os-primary/20 border-os-primary/40 text-os-primary'
                  : 'bg-sdl-sunken border-hairline/10 text-sdl-sec hover:text-sdl-ink hover:bg-veil/10'
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        <div className={`grid ${layout.grid} gap-2 sm:gap-3 w-full`}>
          {cards.map((card, index) => {
            const isSolved = solved.includes(index);
            const isFaceUp = isSolved || flipped.includes(index);
            const face = faceOf(card.hue);

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => flip(index)}
                {...cardGuards(interactive)}
                aria-label={isFaceUp ? `Card ${index + 1}, ${card.label}` : `Card ${index + 1}, face down`}
                aria-pressed={isFaceUp}
                className={`aspect-square relative group rounded-sdl-lg outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${
                  interactive ? 'cursor-pointer' : 'cursor-default'
                }`}
                style={{ perspective: '1000px' }}
              >
                <motion.div
                  animate={{ rotateY: isFaceUp ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="w-full h-full relative"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div
                    className="absolute inset-0 bg-sdl-surface border border-hairline/10 rounded-sdl-lg flex items-center justify-center overflow-hidden shadow-[var(--sdl-lift)] group-hover:border-os-primary/40 transition-colors"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-veil/[0.03] to-transparent pointer-events-none" />
                    <div className="w-1/3 h-1/3 rounded-sdl bg-veil/5 border border-hairline/5 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-os-primary/40 animate-pulse" />
                    </div>
                  </div>

                  <div
                    className="absolute inset-0 border-2 rounded-sdl-lg flex flex-col items-center justify-center shadow-[var(--sdl-lift)]"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      // A solved pair drops out of the symbol palette and back onto plain surface —
                      // that is chrome again, so it follows the colorway rather than staying near-black.
                      backgroundColor: isSolved ? 'var(--sdl-surface)' : face.tile,
                      borderColor: isSolved ? 'rgb(var(--sdl-hairline-rgb) / .05)' : face.tileBorder,
                    }}
                  >
                    {/* Percentage sizing, not a `size` prop: the same glyph has to read on a 110px
                        card at six pairs and a 55px card at twelve. */}
                    <card.icon
                      className="w-[34%] h-[34%]"
                      style={{
                        color: face.glyph,
                        filter: isSolved ? 'grayscale(1) opacity(0.25)' : `drop-shadow(0 0 10px ${face.tile})`,
                      }}
                    />
                    {layout.showLabel && !isSolved && (
                      <span
                        className="text-[8px] font-black uppercase tracking-[0.2em] mt-2 opacity-40 hidden sm:block"
                        style={{ color: face.glyph }}
                      >
                        {card.label}
                      </span>
                    )}
                  </div>
                </motion.div>
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
};

export default MemoryGame;
