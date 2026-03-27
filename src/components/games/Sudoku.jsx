import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Sudoku = ({ onBack }) => {
  const [grid, setGrid] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [initialGrid, setInitialGrid] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [selected, setSelected] = useState(null);
  const [solved, setSolved] = useState(false);
  const [errors, setErrors] = useState([]);

  const generateSudoku = useCallback(() => {
    // Simple static puzzle for demonstration (can be replaced with a generator)
    const puzzle = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];
    setGrid(puzzle.map(row => [...row]));
    setInitialGrid(puzzle.map(row => [...row]));
    setSolved(false);
    setErrors([]);
  }, []);

  useEffect(() => {
    generateSudoku();
  }, [generateSudoku]);

  const handleCellClick = (r, c) => {
    if (initialGrid[r][c] !== 0) return;
    setSelected({ r, c });
  };

  const handleNumberInput = (num) => {
    if (!selected) return;
    const { r, c } = selected;
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = num;
    setGrid(newGrid);
    
    // Check if valid (simple check)
    if (num !== 0 && !isValid(newGrid, r, c, num)) {
      if (!errors.some(e => e.r === r && e.c === c)) {
        setErrors(prev => [...prev, { r, c }]);
      }
    } else {
      setErrors(prev => prev.filter(e => !(e.r === r && e.c === c)));
    }
  };

  const isValid = (g, r, c, num) => {
    // Row
    for (let x = 0; x < 9; x++) if (x !== c && g[r][x] === num) return false;
    // Col
    for (let x = 0; x < 9; x++) if (x !== r && g[x][c] === num) return false;
    // Box
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
    <div className="flex flex-col items-center h-full p-4 md:p-8 select-none">
       <div className="w-full max-w-[450px] flex justify-between items-center mb-8">
        <button 
          onClick={onBack}
          className="p-2 rounded-xl bg-os-surfaceContainerLow/50 border border-os-outline/10 hover:bg-os-surfaceContainerHighest transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-4">
           <button onClick={generateSudoku} className="p-3 bg-os-primary/10 border border-os-primary/20 rounded-2xl text-os-primary hover:bg-os-primary/20 transition-all font-bold text-xs uppercase tracking-widest px-4">
              Reset
           </button>
        </div>
      </div>

      <div className="grid grid-cols-9 gap-0.5 bg-os-outline/20 p-1 border-2 border-os-outline/20 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">
        {grid.map((row, r) => row.map((cell, c) => {
          const isSelected = selected?.r === r && selected?.c === c;
          const isInitial = initialGrid[r][c] !== 0;
          const isError = errors.some(e => e.r === r && e.c === c);
          const borderRight = (c + 1) % 3 === 0 && c < 8 ? 'border-r-2 border-os-outline/40' : '';
          const borderBottom = (r + 1) % 3 === 0 && r < 8 ? 'border-b-2 border-os-outline/40' : '';

          return (
            <div 
              key={`${r}-${c}`}
              onClick={() => handleCellClick(r, c)}
              className={`
                w-8 h-8 md:w-12 md:h-12 flex items-center justify-center font-bold text-sm md:text-lg cursor-pointer transition-all
                ${isInitial ? 'bg-os-surfaceContainerHighest/40 text-white' : 'bg-os-surfaceContainerLow text-os-primary'}
                ${isSelected ? 'bg-os-primary/20 ring-2 ring-os-primary/50' : ''}
                ${isError ? 'text-os-error bg-os-error/10' : ''}
                ${borderRight} ${borderBottom}
              `}
            >
              {cell !== 0 ? cell : ''}
            </div>
          );
        }))}
      </div>

      <div className="mt-8 grid grid-cols-5 md:grid-cols-10 gap-2 w-full max-w-[450px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
          <button
            key={num}
            onClick={() => handleNumberInput(num)}
            className="p-3 md:p-4 rounded-xl bg-os-surfaceContainerLow border border-os-outline/10 font-bold hover:bg-os-primary/10 hover:text-os-primary active:scale-95 transition-all"
          >
            {num === 0 ? '⌫' : num}
          </button>
        ))}
      </div>

      <div className="mt-8 text-[10px] text-os-onSurfaceVariant font-bold uppercase tracking-widest opacity-40">
         Classic Sudoku Puzzle
      </div>
    </div>
  );
};

export default Sudoku;
