import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BootSequence = ({ onComplete }) => {
  const [logs, setLogs] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  const bootLogs = [
    { text: '[  OK  ] Initializing Lumina Kernel 6.8.0...', delay: 100 },
    { text: '[  OK  ] Detecting CPU: M3 Max (8 Cores) @ 4.06GHz', delay: 200 },
    { text: '[  OK  ] Memory Check: 64128MB RAM OK', delay: 300 },
    { text: '[  OK  ] Loading Framer-Motion Window Manager...', delay: 200 },
    { text: '[  OK  ] Initializing Glassmorphism Render Engine...', delay: 400 },
    { text: '[  OK  ] Mounting /sys, /proc, /dev...', delay: 100 },
    { text: '[ wait ] Establishing Neural Handshake...', delay: 600 },
    { text: '[  OK  ] Neural Link Established.', delay: 200 },
    { text: '[  OK  ] Synchronizing LocalStorage FS...', delay: 300 },
    { text: '[  OK  ] Loading Design System Tokens...', delay: 200 },
    { text: '[  OK  ] Initializing Audio spectral visualizer...', delay: 400 },
    { text: '[  OK  ] Welcome to Lumina OS v1.0.0', delay: 300 },
  ];

  useEffect(() => {
    let current = 0;
    const addLog = () => {
      if (current < bootLogs.length) {
        setLogs(prev => [...prev, bootLogs[current]]);
        setTimeout(addLog, bootLogs[current].delay);
        current++;
      } else {
        setTimeout(() => {
          setIsFinished(true);
          setTimeout(onComplete, 1000);
        }, 500);
      }
    };
    addLog();
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-[1000] flex flex-col p-8 font-mono text-sm sm:text-base leading-relaxed overflow-hidden">
      <div className="flex-grow">
        {logs.map((log, i) => {
          if (!log) return null;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={log.text?.includes('OK') ? 'text-[#00ff00]' : 'text-white/60'}
            >
              {log.text}
            </motion.div>
          );
        })}
      </div>
      
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center absolute inset-0 bg-black"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-os-primary tracking-[0.5em] text-3xl font-bold uppercase"
            >
              Lumina
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="absolute bottom-8 right-8 text-white/20 text-xs animate-pulse">
        System_Revision: 1.0.0-Stable
      </div>
    </div>
  );
};

export default BootSequence;
