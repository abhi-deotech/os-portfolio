import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, RefreshCw, ArrowLeft, Play, Gamepad2, Zap, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../../store/osStore';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIRECTION = 'UP';
const INITIAL_SPEED = 140;

const Snake = ({ onBack }) => {
  const { activeWindow, unlockAchievement } = useOSStore();
  const isFocused = activeWindow === 'games' || activeWindow === 'snake' || activeWindow === 'retroarcade';
  
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(localStorage.getItem('snake-high-score') || 0);
  
  const directionRef = useRef(INITIAL_DIRECTION);
  const lastProcessedDir = useRef(INITIAL_DIRECTION);
  const gameLoopRef = useRef();

  const generateFood = useCallback((currentSnake) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isCollision = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isCollision) break;
    }
    return newFood;
  }, []);

  const handleGameOver = useCallback(() => {
    setGameOver(true);
    setIsPlaying(false);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-high-score', score);
    }
  }, [score, highScore]);

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };
      const currentDir = directionRef.current;
      lastProcessedDir.current = currentDir;

      if (currentDir === 'UP') head.y -= 1;
      if (currentDir === 'DOWN') head.y += 1;
      if (currentDir === 'LEFT') head.x -= 1;
      if (currentDir === 'RIGHT') head.x += 1;

      // Wall Collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        handleGameOver();
        return prevSnake;
      }

      // Self Collision
      if (prevSnake.some(s => s.x === head.x && s.y === head.y)) {
        handleGameOver();
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];
      
      // Use functional state for food check to avoid stale closures
      let ateFood = false;
      setFood(prevFood => {
        if (head.x === prevFood.x && head.y === prevFood.y) {
          ateFood = true;
          setScore(s => s + 10);
          return generateFood(newSnake);
        }
        return prevFood;
      });

      if (!ateFood) {
        newSnake.pop();
      } else if (score + 10 >= 100) {
        unlockAchievement('snake_pro');
      }

      return newSnake;
    });
  }, [generateFood, score, unlockAchievement, handleGameOver]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isFocused || !isPlaying) return;
      const key = e.key;
      const current = lastProcessedDir.current;

      if (key === 'ArrowUp' && current !== 'DOWN') directionRef.current = 'UP';
      if (key === 'ArrowDown' && current !== 'UP') directionRef.current = 'DOWN';
      if (key === 'ArrowLeft' && current !== 'RIGHT') directionRef.current = 'LEFT';
      if (key === 'ArrowRight' && current !== 'LEFT') directionRef.current = 'RIGHT';
      
      setDirection(directionRef.current);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, isPlaying]);

  useEffect(() => {
    if (isPlaying && !gameOver && isFocused) {
      const speed = Math.max(60, INITIAL_SPEED - Math.floor(score / 40) * 10);
      gameLoopRef.current = setInterval(moveSnake, speed);
    }
    return () => clearInterval(gameLoopRef.current);
  }, [moveSnake, isPlaying, gameOver, isFocused, score]);

  const startGame = () => {
    setSnake(INITIAL_SNAKE);
    directionRef.current = INITIAL_DIRECTION;
    setDirection(INITIAL_DIRECTION);
    setGameOver(false);
    setScore(0);
    setFood(generateFood(INITIAL_SNAKE));
    setIsPlaying(true);
  };

  return (
    <div className="h-full w-full bg-[#050505] text-white flex flex-col items-center p-6 relative overflow-hidden select-none font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(204,151,255,0.05)_0%,transparent_70%)] pointer-events-none" />
      
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
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Current Sync</p>
              <p className="text-2xl font-black italic text-os-primary tracking-tighter tabular-nums leading-none">
                {score.toString().padStart(3, '0')}
              </p>
           </div>
           <div className="text-center">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Peak Load</p>
              <p className="text-2xl font-black italic text-os-secondary tracking-tighter tabular-nums leading-none">
                {highScore.toString().padStart(3, '0')}
              </p>
           </div>
        </div>

        <div className="p-3 rounded-2xl bg-os-primary/10 border border-os-primary/20">
           <Zap className="text-os-primary" size={20} />
        </div>
      </div>

      {/* Game Board */}
      <div className="relative group">
        <div 
          className="grid p-1 gap-0.5 border-[6px] border-white/5 rounded-[2.5rem] bg-[#0a0a0a] shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(204,151,255,0.05)] relative overflow-hidden"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            width: 'min(85vw, 420px)',
            height: 'min(85vw, 420px)'
          }}
        >
          {/* Scanline Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[size:100%_4px,3px_100%] pointer-events-none z-20" />

          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
            const x = i % GRID_SIZE;
            const y = Math.floor(i / GRID_SIZE);
            const isSnake = snake.some(s => s.x === x && s.y === y);
            const isHead = snake[0].x === x && snake[0].y === y;
            const isFood = food.x === x && food.y === y;

            return (
              <div 
                key={i} 
                className={`w-full h-full rounded-md transition-all duration-300 ${
                  isHead ? 'bg-os-primary shadow-[0_0_15px_#cc97ff] z-10 scale-125' :
                  isSnake ? 'bg-os-primary/40 shadow-[0_0_5px_rgba(204,151,255,0.2)]' :
                  isFood ? 'bg-os-secondary shadow-[0_0_20px_#00d2fd] animate-pulse rounded-full scale-90' :
                  'bg-white/[0.02]'
                }`}
              />
            );
          })}
        </div>

        {/* Overlay States */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl rounded-[2.2rem] border border-white/10"
            >
              {gameOver ? (
                <>
                  <Trophy size={64} className="text-os-secondary mb-6 drop-shadow-[0_0_20px_rgba(0,210,253,0.5)]" />
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Neural Link Lost</h2>
                  <p className="text-os-secondary font-black tracking-[0.3em] uppercase text-[10px] mb-8">System Re-initialization required</p>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startGame}
                    className="flex items-center gap-3 px-8 py-4 bg-os-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_20px_40px_rgba(204,151,255,0.3)]"
                  >
                    <RefreshCw size={20} />
                    Re-Boot Game
                  </motion.button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-[2rem] bg-os-primary/20 border border-os-primary/30 flex items-center justify-center mb-8">
                     <Gamepad2 size={40} className="text-os-primary" />
                  </div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Neon Crawler v2.0</h2>
                  <p className="text-white/30 font-black tracking-[0.3em] uppercase text-[10px] mb-12 text-center max-w-[200px]">Experimental Data Stream Interaction</p>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startGame}
                    className="flex items-center gap-4 px-10 py-5 bg-os-primary text-black font-black uppercase tracking-widest rounded-2xl shadow-[0_20px_40px_rgba(204,151,255,0.3)]"
                  >
                    <Play size={24} fill="currentColor" />
                    Enter Stream
                  </motion.button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls / Instructions */}
      <div className="mt-auto w-full max-w-lg flex flex-col items-center gap-4">
         <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
               <Target size={14} className="text-os-primary" />
               <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Avoid Collisions</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
               <Zap size={14} className="text-os-secondary" />
               <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Sync Multiplier: x1.0</span>
            </div>
         </div>
         
         {/* Mobile Controls */}
         <div className="grid grid-cols-3 gap-2 mt-2 md:hidden">
            <div />
            <button onClick={() => directionRef.current !== 'DOWN' && setDirection('UP')} className="p-4 bg-white/10 rounded-2xl flex justify-center"><ArrowLeft className="rotate-90" /></button>
            <div />
            <button onClick={() => directionRef.current !== 'RIGHT' && setDirection('LEFT')} className="p-4 bg-white/10 rounded-2xl flex justify-center"><ArrowLeft /></button>
            <button onClick={() => directionRef.current !== 'UP' && setDirection('DOWN')} className="p-4 bg-white/10 rounded-2xl flex justify-center"><ArrowLeft className="-rotate-90" /></button>
            <button onClick={() => directionRef.current !== 'LEFT' && setDirection('RIGHT')} className="p-4 bg-white/10 rounded-2xl flex justify-center"><ArrowLeft className="rotate-180" /></button>
         </div>

         <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em] mt-4">Node Authority: Vibe-OS Gaming Kernel</p>
      </div>
    </div>
  );
};

export default Snake;
