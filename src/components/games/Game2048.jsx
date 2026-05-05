import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, ArrowLeft, Zap, Brain, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../../store/osStore';

const GRID_SIZE = 4;

const Game2048 = ({ onBack }) => {
  const [grid, setGrid] = useState([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(localStorage.getItem('2048-best-score') || 0);
  const [gameOver, setGameOver] = useState(false);
  const { unlockAchievement } = useOSStore();

  const addRandomTile = useCallback((currentGrid) => {
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
  }, []);

  const initGame = useCallback(() => {
    let newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
  }, [addRandomTile]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const checkGameOver = (currentGrid) => {
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
  };

  const move = useCallback((direction) => {
    if (gameOver) return;

    setGrid(prevGrid => {
      let newGrid = prevGrid.map(row => [...row]);
      let moved = false;
      let addedScore = 0;

      const rotateGrid = (grid) => {
        return grid[0].map((_, index) => grid.map(row => row[index]).reverse());
      };

      let rotations = 0;
      if (direction === 'UP') rotations = 1;
      else if (direction === 'RIGHT') rotations = 2;
      else if (direction === 'DOWN') rotations = 3;

      for (let i = 0; i < rotations; i++) newGrid = rotateGrid(newGrid);

      for (let r = 0; r < GRID_SIZE; r++) {
        let row = newGrid[r].filter(val => val !== 0);
        for (let c = 0; c < row.length - 1; c++) {
          if (row[c] === row[c + 1]) {
            row[c] *= 2;
            addedScore += row[c];
            row.splice(c + 1, 1);
            moved = true;
          }
        }
        while (row.length < GRID_SIZE) row.push(0);
        if (JSON.stringify(newGrid[r]) !== JSON.stringify(row)) moved = true;
        newGrid[r] = row;
      }

      for (let i = 0; i < (4 - rotations) % 4; i++) newGrid = rotateGrid(newGrid);

      if (moved) {
        newGrid = addRandomTile(newGrid);
        setScore(s => {
          const newScore = s + addedScore;
          if (newScore > bestScore) {
             setBestScore(newScore);
             localStorage.setItem('2048-best-score', newScore);
          }
          if (addedScore >= 2048) unlockAchievement('2048_master');
          return newScore;
        });
        if (checkGameOver(newGrid)) setGameOver(true);
      }
      return newGrid;
    });
  }, [gameOver, bestScore, addRandomTile, unlockAchievement]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver) return;
      if (e.key === 'ArrowUp') move('UP');
      else if (e.key === 'ArrowDown') move('DOWN');
      else if (e.key === 'ArrowLeft') move('LEFT');
      else if (e.key === 'ArrowRight') move('RIGHT');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, gameOver]);

  const tileColors = {
    2: 'bg-[#cc97ff]/20 text-os-primary border-os-primary/20 shadow-[0_0_15px_rgba(204,151,255,0.1)]',
    4: 'bg-[#cc97ff]/30 text-os-primary border-os-primary/30 shadow-[0_0_20px_rgba(204,151,255,0.2)]',
    8: 'bg-[#00d2fd]/20 text-os-secondary border-os-secondary/20 shadow-[0_0_25px_rgba(0,210,253,0.1)]',
    16: 'bg-[#00d2fd]/30 text-os-secondary border-os-secondary/30 shadow-[0_0_30px_rgba(0,210,253,0.2)]',
    32: 'bg-[#00f5a0]/20 text-os-tertiary border-os-tertiary/20 shadow-[0_0_35px_rgba(0,245,160,0.1)]',
    64: 'bg-[#00f5a0]/30 text-os-tertiary border-os-tertiary/30 shadow-[0_0_40px_rgba(0,245,160,0.2)]',
    128: 'bg-os-primary text-black border-white/20 shadow-[0_0_30px_#cc97ff]',
    256: 'bg-os-secondary text-black border-white/20 shadow-[0_0_35px_#00d2fd]',
    512: 'bg-os-tertiary text-black border-white/20 shadow-[0_0_40px_#00f5a0]',
    1024: 'bg-white text-black border-white/40 shadow-[0_0_50px_rgba(255,255,255,0.4)]',
    2048: 'bg-gradient-to-br from-os-primary via-os-secondary to-os-tertiary text-black border-white/50 shadow-[0_0_60px_#cc97ff]',
  };

  return (
    <div className="h-full w-full bg-[#050505] text-white flex flex-col items-center p-6 relative overflow-hidden select-none font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,210,253,0.03)_0%,transparent_70%)] pointer-events-none" />
      
      {/* Header */}
      <div className="w-full max-w-[440px] flex justify-between items-center mb-8 relative z-10">
        <motion.button 
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white"
        >
          <ArrowLeft size={20} />
        </motion.button>
        
        <div className="flex gap-6">
           <div className="text-center">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Compute</p>
              <p className="text-2xl font-black italic text-os-secondary tracking-tighter tabular-nums leading-none">
                {score}
              </p>
           </div>
           <div className="text-center">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Peak</p>
              <p className="text-2xl font-black italic text-white/60 tracking-tighter tabular-nums leading-none">
                {bestScore}
              </p>
           </div>
        </div>

        <motion.button 
          whileHover={{ rotate: 180, scale: 1.1 }}
          transition={{ duration: 0.5 }}
          onClick={initGame}
          className="p-3 rounded-2xl bg-os-secondary/10 border border-os-secondary/20 text-os-secondary hover:bg-os-secondary/20 transition-all"
        >
          <RefreshCw size={20} />
        </motion.button>
      </div>

      {/* Game Board Container */}
      <div className="relative p-2 md:p-4 bg-white/[0.03] border border-white/5 rounded-[3rem] backdrop-blur-xl shadow-2xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
        
        <div className="grid grid-cols-4 gap-2.5 md:gap-4 w-[300px] h-[300px] md:w-[400px] md:h-[400px] relative z-10">
          {grid.flat().map((tile, i) => (
            <div key={i} className="bg-black/40 rounded-[1.25rem] border border-white/5 relative overflow-hidden h-full w-full">
               <AnimatePresence mode="popLayout">
                {tile !== 0 && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    key={`tile-${i}-${tile}`}
                    className={`absolute inset-0 flex items-center justify-center font-black text-xl md:text-3xl rounded-[1.25rem] border transition-all duration-300 ${tileColors[tile] || 'bg-black text-white border-white/10'}`}
                  >
                    {tile}
                  </motion.div>
                )}
               </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Overlay States */}
        <AnimatePresence>
          {gameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl rounded-[2.8rem] border border-white/10"
            >
              <Trophy size={64} className="text-os-secondary mb-6 drop-shadow-[0_0_20px_rgba(0,210,253,0.5)]" />
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Cycle Complete</h2>
              <p className="text-os-secondary font-black tracking-[0.3em] uppercase text-[10px] mb-8">Final Neural Score: {score}</p>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={initGame}
                className="flex items-center gap-3 px-8 py-4 bg-os-secondary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_20px_40px_rgba(0,210,253,0.3)]"
              >
                <RefreshCw size={20} />
                Re-Init Node
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info / Footer */}
      <div className="mt-auto w-full max-w-lg flex flex-col items-center gap-4">
         <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
               <Layers size={14} className="text-os-primary" />
               <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Merge Parallel Nodes</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
               <Brain size={14} className="text-os-secondary" />
               <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Recursive Logic Flow</span>
            </div>
         </div>
         
         <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em] mt-4 flex items-center gap-3">
           <Zap size={10} className="animate-pulse" /> 
           Powered by Vibe-OS Neural Core 
           <Zap size={10} className="animate-pulse" />
         </p>
      </div>
    </div>
  );
};

export default Game2048;
