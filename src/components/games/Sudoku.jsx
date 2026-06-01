import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, RefreshCw, ArrowLeft, XCircle, Zap, ShieldCheck, Cpu } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../../store/osStore';
import CustomIcon from '../common/CustomIcon';

    const PUZZLE = [
      [0, 0, 0, 2, 6, 0, 7, 0, 1],
      [6, 8, 0, 0, 7, 0, 0, 9, 0],
      [1, 9, 0, 0, 0, 4, 5, 0, 0],
      [8, 2, 0, 1, 0, 0, 0, 4, 0],
      [0, 0, 4, 6, 0, 2, 9, 0, 0],
      [0, 5, 0, 0, 0, 3, 0, 2, 8],
      [0, 0, 9, 3, 0, 0, 0, 7, 4],
      [0, 4, 0, 0, 5, 0, 0, 3, 6],
      [7, 0, 3, 0, 1, 8, 0, 0, 0]
    ];

const Sudoku = ({ onBack }) => {
  const [grid, setGrid] = useState(PUZZLE.map(row => [...row]));
  const [initialGrid, setInitialGrid] = useState(PUZZLE.map(row => [...row]));
  const [selected, setSelected] = useState(null);
  const [solved, setSolved] = useState(false);
  const [errors, setErrors] = useState([]);
  const { unlockAchievement } = useOSStore();

  const generateSudoku = useCallback(() => {
    setGrid(PUZZLE.map(row => [...row]));
    setInitialGrid(PUZZLE.map(row => [...row]));
    setSolved(false);
    setErrors([]);
  }, []);

  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      generateSudoku();
      initialMount.current = false;
    }
  }, [generateSudoku]);

  const handleCellClick = (r, c) => {
    setSelected({ r, c });
  };

  const handleNumberInput = (num) => {
    if (!selected) return;
    const { r, c } = selected;
    if (initialGrid[r][c] !== 0) return;

    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = num;
    setGrid(newGrid);
    
    // Validate entry
    if (num !== 0 && !isValid(newGrid, r, c, num)) {
      if (!errors.some(e => e.r === r && e.c === c)) {
        setErrors(prev => [...prev, { r, c }]);
      }
    } else {
      setErrors(prev => prev.filter(e => !(e.r === r && e.c === c)));
    }

    // Check completion
    if (checkComplete(newGrid)) {
       setSolved(true);
       unlockAchievement('sudoku_pro');
    }
  };

  const checkComplete = (g) => {
     for(let r=0; r<9; r++) {
        for(let c=0; c<9; c++) {
           if (g[r][c] === 0) return false;
           if (!isValid(g, r, c, g[r][c])) return false;
        }
     }
     return true;
  };

  const isValid = (g, r, c, num) => {
    for (let x = 0; x < 9; x++) if (x !== c && g[r][x] === num) return false;
    for (let x = 0; x < 9; x++) if (x !== r && g[x][c] === num) return false;
    const startRow = Math.floor(r / 3) * 3;
    const startCol = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if ((startRow + i !== r || startCol + j !== c) && g[startRow + i][startCol + j] === num) return false;
      }
    }
    return true;
  };

  return (
    <div className="h-full w-full bg-[#050505] text-white flex flex-col items-center p-6 relative overflow-hidden select-none font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,245,160,0.03)_0%,transparent_70%)] pointer-events-none" />
      
      {/* Header */}
      <div className="w-full max-w-lg flex justify-between items-center mb-8 relative z-10">
        <Motion.button
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white"
        >
          <CustomIcon icon={ArrowLeft} size={20} />
        </Motion.button>
        
        <div className="text-center">
           <h1 className="text-lg font-black italic tracking-tight uppercase leading-none text-os-tertiary">Logic Stream</h1>
           <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">Matrix Integrity Analysis</p>
        </div>

        <Motion.button
          whileHover={{ rotate: 180, scale: 1.1 }}
          onClick={generateSudoku}
          className="p-3 rounded-2xl bg-os-tertiary/10 border border-os-tertiary/20 text-os-tertiary hover:bg-os-tertiary/20 transition-all"
        >
          <CustomIcon icon={RefreshCw} size={20} color="text-os-tertiary" glow />
        </Motion.button>
      </div>

      {/* Main Grid */}
      <div className="relative group p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="grid grid-cols-9 gap-0.5 relative z-10 bg-white/5">
          {grid.map((row, r) => row.map((cell, c) => {
            const isSelected = selected?.r === r && selected?.c === c;
            const isRelated = selected?.r === r || selected?.c === c || 
                             (Math.floor(selected?.r / 3) === Math.floor(r / 3) && Math.floor(selected?.c / 3) === Math.floor(c / 3));
            const isInitial = initialGrid[r][c] !== 0;
            const isError = errors.some(e => e.r === r && e.c === c);
            
            const borderRight = (c + 1) % 3 === 0 && c < 8 ? 'border-r border-white/20' : '';
            const borderBottom = (r + 1) % 3 === 0 && r < 8 ? 'border-b border-white/20' : '';

            return (
              <Motion.div
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                whileTap={{ scale: 0.95 }}
                className={`
                  w-8 h-8 md:w-11 md:h-11 flex items-center justify-center font-black text-sm md:text-base cursor-pointer transition-all relative
                  ${isInitial ? 'bg-white/[0.02] text-white/80' : 'bg-transparent text-os-tertiary'}
                  ${isRelated && !isSelected ? 'bg-os-tertiary/[0.03]' : ''}
                  ${isSelected ? 'bg-os-tertiary/20 ring-1 ring-inset ring-os-tertiary/50 z-20' : ''}
                  ${isError ? 'text-red-500 bg-red-500/10' : ''}
                  ${borderRight} ${borderBottom}
                `}
              >
                {cell !== 0 ? cell : ''}
                {isSelected && (
                   <Motion.div layoutId="cell-glow" className="absolute inset-0 bg-os-tertiary/10 blur-sm -z-10" />
                )}
              </Motion.div>
            );
          }))}
        </div>

        <AnimatePresence>
          {solved && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl"
            >
               <CustomIcon icon={ShieldCheck} size={64} className="mb-4 animate-bounce" color="text-os-tertiary" glow />
               <h2 className="text-3xl font-black italic uppercase tracking-tighter">Integrity Verified</h2>
               <p className="text-os-tertiary font-black tracking-[0.3em] uppercase text-[10px] mb-8">Node Sector Secure</p>
               <button onClick={generateSudoku} className="px-10 py-4 bg-os-tertiary text-black font-black uppercase tracking-widest rounded-2xl">
                  Re-Analyze
               </button>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-col items-center w-full max-w-lg">
         <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
              <Motion.button
                key={num}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNumberInput(num)}
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 border border-white/10 font-black text-sm hover:border-os-tertiary/50 hover:text-os-tertiary transition-all flex items-center justify-center"
              >
                {num === 0 ? <CustomIcon icon={XCircle} size={18} /> : num}
              </Motion.button>
            ))}
         </div>

         <div className="flex gap-6 opacity-30">
            <div className="flex items-center gap-2">
               <CustomIcon icon={Cpu} size={12} animate={false} />
               <span className="text-[8px] font-black uppercase tracking-widest">Logic Flow: Stable</span>
            </div>
            <div className="w-px h-3 bg-white/20" />
            <div className="flex items-center gap-2">
               <CustomIcon icon={Zap} size={12} animate={false} />
               <span className="text-[8px] font-black uppercase tracking-widest">Latency: 2ms</span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Sudoku;
