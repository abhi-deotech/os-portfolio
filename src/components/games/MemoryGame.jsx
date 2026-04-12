import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, ArrowLeft, Brain, Cpu, Zap, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../../store/osStore';

const SYMBOLS = [
  { icon: Cpu, color: '#cc97ff', label: 'Processing' },
  { icon: Zap, color: '#00d2fd', label: 'Quantum' },
  { icon: Brain, color: '#00f5a0', label: 'Neural' },
  { icon: Trophy, color: '#ff68f0', label: 'Node' },
  { icon: Timer, color: '#ffd93d', label: 'Sync' },
  { icon: Layers, color: '#ff6b6b', label: 'Data' },
  { icon: Globe, color: '#4ade80', label: 'Network' },
  { icon: ShieldCheck, color: '#3b82f6', label: 'Secure' }
];

import { Layers, Globe, ShieldCheck } from 'lucide-react';

const MemoryGame = ({ onBack }) => {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const [disabled, setDisabled] = useState(false);
  const [moves, setMoves] = useState(0);
  const [bestMoves, setBestScore] = useState(localStorage.getItem('memory-best-moves') || '--');
  const { unlockAchievement } = useOSStore();

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

  useEffect(() => {
    initGame();
  }, []);

  useEffect(() => {
    if (flipped.length === 2) {
      setDisabled(true);
      setMoves(m => m + 1);
      const [first, second] = flipped;
      if (cards[first].label === cards[second].label) {
        setSolved(prev => {
           const newSolved = [...prev, first, second];
           if (newSolved.length === cards.length) {
              if (bestMoves === '--' || moves + 1 < bestMoves) {
                 setBestScore(moves + 1);
                 localStorage.setItem('memory-best-moves', moves + 1);
              }
              unlockAchievement('memory_master');
           }
           return newSolved;
        });
        setFlipped([]);
        setDisabled(false);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setDisabled(false);
        }, 1000);
      }
    }
  }, [flipped, cards, moves, bestMoves, unlockAchievement]);

  const handleClick = (index) => {
    if (disabled || flipped.includes(index) || solved.includes(index)) return;
    setFlipped(prev => [...prev, index]);
  };

  const isGameOver = solved.length === cards.length && cards.length > 0;

  return (
    <div className="h-full w-full bg-[#050505] text-white flex flex-col items-center p-6 relative overflow-hidden select-none font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(204,151,255,0.03)_0%,transparent_70%)] pointer-events-none" />
      
      {/* Header */}
      <div className="w-full max-w-lg flex justify-between items-center mb-8 relative z-10">
        <motion.button 
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white"
        >
          <ArrowLeft size={20} />
        </motion.button>
        
        <div className="flex gap-8">
           <div className="text-center">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Cycles</p>
              <p className="text-2xl font-black italic text-os-primary tracking-tighter tabular-nums leading-none">
                {moves.toString().padStart(2, '0')}
              </p>
           </div>
           <div className="text-center">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Min Peak</p>
              <p className="text-2xl font-black italic text-white/40 tracking-tighter tabular-nums leading-none">
                {bestMoves.toString().padStart(2, '0')}
              </p>
           </div>
        </div>

        <motion.button 
          whileHover={{ rotate: 180, scale: 1.1 }}
          transition={{ duration: 0.5 }}
          onClick={initGame}
          className="p-3 rounded-2xl bg-os-primary/10 border border-os-primary/20 text-os-primary hover:bg-os-primary/20 transition-all"
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
              className="aspect-square cursor-pointer relative group"
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
                  className="absolute inset-0 bg-[#0a0a0a] border border-white/10 rounded-[1.5rem] flex items-center justify-center backface-hidden shadow-xl overflow-hidden group-hover:border-os-primary/40 transition-colors"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                   <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
                   <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-os-primary/40 animate-pulse" />
                   </div>
                </div>
                
                {/* Card Back (Symbol side) */}
                <div 
                  className="absolute inset-0 border-2 rounded-[1.5rem] flex flex-col items-center justify-center backface-hidden shadow-2xl"
                  style={{ 
                    backfaceVisibility: 'hidden', 
                    transform: 'rotateY(180deg)',
                    backgroundColor: isSolved ? '#0a0a0a' : `${card.color}15`,
                    borderColor: isSolved ? 'rgba(255,255,255,0.05)' : card.color
                  }}
                >
                  <card.icon 
                    size={32} 
                    style={{ color: card.color, filter: isSolved ? 'grayscale(1) opacity(0.2)' : `drop-shadow(0 0 10px ${card.color}40)` }} 
                  />
                  {!isSolved && (
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] mt-2 opacity-40" style={{ color: card.color }}>
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
            <div className="w-16 h-16 rounded-full bg-os-primary flex items-center justify-center shadow-[0_0_30px_#cc97ff]">
               <Trophy size={32} className="text-black" />
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
              className="mt-2 px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-2xl"
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
         <div className="w-px h-3 bg-white/20" />
         <div className="flex items-center gap-2">
            <Cpu size={12} />
            <span className="text-[8px] font-black uppercase tracking-widest">Cognitive Load: Low</span>
         </div>
      </div>
    </div>
  );
};

export default MemoryGame;
