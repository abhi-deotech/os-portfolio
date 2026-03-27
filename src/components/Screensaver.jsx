import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';

const Screensaver = ({ onDismiss }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleEvents = () => onDismiss();
    window.addEventListener('mousemove', handleEvents);
    window.addEventListener('keydown', handleEvents);
    window.addEventListener('mousedown', handleEvents);
    return () => {
      window.removeEventListener('mousemove', handleEvents);
      window.removeEventListener('keydown', handleEvents);
      window.removeEventListener('mousedown', handleEvents);
    };
  }, [onDismiss]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-3xl flex flex-col items-center justify-center cursor-none"
    >
      <motion.div 
        animate={{ 
          x: [0, 100, -100, 0],
          y: [0, -50, 50, 0]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 20,
          ease: "linear"
        }}
        className="flex flex-col items-center gap-4"
      >
        <div className="text-9xl font-black text-os-primary/20 tracking-tighter">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex items-center gap-4 text-white/10 text-xs font-bold uppercase tracking-[1em]">
          <Lock size={14} />
          System Locked
        </div>
      </motion.div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
         <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.5em] animate-pulse">Move Mouse to Unlock</span>
      </div>
    </motion.div>
  );
};

export default Screensaver;
