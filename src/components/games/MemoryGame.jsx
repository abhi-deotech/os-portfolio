import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, ArrowLeft, Brain, Cpu, Zap, Timer, Layers, Globe, ShieldCheck } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { useColorway } from '../../theme/useColorway';
import { iconStyle } from '../../theme/icons';

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

const MemoryGame = ({ onBack }) => {
  const [cards, setCards] = useState(() => {
    const duplicatedSymbols = [...SYMBOLS, ...SYMBOLS];
    return duplicatedSymbols
      .sort(() => Math.random() - 0.5)
      .map((item, index) => ({ id: index, ...item }));
  });
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const [disabled, setDisabled] = useState(false);
  const [moves, setMoves] = useState(0);
  const [bestMoves, setBestScore] = useState(localStorage.getItem('memory-best-moves') || '--');
  const { unlockAchievement } = useOSStore();
  // Resolved at render, not stored on the card: the board must retint when the colorway changes
  // mid-game, and shuffled state should not carry a frozen palette.
  const cw = useColorway();
  const faceOf = (hue) => iconStyle('harmonized', cw, { hue });

  const initGame = () => {
    const duplicatedSymbols = [...SYMBOLS, ...SYMBOLS];
    const shuffled = duplicatedSymbols
      .sort(() => Math.random() - 0.5)
      .map((item, index) => ({ id: index, ...item }));
    setCards(shuffled);
    setFlipped([]);
    setSolved([]);
    setMoves(0);
    setDisabled(false);
  };


  const handleClick = (index) => {
    if (disabled || flipped.includes(index) || solved.includes(index)) return;
    
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setDisabled(true);
      setMoves(m => m + 1);
      
      const [first, second] = newFlipped;
      if (cards[first].label === cards[second].label) {
        const newSolved = [...solved, first, second];
        setSolved(newSolved);
        
        if (newSolved.length === cards.length) {
          if (bestMoves === '--' || moves + 1 < bestMoves) {
            setBestScore(moves + 1);
            localStorage.setItem('memory-best-moves', moves + 1);
          }
          unlockAchievement('memory_master');
        }
        
        setFlipped([]);
        setDisabled(false);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setDisabled(false);
        }, 1000);
      }
    }
  };

  const isGameOver = solved.length === cards.length && cards.length > 0;

  return (
    <div className="h-full w-full bg-sdl-plane text-sdl-ink flex flex-col items-center p-6 relative overflow-hidden select-none font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgb(var(--sdl-accent-rgb)/0.03)_0%,transparent_70%)] pointer-events-none" />
      
      {/* Header */}
      <div className="w-full max-w-lg flex justify-between items-center mb-8 relative z-10">
        <motion.button 
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          aria-label="Back"
          className="p-3 rounded-2xl bg-veil/5 border border-hairline/10 hover:bg-veil/10 transition-all text-sdl-sec hover:text-sdl-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
        >
          <ArrowLeft size={20} />
        </motion.button>
        
        <div className="flex gap-8">
           <div className="text-center">
              <p className="text-[10px] font-black text-sdl-sec uppercase tracking-[0.3em] mb-1">Cycles</p>
              <p className="text-2xl font-black italic text-os-primary tracking-tighter tabular-nums leading-none">
                {moves.toString().padStart(2, '0')}
              </p>
           </div>
           <div className="text-center">
              <p className="text-[10px] font-black text-sdl-sec uppercase tracking-[0.3em] mb-1">Min Peak</p>
              <p className="text-2xl font-black italic text-sdl-sec tracking-tighter tabular-nums leading-none">
                {bestMoves.toString().padStart(2, '0')}
              </p>
           </div>
        </div>

        <motion.button 
          whileHover={{ rotate: 180, scale: 1.1 }}
          transition={{ duration: 0.5 }}
          onClick={initGame}
          aria-label="Restart"
          className="p-3 rounded-2xl bg-os-primary/10 border border-os-primary/20 text-os-primary hover:bg-os-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
        >
          <RefreshCw size={20} />
        </motion.button>
      </div>

      <div className="grid grid-cols-4 gap-3 md:gap-4 max-w-md w-full relative z-10">
        {cards.map((card, index) => {
          const isFlipped = flipped.includes(index) || solved.includes(index);
          const isSolved = solved.includes(index);
          
          return (
            <div
              key={card.id}
              onClick={() => handleClick(index)}
              // Without the button contract the entire board is mouse-only — there is no other way
              // to turn a card over.
              role="button"
              tabIndex={0}
              aria-label={isFlipped ? `Card ${index + 1}, ${card.label}` : `Card ${index + 1}, face down`}
              aria-pressed={isFlipped}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick(index);
                }
              }}
              className="aspect-square cursor-pointer relative group rounded-[1.5rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
              style={{ perspective: '1000px' }}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="w-full h-full relative"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Card Front (Hidden side) */}
                <div 
                  className="absolute inset-0 bg-sdl-surface border border-hairline/10 rounded-[1.5rem] flex items-center justify-center backface-hidden shadow-xl overflow-hidden group-hover:border-os-primary/40 transition-colors"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                   <div className="absolute inset-0 bg-gradient-to-br from-veil/[0.03] to-transparent pointer-events-none" />
                   <div className="w-10 h-10 rounded-2xl bg-veil/5 border border-hairline/5 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-os-primary/40 animate-pulse" />
                   </div>
                </div>
                
                {/* Card Back (Symbol side) */}
                <div 
                  className="absolute inset-0 border-2 rounded-[1.5rem] flex flex-col items-center justify-center backface-hidden shadow-2xl"
                  style={{ 
                    backfaceVisibility: 'hidden', 
                    transform: 'rotateY(180deg)',
                    // A solved pair drops out of the symbol palette and back onto plain surface —
                    // that is chrome again, so it follows the colorway rather than staying near-black.
                    backgroundColor: isSolved ? 'var(--sdl-surface)' : faceOf(card.hue).tile,
                    borderColor: isSolved ? 'rgb(var(--sdl-hairline-rgb) / .05)' : faceOf(card.hue).tileBorder
                  }}
                >
                  <card.icon
                    size={32}
                    style={{
                      color: faceOf(card.hue).glyph,
                      filter: isSolved ? 'grayscale(1) opacity(0.2)' : `drop-shadow(0 0 10px ${faceOf(card.hue).tile})`,
                    }}
                  />
                  {!isSolved && (
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-2 opacity-40" style={{ color: faceOf(card.hue).glyph }}>
                      {card.label}
                    </span>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isGameOver && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-12 flex flex-col items-center gap-4 bg-os-primary/10 border border-os-primary/20 p-8 rounded-[3rem] backdrop-blur-xl"
          >
            <div className="w-16 h-16 rounded-full bg-os-primary flex items-center justify-center shadow-[0_0_30px_rgb(var(--os-primary-rgb))]">
               <Trophy size={32} className="text-sdl-onAccent" />
            </div>
            <div className="text-center">
               <h2 className="text-2xl font-black italic uppercase tracking-tighter">Sync Complete</h2>
               <p className="text-[10px] font-black text-os-primary uppercase tracking-[0.3em] mt-1">
                 System synchronized in {moves} cycles
               </p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={initGame}
              className="mt-2 px-8 py-3 bg-sdl-accent text-sdl-onAccent font-black uppercase tracking-widest rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
            >
              Restart Link
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto pt-8 flex gap-4 opacity-30">
         <div className="flex items-center gap-2">
            <Brain size={12} />
            <span className="text-[8px] font-black uppercase tracking-widest">Neural Pattern Match</span>
         </div>
         <div className="w-px h-3 bg-veil/20" />
         <div className="flex items-center gap-2">
            <Cpu size={12} />
            <span className="text-[8px] font-black uppercase tracking-widest">Cognitive Load: Low</span>
         </div>
      </div>
    </div>
  );
};

export default MemoryGame;
