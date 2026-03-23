import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, ArrowLeft } from 'lucide-react';

const SYMBOLS = ['🎨', '🚀', '🌈', '💎', '🔥', '⚡', '🍀', '🍕'];

const MemoryGame = ({ onBack }) => {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [solved, setSolved] = useState([]);
  const [disabled, setDisabled] = useState(false);
  const [moves, setMoves] = useState(0);

  const initGame = () => {
    const duplicatedSymbols = [...SYMBOLS, ...SYMBOLS];
    const shuffled = duplicatedSymbols
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({ id: index, symbol }));
    setCards(shuffled);
    setFlipped([]);
    setSolved([]);
    setMoves(0);
  };

  useEffect(() => {
    initGame();
  }, []);

  useEffect(() => {
    if (flipped.length === 2) {
      setDisabled(true);
      setMoves(m => m + 1);
      const [first, second] = flipped;
      if (cards[first].symbol === cards[second].symbol) {
        setSolved(prev => [...prev, first, second]);
        setFlipped([]);
        setDisabled(false);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setDisabled(false);
        }, 1000);
      }
    }
  }, [flipped, cards]);

  const handleClick = (index) => {
    if (disabled || flipped.includes(index) || solved.includes(index)) return;
    setFlipped(prev => [...prev, index]);
  };

  const isGameOver = solved.length === cards.length && cards.length > 0;

  return (
    <div className="flex flex-col items-center h-full p-4 select-none">
       <div className="w-full flex justify-between items-center mb-8">
        <button 
          onClick={onBack}
          className="p-2 rounded-lg bg-os-surfaceContainerLow/50 hover:bg-os-surfaceContainerHighest/80 transition-all text-os-onSurfaceVariant hover:text-os-onSurface"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center space-x-6">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-os-onSurfaceVariant">Moves</span>
            <span className="text-xl font-bold text-os-secondary">{moves}</span>
          </div>
        </div>
        <button 
          onClick={initGame}
          className="p-2 rounded-lg bg-os-surfaceContainerLow/50 hover:bg-os-surfaceContainerHighest/80 transition-all text-os-onSurfaceVariant hover:text-os-onSurface"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 max-w-md w-full">
        {cards.map((card, index) => (
          <div
            key={card.id}
            onClick={() => handleClick(index)}
            className={`aspect-square cursor-pointer transition-all duration-500 preserve-3d relative ${
              flipped.includes(index) || solved.includes(index) ? 'rotate-y-180' : ''
            }`}
          >
            {/* Front of Card */}
            <div className={`absolute inset-0 bg-os-surfaceContainerLow/80 border border-os-outline/20 rounded-2xl flex items-center justify-center text-3xl backface-hidden shadow-lg ${
              solved.includes(index) ? 'opacity-40 grayscale' : ''
            }`}>
               <div className="w-8 h-8 rounded-full bg-os-outline/10" />
            </div>
            
            {/* Back of Card (Symbol) */}
            <div className="absolute inset-0 bg-os-surfaceContainerHighest border-2 border-os-primary/50 rounded-2xl flex items-center justify-center text-4xl rotate-y-180 backface-hidden shadow-[0_0_15px_rgba(var(--os-primary-rgb),0.2)]">
              {card.symbol}
            </div>
          </div>
        ))}
      </div>

      {isGameOver && (
        <div className="mt-12 flex flex-col items-center animate-bounce">
          <Trophy size={48} className="text-os-primary mb-2" />
          <h2 className="text-2xl font-bold text-os-onSurface">Well Done!</h2>
          <p className="text-os-onSurfaceVariant">Finished in {moves} moves</p>
        </div>
      )}
    </div>
  );
};

export default MemoryGame;
