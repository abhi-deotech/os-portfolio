import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Timer, Flame, Trophy, RotateCcw } from 'lucide-react';
import GameShell from './GameShell';
import useGameLoop from '../../hooks/useGameLoop';
import useGameInput from '../../hooks/useGameInput';
import useGameAudio from '../../hooks/useGameAudio';
import useHighScore from '../../hooks/useHighScore';
import useOSStore from '../../store/osStore';

/**
 * Trivia Quest.
 *
 * This used to fetch ten questions from opentdb.com on mount, which meant the game was a blank
 * "Accessing Vault" spinner without a network — inside a portfolio OS that otherwise runs entirely
 * offline — and the whole app then rendered a full-screen "Connection Breach" panel that swallowed
 * the game chrome. The bank below is bundled, so the game always starts, always starts instantly,
 * and every question is one we can vouch for rather than whatever the API returned.
 */

/**
 * The question bank.
 *
 * The correct answer is ALWAYS written first in source. That is not the order the player sees —
 * `prepareQuestion` shuffles the four options per question — but it makes the bank auditable at a
 * glance: to fact-check a question you read one line and check the first option, with no index
 * arithmetic to get wrong. Getting a `correct: 2` out of sync with a reordered options array is
 * exactly the kind of silent error a quiz cannot detect at runtime.
 *
 * Kept to settled, uncontested facts. No "largest / most / record" superlatives that a single
 * season or election can invalidate, and no invented statistics.
 */
const Q = (category, difficulty, question, options) => ({ category, difficulty, question, options });

const BANK = [
  // — Science —
  Q('Science', 'easy', 'What is the chemical symbol for gold?', ['Au', 'Ag', 'Gd', 'Go']),
  Q('Science', 'easy', 'Which planet orbits closest to the Sun?', ['Mercury', 'Venus', 'Earth', 'Mars']),
  Q('Science', 'easy', 'Which gas do plants take from the air for photosynthesis?', ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen']),
  Q('Science', 'easy', 'Which blood cells carry oxygen around the body?', ['Red blood cells', 'White blood cells', 'Platelets', 'Plasma cells']),
  Q('Science', 'easy', 'Which organelle is described as the powerhouse of the cell?', ['Mitochondrion', 'Ribosome', 'Nucleus', 'Golgi apparatus']),
  Q('Science', 'easy', 'Who published the general theory of relativity?', ['Albert Einstein', 'Isaac Newton', 'Niels Bohr', 'Max Planck']),
  Q('Science', 'medium', 'How many bones are there in a typical adult human body?', ['206', '186', '226', '246']),
  Q('Science', 'medium', 'Which gas makes up roughly 78% of Earth’s atmosphere?', ['Nitrogen', 'Oxygen', 'Argon', 'Carbon dioxide']),
  Q('Science', 'medium', 'What is the SI unit of electrical resistance?', ['Ohm', 'Volt', 'Ampere', 'Watt']),
  Q('Science', 'medium', 'What is the atomic number of carbon?', ['6', '8', '12', '14']),
  Q('Science', 'medium', 'Which naturally occurring mineral sits at 10 on the Mohs hardness scale?', ['Diamond', 'Quartz', 'Topaz', 'Corundum']),
  Q('Science', 'hard', 'Who published an early periodic table based on the periodic law in 1869?', ['Dmitri Mendeleev', 'Antoine Lavoisier', 'John Dalton', 'Robert Boyle']),

  // — History —
  Q('History', 'easy', 'In which year did the Second World War end?', ['1945', '1944', '1946', '1939']),
  Q('History', 'easy', 'Who was the first President of the United States?', ['George Washington', 'Thomas Jefferson', 'John Adams', 'Benjamin Franklin']),
  Q('History', 'easy', 'In which year did the Berlin Wall fall?', ['1989', '1987', '1991', '1985']),
  Q('History', 'easy', 'Which empire did Genghis Khan found?', ['The Mongol Empire', 'The Ottoman Empire', 'The Persian Empire', 'The Byzantine Empire']),
  Q('History', 'easy', 'Who led the Salt March in India in 1930?', ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Sardar Patel', 'B. R. Ambedkar']),
  Q('History', 'easy', 'Which Roman city was buried by the eruption of Mount Vesuvius in AD 79?', ['Pompeii', 'Carthage', 'Ephesus', 'Syracuse']),
  Q('History', 'easy', 'In which year did Apollo 11 land humans on the Moon?', ['1969', '1967', '1971', '1972']),
  Q('History', 'medium', 'Which civilisation built Machu Picchu?', ['The Inca', 'The Aztecs', 'The Maya', 'The Olmecs']),
  Q('History', 'medium', 'Who was the first woman to be awarded a Nobel Prize?', ['Marie Curie', 'Irène Joliot-Curie', 'Dorothy Hodgkin', 'Rosalind Franklin']),
  Q('History', 'medium', 'In which year was Magna Carta sealed?', ['1215', '1066', '1314', '1492']),
  Q('History', 'medium', 'Who was the last Tsar of Russia?', ['Nicholas II', 'Alexander III', 'Peter III', 'Paul I']),

  // — Geography —
  Q('Geography', 'easy', 'Which river flows through the Amazon rainforest and empties into the Atlantic?', ['The Amazon', 'The Paraná', 'The Orinoco', 'The São Francisco']),
  Q('Geography', 'easy', 'Which country covers the largest land area?', ['Russia', 'Canada', 'China', 'The United States']),
  Q('Geography', 'easy', 'Which is the smallest sovereign state in the world by area?', ['Vatican City', 'Monaco', 'Nauru', 'San Marino']),
  Q('Geography', 'easy', 'The Sahara stretches across the north of which continent?', ['Africa', 'Asia', 'Australia', 'South America']),
  Q('Geography', 'easy', 'What is the capital of Canada?', ['Ottawa', 'Toronto', 'Vancouver', 'Montreal']),
  Q('Geography', 'medium', 'What is the capital of Australia?', ['Canberra', 'Sydney', 'Melbourne', 'Perth']),
  Q('Geography', 'medium', 'Mount Kilimanjaro stands in which country?', ['Tanzania', 'Kenya', 'Uganda', 'Ethiopia']),
  Q('Geography', 'medium', 'Which ocean contains the Mariana Trench, the deepest point on Earth?', ['The Pacific', 'The Atlantic', 'The Indian', 'The Arctic']),
  Q('Geography', 'medium', 'Which strait separates Europe from Africa at their closest point?', ['The Strait of Gibraltar', 'The Bosphorus', 'The Strait of Hormuz', 'The Bering Strait']),
  Q('Geography', 'medium', 'Sognefjord, the longest fjord in its country, is in which nation?', ['Norway', 'Sweden', 'Denmark', 'Finland']),
  Q('Geography', 'medium', 'Lake Baikal, the deepest lake in the world, lies in which country?', ['Russia', 'Mongolia', 'Kazakhstan', 'China']),

  // — Tech —
  Q('Tech', 'easy', 'What does HTTP stand for?', ['HyperText Transfer Protocol', 'HyperText Transit Path', 'High Throughput Transfer Protocol', 'Hyperlink Transport Program']),
  Q('Tech', 'easy', 'Who is credited with inventing the World Wide Web?', ['Tim Berners-Lee', 'Vint Cerf', 'Bill Gates', 'Linus Torvalds']),
  Q('Tech', 'easy', 'Which language did Guido van Rossum create?', ['Python', 'Ruby', 'Perl', 'PHP']),
  Q('Tech', 'easy', 'What does CPU stand for?', ['Central Processing Unit', 'Computer Power Unit', 'Central Program Utility', 'Core Processing Underlayer']),
  Q('Tech', 'easy', 'Who wrote the first version of the Linux kernel?', ['Linus Torvalds', 'Richard Stallman', 'Ken Thompson', 'Dennis Ritchie']),
  Q('Tech', 'easy', 'Which data structure follows last-in, first-out ordering?', ['A stack', 'A queue', 'A linked list', 'A heap']),
  Q('Tech', 'easy', 'What does SQL stand for?', ['Structured Query Language', 'Sequential Query Logic', 'Standard Question Language', 'System Query Layer']),
  Q('Tech', 'easy', 'Which language runs natively in every modern web browser?', ['JavaScript', 'Java', 'C#', 'Swift']),
  Q('Tech', 'easy', 'What does RAM stand for?', ['Random Access Memory', 'Rapid Archive Module', 'Readable Active Memory', 'Runtime Allocation Map']),
  Q('Tech', 'medium', 'What is the decimal number 8 written in binary?', ['1000', '1100', '0110', '1010']),
  Q('Tech', 'medium', 'Which system translates domain names into IP addresses?', ['DNS', 'DHCP', 'FTP', 'SMTP']),
  Q('Tech', 'medium', 'Ada Lovelace wrote her celebrated notes about which of Babbage’s machines?', ['The Analytical Engine', 'The Difference Engine', 'ENIAC', 'The Jacquard loom']),

  // — Arts —
  Q('Arts', 'easy', 'Who painted the Mona Lisa?', ['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Sandro Botticelli']),
  Q('Arts', 'easy', 'Who wrote the play Romeo and Juliet?', ['William Shakespeare', 'Christopher Marlowe', 'Ben Jonson', 'John Webster']),
  Q('Arts', 'easy', 'Which painter famously cut off part of his own ear in 1888?', ['Vincent van Gogh', 'Paul Gauguin', 'Edvard Munch', 'Henri Matisse']),
  Q('Arts', 'easy', 'How many strings does a standard violin have?', ['Four', 'Five', 'Six', 'Three']),
  Q('Arts', 'easy', 'In which city is the Louvre?', ['Paris', 'Madrid', 'Rome', 'Vienna']),
  Q('Arts', 'easy', 'Which movement is Salvador Dalí most associated with?', ['Surrealism', 'Cubism', 'Impressionism', 'Futurism']),
  Q('Arts', 'easy', 'How many keys does a standard modern piano have?', ['88', '76', '96', '64']),
  Q('Arts', 'medium', 'Who composed the violin concertos known as The Four Seasons?', ['Antonio Vivaldi', 'Johann Sebastian Bach', 'Joseph Haydn', 'George Frideric Handel']),
  Q('Arts', 'medium', 'Which Herman Melville novel opens with the words "Call me Ishmael"?', ['Moby-Dick', 'Billy Budd', 'Typee', 'Redburn']),
  Q('Arts', 'medium', 'Who wrote One Hundred Years of Solitude?', ['Gabriel García Márquez', 'Mario Vargas Llosa', 'Jorge Luis Borges', 'Pablo Neruda']),
  Q('Arts', 'medium', 'Who sculpted the marble David that stands in Florence?', ['Michelangelo', 'Donatello', 'Gian Lorenzo Bernini', 'Benvenuto Cellini']),

  // — Sport —
  Q('Sport', 'easy', 'How many players from each team are on the pitch in association football?', ['Eleven', 'Ten', 'Nine', 'Twelve']),
  Q('Sport', 'easy', 'How many rings appear on the Olympic flag?', ['Five', 'Four', 'Six', 'Seven']),
  Q('Sport', 'easy', 'In tennis, what is a score of zero called?', ['Love', 'Nil', 'Duck', 'Blank']),
  Q('Sport', 'easy', 'How many players from each team are on court in basketball?', ['Five', 'Six', 'Seven', 'Four']),
  Q('Sport', 'easy', 'How many players are in a cricket team on the field?', ['Eleven', 'Ten', 'Twelve', 'Nine']),
  Q('Sport', 'easy', 'Which sport is played with a shuttlecock?', ['Badminton', 'Tennis', 'Squash', 'Table tennis']),
  Q('Sport', 'easy', 'In golf, what is a score of one stroke under par called?', ['A birdie', 'An eagle', 'A bogey', 'An albatross']),
  Q('Sport', 'easy', 'The Tour de France is a race in which sport?', ['Cycling', 'Long-distance running', 'Motor racing', 'Sailing']),
  Q('Sport', 'medium', 'In which sport is the Ryder Cup contested?', ['Golf', 'Tennis', 'Rugby union', 'Sailing']),
  Q('Sport', 'medium', 'How many points is a touchdown worth in American football?', ['Six', 'Seven', 'Three', 'Five']),
  Q('Sport', 'medium', 'Which Olympic martial art originated in Korea?', ['Taekwondo', 'Judo', 'Karate', 'Muay Thai']),
  Q('Sport', 'medium', 'How many squares are on a standard chessboard?', ['64', '81', '100', '49']),
];

const ROUND_SIZE = 12;
const QUESTION_DECI = 150;   // 15.0s per question, counted in tenths so the bar moves smoothly
const REVEAL_DECI = 18;      // 1.8s to read the result of your own answer
const TIMEOUT_DECI = 26;     // longer when you did not answer: the correct option is new information
const TICK_FROM = 3;         // seconds remaining at which the countdown starts ticking audibly
const STRONG_ROUND = 0.75;   // accuracy that earns the celebratory sting instead of the flat one

/**
 * Fisher-Yates.
 *
 * The previous implementation was `sort(() => Math.random() - 0.5)`, which is not a shuffle: the
 * comparator is inconsistent, so the result depends on the engine's sort algorithm. Measured over
 * four options in V8 it left the correct answer in slot 1 or slot 4 about 31.2% of the time each
 * against 18.8% for the middle two. In a quiz that is not a cosmetic flaw — answer position became
 * a tell, and a player who noticed could beat the game without reading the question.
 */
function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle the option ORDER, then read back where the source's first (correct) option landed. */
function prepareQuestion(entry) {
  const order = shuffle([0, 1, 2, 3]);
  return {
    ...entry,
    options: order.map((i) => entry.options[i]),
    answer: order.indexOf(0),
  };
}

/**
 * Draw a round.
 *
 * Round-robin across the categories before shuffling, so every round touches all six rather than
 * handing out five science questions by chance. A uniform draw from a 69-question bank does that
 * often enough to feel broken.
 */
function makeRound() {
  const byCategory = new Map();
  for (const entry of BANK) {
    if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
    byCategory.get(entry.category).push(entry);
  }
  const pools = shuffle([...byCategory.values()]).map(shuffle);

  const picked = [];
  for (let depth = 0; picked.length < ROUND_SIZE; depth += 1) {
    let exhausted = true;
    for (const pool of pools) {
      if (picked.length >= ROUND_SIZE) break;
      if (depth < pool.length) { picked.push(pool[depth]); exhausted = false; }
    }
    if (exhausted) break;
  }
  return shuffle(picked).map(prepareQuestion);
}

const TriviaGame = ({ onBack }) => {
  const play = useGameAudio();
  const [best, submitBest] = useHighScore('trivia', 'max');
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);

  // Lazy initialiser, so a fresh round is not drawn and thrown away on every render. `round` is
  // deliberately NOT mirrored into a ref: it only changes on restart, never mid-question, and
  // useGameLoop re-reads `step` every render — so the loop always closes over the current round.
  const [round, setRound] = useState(makeRound);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('asking');   // 'asking' | 'revealed' | 'timedout' | 'done'
  const [picked, setPicked] = useState(null);     // option index the player chose, null on timeout
  const [gain, setGain] = useState(0);            // points awarded for the question being revealed
  const [deci, setDeci] = useState(QUESTION_DECI);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [status, setStatus] = useState('playing');

  // Every ref below is written in the same statement as its setState. Nothing here is ever touched
  // from inside a `setX(prev => ...)` updater — StrictMode double-invokes those, and a ref mutation
  // that lands twice is precisely the bug that made 2048 score 8 for a single merge of two 2s.
  const indexRef = useRef(0);
  const phaseRef = useRef('asking');
  const deciRef = useRef(QUESTION_DECI);
  const revealRef = useRef(0);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const correctRef = useRef(0);
  const statusRef = useRef('playing');

  // The last whole second we played a tick for, so the 10Hz loop cannot fire ten ticks per second.
  const tickedSecondRef = useRef(0);

  // Which question index has already been advanced past. The old build had no such guard: a
  // timeout scheduled `handleAnswer(null)`, which scheduled its own 1500ms advance, while the
  // interval could fire again first — two advances landed and a question was skipped unseen.
  const advancedRef = useRef(-1);

  // Correct answers for the whole session, not just this round. The achievement reads "answered 10
  // trivia questions correctly"; making a player get 10 inside one 12-question round would be a
  // stricter bar than the wording promises, and restarting mid-round would silently reset progress.
  const sessionCorrectRef = useRef(0);

  const question = round[index];

  const endRound = useCallback(() => {
    phaseRef.current = 'done';
    setPhase('done');
    statusRef.current = 'over';
    setStatus('over');
    submitBest(scoreRef.current);
    play(correctRef.current / round.length >= STRONG_ROUND ? 'win' : 'lose');
  }, [play, submitBest, round.length]);

  const advance = useCallback(() => {
    const i = indexRef.current;
    // The guard, not a debounce: a second caller for the same question is a bug, not a fast player.
    if (advancedRef.current === i) return;
    advancedRef.current = i;

    if (i + 1 >= round.length) { endRound(); return; }

    indexRef.current = i + 1;
    setIndex(i + 1);
    phaseRef.current = 'asking';
    setPhase('asking');
    setPicked(null);
    setGain(0);
    deciRef.current = QUESTION_DECI;
    setDeci(QUESTION_DECI);
    tickedSecondRef.current = 0;
  }, [endRound, round.length]);

  /**
   * Settle the current question. `choice` is an option index, or null when the clock ran out.
   *
   * The clock reaching zero used to leave the question fully answerable: options stayed live, a
   * click at 0s still scored, and the correct answer was never shown. Timing out is now its own
   * terminal state for the question — input frozen, answer revealed, exactly one advance queued.
   */
  const resolve = useCallback((choice) => {
    if (statusRef.current !== 'playing' || phaseRef.current !== 'asking') return;

    const q = round[indexRef.current];
    const timedOut = choice === null;
    const isRight = !timedOut && choice === q.answer;

    if (isRight) {
      // Speed and streak are both worth points so that a confident run feels different from a
      // lucky one, and the breakdown is shown on the reveal rather than left to be reverse-engineered.
      const secondsLeft = Math.max(0, Math.ceil(deciRef.current / 10));
      const award = 100 + secondsLeft * 10 + Math.min(streakRef.current, 5) * 20;

      scoreRef.current += award;
      setScore(scoreRef.current);
      setGain(award);

      streakRef.current += 1;
      setStreak(streakRef.current);
      if (streakRef.current > bestStreakRef.current) {
        bestStreakRef.current = streakRef.current;
        setBestStreak(streakRef.current);
      }

      correctRef.current += 1;
      setCorrect(correctRef.current);

      sessionCorrectRef.current += 1;
      if (sessionCorrectRef.current >= 10) unlockAchievement('trivia_expert');

      play('match');
    } else {
      streakRef.current = 0;
      setStreak(0);
      setGain(0);
      play('wrong');
    }

    setPicked(choice);
    phaseRef.current = timedOut ? 'timedout' : 'revealed';
    setPhase(phaseRef.current);
    revealRef.current = timedOut ? TIMEOUT_DECI : REVEAL_DECI;
  }, [play, unlockAchievement, round]);

  /**
   * One 100ms tick drives both countdowns.
   *
   * Running the reveal delay off the same loop rather than a `setTimeout` is what makes pause
   * honest: the shell's pause stops the loop, so a paused reveal genuinely holds instead of
   * quietly advancing behind the overlay. It also means there is no stray timer to clean up.
   */
  const step = useCallback(() => {
    if (phaseRef.current === 'asking') {
      const next = deciRef.current - 1;
      deciRef.current = next;
      setDeci(next);

      const secondsLeft = Math.ceil(next / 10);
      if (next > 0 && secondsLeft <= TICK_FROM && secondsLeft !== tickedSecondRef.current) {
        tickedSecondRef.current = secondsLeft;
        play('tick');
      }
      if (next <= 0) resolve(null);
      return;
    }

    if (phaseRef.current === 'revealed' || phaseRef.current === 'timedout') {
      revealRef.current -= 1;
      if (revealRef.current <= 0) advance();
    }
  }, [advance, play, resolve]);

  useGameLoop(step, 100, status === 'playing');

  const restart = useCallback(() => {
    setRound(makeRound());
    indexRef.current = 0;
    setIndex(0);
    advancedRef.current = -1;
    phaseRef.current = 'asking';
    setPhase('asking');
    setPicked(null);
    setGain(0);
    deciRef.current = QUESTION_DECI;
    setDeci(QUESTION_DECI);
    revealRef.current = 0;
    tickedSecondRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    streakRef.current = 0;
    setStreak(0);
    bestStreakRef.current = 0;
    setBestStreak(0);
    correctRef.current = 0;
    setCorrect(0);
    statusRef.current = 'playing';
    setStatus('playing');
  }, []);

  const togglePause = useCallback(() => {
    if (statusRef.current === 'playing') { statusRef.current = 'paused'; setStatus('paused'); }
    else if (statusRef.current === 'paused') { statusRef.current = 'playing'; setStatus('playing'); }
  }, []);

  const onKey = useCallback((key) => {
    if (statusRef.current !== 'playing') return false;
    // Enter skips the rest of a reveal. `advance` is idempotent per question, so mashing it cannot
    // jump two questions the way the old double-scheduled advance could.
    if (key === 'Enter') {
      if (phaseRef.current === 'asking') return false;
      advance();
      return true;
    }
    const n = Number(key);
    if (Number.isInteger(n) && n >= 1 && n <= 4) { resolve(n - 1); return true; }
    return false;
  }, [advance, resolve]);

  // Arrows and swipes are deliberately inert here. Mapping four options onto four directions reads
  // clever and plays badly: a stray scroll gesture on a phone would burn a question with no undo.
  // They are still routed through the hook so they cannot scroll the desktop underneath.
  const noDirection = useCallback(() => {}, []);
  const inputProps = useGameInput(noDirection, {
    enabled: status === 'playing',
    onPause: togglePause,
    onKey,
  });

  const revealing = phase === 'revealed' || phase === 'timedout';
  const secondsLeft = Math.max(0, Math.ceil(deci / 10));
  const urgent = phase === 'asking' && secondsLeft <= TICK_FROM;
  const accuracy = Math.round((correct / round.length) * 100);

  return (
    <GameShell
      gameId="trivia"
      onBack={onBack}
      score={score}
      best={best}
      status={status}
      onRestart={restart}
      onTogglePause={togglePause}
      boardProps={inputProps}
      headerExtra={(
        <div className="text-right hidden sm:block">
          <p className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em] leading-none">Streak</p>
          <p className={`text-lg md:text-xl font-black tabular-nums leading-tight ${streak > 0 ? 'text-os-secondary' : 'text-sdl-sec'}`}>
            {streak}
          </p>
        </div>
      )}
      overlay={(
        <>
          <Trophy size={36} className="text-os-secondary mb-3" />
          <h2 className="text-xl font-black italic uppercase tracking-tighter">
            {accuracy >= 90 ? 'Flawless run' : accuracy >= 75 ? 'Strong round' : accuracy >= 50 ? 'Round complete' : 'Room to grow'}
          </h2>
          <p className="text-sdl-sec text-[10px] font-black uppercase tracking-[0.25em] mt-1.5">
            {correct} of {round.length} correct
          </p>

          <div className="grid grid-cols-3 gap-2 mt-5 w-full max-w-xs">
            <Stat label="Score" value={score} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Streak" value={bestStreak} />
          </div>

          <button
            onClick={restart}
            className="mt-6 px-6 py-3 rounded-2xl bg-sdl-accent text-sdl-onAccent font-black uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
          >
            <RotateCcw size={14} /> New round
          </button>
        </>
      )}
    >
      <div className="w-[min(88vw,42rem)] max-w-full flex flex-col gap-4 p-4 sm:p-5 rounded-[2rem] bg-sdl-surface border border-hairline/10 shadow-lift">
        {/* Meta line. Streak lives here below the `sm` breakpoint because the shell header already
            carries a back button, a title and two readouts — a fifth block overflows at 375px. */}
        <div className="flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-[0.2em] min-w-0">
          <span className="text-os-secondary truncate">
            {question.category}
            <span className="text-sdl-sec"> · {question.difficulty}</span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <span className="sm:hidden flex items-center gap-1 text-os-secondary">
              <Flame size={11} /> {streak}
            </span>
            <span className="text-sdl-sec tabular-nums">{index + 1} / {round.length}</span>
          </span>
        </div>

        {/* Countdown. The numeric readout stays visible during the reveal, frozen at the value the
            answer was worth, rather than continuing to run under a question that is already over. */}
        <div className="flex items-center gap-3">
          <Timer size={15} className={urgent ? 'text-sdl-alert' : 'text-sdl-sec'} />
          <div className="flex-1 h-1.5 rounded-full bg-sdl-sunken overflow-hidden">
            <div
              className={`h-full rounded-full ${urgent ? 'bg-sdl-alert' : 'bg-os-primary'}`}
              style={{ width: `${Math.max(0, (deci / QUESTION_DECI) * 100)}%` }}
            />
          </div>
          <span className={`text-sm font-black tabular-nums w-8 text-right ${urgent ? 'text-sdl-alert' : 'text-sdl-ink'}`}>
            {secondsLeft}s
          </span>
        </div>

        {/* Keyed remount rather than AnimatePresence: in a non-compositing preview an exit
            animation never completes, and `mode="wait"` would hold the NEXT question hostage
            behind an exit that never finishes. Entry-only animation cannot deadlock. */}
        <motion.h2
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="text-base sm:text-xl font-black leading-snug tracking-tight text-sdl-ink min-h-[3.5rem]"
        >
          {question.question}
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {question.options.map((option, i) => {
            const isAnswer = i === question.answer;
            const isPicked = i === picked;

            let tone = 'bg-sdl-sunken border-hairline/10 text-sdl-ink hover:border-os-primary/50 hover:bg-veil/10';
            if (revealing) {
              if (isAnswer) tone = 'bg-os-primary/15 border-os-primary text-os-primary';
              else if (isPicked) tone = 'bg-sdl-alert/15 border-sdl-alert text-sdl-alert';
              else tone = 'bg-sdl-sunken border-hairline/10 text-sdl-sec opacity-50';
            }

            return (
              <button
                key={`${index}-${option}`}
                onClick={() => resolve(i)}
                disabled={revealing || status !== 'playing'}
                className={`min-h-[3.25rem] px-3.5 py-3 rounded-2xl border-2 text-left flex items-center gap-3 transition-colors duration-200 disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${tone}`}
              >
                <span className="shrink-0 w-6 h-6 rounded-lg bg-veil/10 border border-hairline/10 grid place-items-center text-[10px] font-black tabular-nums">
                  {i + 1}
                </span>
                <span className="font-bold text-sm leading-tight flex-1 min-w-0">{option}</span>
                {revealing && isAnswer && <CheckCircle2 size={18} className="shrink-0" />}
                {revealing && isPicked && !isAnswer && <XCircle size={18} className="shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Reserved height, so the board does not jump by 40px every time a reveal appears. */}
        <div className="min-h-[2.5rem] flex items-center justify-center text-center">
          {revealing ? (
            <motion.p
              key={`reveal-${index}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="text-[11px] font-black uppercase tracking-[0.18em]"
            >
              {picked === question.answer ? (
                <span className="text-os-primary">Correct · +{gain}</span>
              ) : phase === 'timedout' ? (
                <span className="text-sdl-alert">Time up · the answer is highlighted</span>
              ) : (
                <span className="text-sdl-alert">Not quite · streak reset</span>
              )}
            </motion.p>
          ) : (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sdl-sec">
              Tap an answer, or press 1–4
            </p>
          )}
        </div>
      </div>
    </GameShell>
  );
};

const Stat = ({ label, value }) => (
  <div className="rounded-2xl bg-sdl-sunken border border-hairline/10 px-2 py-2.5">
    <p className="text-[8px] font-black uppercase tracking-[0.18em] text-sdl-sec leading-none">{label}</p>
    <p className="text-lg font-black tabular-nums text-sdl-ink leading-tight mt-1">{value}</p>
  </div>
);

export default TriviaGame;
