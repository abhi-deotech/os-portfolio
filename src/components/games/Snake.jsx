import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, RefreshCw, ArrowLeft, Play } from 'lucide-react';
import useOSStore from '../../store/osStore';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIRECTION = 'UP';
const INITIAL_SPEED = 150;

const Snake = ({ onBack }) => {
  const { activeWindow } = useOSStore();
  const isFocused = activeWindow === 'games' || activeWindow === 'snake';
  
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const directionRef = useRef(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const gameLoopRef = useRef();

  const generateFood = useCallback((currentSnake) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) break;
    }
    setFood(newFood);
  }, []);

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      if (gameOver || !isPlaying) return prevSnake;

      const head = { ...prevSnake[0] };
      const currentDirection = directionRef.current;

      switch (currentDirection) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
        default: break;
      }

      // Check collisions
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE ||
          prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];
      
      // Check if eating food
      // Note: We use the food state from the closure here. 
      // Since moveSnake is recreated when food changes, this is safe.
      if (head.x === food.x && head.y === food.y) {
        setScore(s => s + 10);
        generateFood(newSnake);
        // Don't pop -> growth
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [food, gameOver, isPlaying, generateFood]);

  useEffect(() => {
    if (score > highScore) setHighScore(score);
  }, [score, highScore]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isFocused || !isPlaying || gameOver) return;
      
      switch (e.key) {
        case 'ArrowUp': if (directionRef.current !== 'DOWN') directionRef.current = 'UP'; break;
        case 'ArrowDown': if (directionRef.current !== 'UP') directionRef.current = 'DOWN'; break;
        case 'ArrowLeft': if (directionRef.current !== 'RIGHT') directionRef.current = 'LEFT'; break;
        case 'ArrowRight': if (directionRef.current !== 'LEFT') directionRef.current = 'RIGHT'; break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, isPlaying, gameOver]);

  useEffect(() => {
    if (isPlaying && !gameOver && isFocused) {
      gameLoopRef.current = setInterval(moveSnake, Math.max(80, INITIAL_SPEED - Math.floor(score / 50) * 5));
    }
    return () => clearInterval(gameLoopRef.current);
  }, [moveSnake, isPlaying, gameOver, isFocused, score]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    directionRef.current = INITIAL_DIRECTION;
    setGameOver(false);
    setIsPlaying(true);
    setScore(0);
    generateFood(INITIAL_SNAKE);
  };

  return (
    <div className="flex flex-col items-center h-full p-4 select-none">
      <div className="w-full flex justify-between items-center mb-4">
        <button 
          onClick={onBack}
          className="p-2 rounded-lg bg-os-surfaceContainerLow/50 hover:bg-os-surfaceContainerHighest/80 transition-all text-os-onSurfaceVariant hover:text-os-onSurface"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center space-x-6">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-os-onSurfaceVariant">Score</span>
            <span className="text-xl font-bold text-os-primary">{score}</span>
          </div>
          <div className="flex flex-col items-center opacity-60">
            <span className="text-[10px] uppercase tracking-widest text-os-onSurfaceVariant">Best</span>
            <span className="text-xl font-bold text-os-onSurface">{highScore}</span>
          </div>
        </div>
        <div className="w-8" /> {/* Spacer */}
      </div>

      <div className="relative">
        <div 
          className="grid gap-0.5 border-4 border-os-outline/20 rounded-xl bg-os-surfaceContainerLow/30 backdrop-blur-sm overflow-hidden"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            width: 'min(70vh, 400px)',
            height: 'min(70vh, 400px)'
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
            const x = i % GRID_SIZE;
            const y = Math.floor(i / GRID_SIZE);
            const isSnake = snake.some(s => s.x === x && s.y === y);
            const isHead = snake[0].x === x && snake[0].y === y;
            const isFood = food.x === x && food.y === y;

            return (
              <div 
                key={i} 
                className={`w-full h-full rounded-[1px] transition-all duration-150 ${
                  isHead ? 'bg-os-primary shadow-[0_0_8px_var(--os-primary)] z-10 scale-110' :
                  isSnake ? 'bg-os-primary/40' :
                  isFood ? 'bg-os-secondary shadow-[0_0_10px_var(--os-secondary)] animate-pulse' :
                  'bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-os-background/80 backdrop-blur-md rounded-xl border border-os-outline/20">
            <Trophy size={48} className="text-os-secondary mb-2" />
            <h2 className="text-2xl font-bold text-os-onSurface mb-1">Game Over</h2>
            <p className="text-os-onSurfaceVariant mb-6">Final Score: {score}</p>
            <button 
              onClick={resetGame}
              className="flex items-center space-x-2 px-6 py-2 bg-os-primary text-white font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              <RefreshCw size={18} />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-os-background/60 backdrop-blur-sm rounded-xl border border-os-outline/10">
            <button 
              onClick={() => setIsPlaying(true)}
              className="flex items-center space-x-2 px-8 py-3 bg-os-secondary text-os-onSurface font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              <Play size={20} fill="currentColor" />
              <span>Play Game</span>
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex space-x-4 text-os-onSurfaceVariant/50 text-xs font-medium uppercase tracking-widest">
        <span className="px-2 py-1 rounded bg-os-outline/10">Arrow Keys to Move</span>
      </div>
    </div>
  );
};

export default Snake;
