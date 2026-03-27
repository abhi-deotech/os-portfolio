import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, ArrowLeft, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GRID_SIZE = 4;

const Game2048 = ({ onBack }) => {
  const [grid, setGrid] = useState([]);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const initGame = useCallback(() => {
    let newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const addRandomTile = (currentGrid) => {
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

      // Rotate grid so we always move LEFT
      let rotations = 0;
      if (direction === 'UP') rotations = 1;
      else if (direction === 'RIGHT') rotations = 2;
      else if (direction === 'DOWN') rotations = 3;

      for (let i = 0; i < rotations; i++) newGrid = rotateGrid(newGrid);

      // Move logic (Left)
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

      // Rotate back
      for (let i = 0; i < (4 - rotations) % 4; i++) newGrid = rotateGrid(newGrid);

      if (moved) {
        newGrid = addRandomTile(newGrid);
        setScore(s => s + addedScore);
        if (checkGameOver(newGrid)) setGameOver(true);
      }
      return newGrid;
    });
  }, [gameOver]);

  const checkGameOver = (currentGrid) => {
    // Check for empty tiles
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentGrid[r][c] === 0) return false;
      }
    }
    // Check for possible merges
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = currentGrid[r][c];
        if (r < GRID_SIZE - 1 && val === currentGrid[r + 1][c]) return false;
        if (c < GRID_SIZE - 1 && val === currentGrid[r][c + 1]) return false;
      }
    }
    return true;
  };

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
    2: 'bg-[#eee4da] text-[#776e65]',
    4: 'bg-[#ede0c8] text-[#776e65]',
    8: 'bg-[#f2b179] text-white',
    16: 'bg-[#f59563] text-white',
    32: 'bg-[#f67c5f] text-white',
    64: 'bg-[#f65e3b] text-white',
    128: 'bg-[#edcf72] text-white shadow-[0_0_10px_#edcf72]',
    256: 'bg-[#edcc61] text-white shadow-[0_0_15px_#edcc61]',
    512: 'bg-[#edc850] text-white shadow-[0_0_20px_#edc850]',
    1024: 'bg-[#edc53f] text-white shadow-[0_0_25px_#edc53f]',
    2048: 'bg-[#edc22e] text-white shadow-[0_0_30px_#edc22e]',
  };

  return (
    <div className="flex flex-col items-center h-full p-4 md:p-8 select-none">
       <div className="w-full max-w-[400px] flex justify-between items-center mb-8">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl bg-os-surfaceContainerLow/50 border border-os-outline/10 hover:bg-os-surfaceContainerHighest transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-4">
           <div className="p-3 bg-os-surfaceContainerLow/50 border border-os-outline/10 rounded-2xl min-w-[80px] text-center">
              <p className="text-[10px] uppercase font-black tracking-widest text-os-onSurfaceVariant mb-1">Score</p>
              <p className="text-xl font-bold">{score}</p>
           </div>
           <button onClick={initGame} className="p-3 bg-os-primary/10 border border-os-primary/20 rounded-2xl text-os-primary hover:bg-os-primary/20 transition-all">
              <RefreshCw size={24} />
           </button>
        </div>
      </div>

      <div className="relative p-2 md:p-4 bg-os-surfaceContainerLow/30 border border-os-outline/10 rounded-[2rem] backdrop-blur-md shadow-2xl">
        <div className="grid grid-cols-4 gap-2 md:gap-4 w-[280px] h-[280px] md:w-[360px] md:h-[360px]">
          {grid.flat().map((tile, i) => (
            <div key={i} className="bg-os-surfaceContainerHighest/30 rounded-2xl relative overflow-hidden h-full w-full">
              {tile !== 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={tile + '-' + i + '-' + score} // Key change on move/score for animation refresh
                  className={`absolute inset-0 flex items-center justify-center font-black text-xl md:text-3xl rounded-2xl shadow-lg ${tileColors[tile] || 'bg-black text-white'}`}
                >
                  {tile}
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-os-background/80 backdrop-blur-xl rounded-[2rem] border-2 border-os-outline/20 z-20">
             <Trophy size={48} className="text-[#edc22e] mb-2" />
             <h2 className="text-3xl font-black mb-1">Game Over</h2>
             <p className="text-os-onSurfaceVariant mb-8">Final Score: {score}</p>
             <button 
               onClick={initGame}
               className="px-8 py-3 bg-os-primary text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-os-primary/20"
             >
               Play Again
             </button>
          </div>
        )}
      </div>

      <div className="mt-12 text-[10px] text-os-onSurfaceVariant/40 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
         <span className="px-2 py-1 bg-os-surfaceContainerHighest rounded border border-os-outline/5 text-os-onSurfaceVariant">Swipe</span> 
         OR 
         <span className="px-2 py-1 bg-os-surfaceContainerHighest rounded border border-os-outline/5 text-os-onSurfaceVariant">Arrow Keys</span>
         TO MERGE
      </div>
    </div>
  );
};

export default Game2048;
