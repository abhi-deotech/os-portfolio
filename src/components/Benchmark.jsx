import React, { useState, useEffect } from 'react';
import { Play, Square, Activity, Cpu, AlertTriangle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../store/osStore';

const Benchmark = () => {
  const { systemMetrics, updateMetrics, unlockAchievement } = useOSStore();
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState(0);
  const [history, setHistory] = useState(Array(20).fill(0));

  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();
    
    const runStress = () => {
      if (!isRunning) return;

      const startTime = performance.now();
      let count = 0;
      
      // Heavy block for ~8ms to simulate load while keeping UI responsiveness
      while (performance.now() - startTime < 8) {
        Math.sqrt(Math.random() * 1000000);
        count++;
      }

      setIterations(prev => prev + count);
      
      // Update global metrics to show high load
      const now = performance.now();
      if (now - lastTime > 500) { // Every 500ms
        updateMetrics({
          cpu: Math.floor(Math.random() * 10) + 90, // 90-100%
          ram: Number((Math.random() * 0.5 + 6.5).toFixed(1)), // Fake RAM spike
          temp: Math.floor(Math.random() * 5) + 65, // Fake Temp spike
          isOverridden: true
        });
        lastTime = now;
      }

      animationFrameId = requestAnimationFrame(runStress);
    };

    if (isRunning) {
      runStress();
    } else {
      updateMetrics({ isOverridden: false });
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      updateMetrics({ isOverridden: false });
    };
  }, [isRunning, updateMetrics]);

  useEffect(() => {
    const updateHistory = setInterval(() => {
      setHistory(prev => {
        const next = [...prev.slice(1), isRunning ? 85 + Math.random() * 15 : 5 + Math.random() * 8];
        return next;
      });
    }, 500);
    return () => clearInterval(updateHistory);
  }, [isRunning]);

  return (
    <div className="flex flex-col h-full bg-[#050505] text-os-onSurface p-8 font-sans overflow-hidden">
      <div className="flex justify-between items-start mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-os-primary">
            <Activity size={32} className={isRunning ? "animate-pulse" : ""} />
            <h1 className="text-4xl font-black tracking-tight uppercase">Lumina Benchmark</h1>
          </div>
          <p className="text-os-onSurfaceVariant text-sm font-bold opacity-60 uppercase tracking-[0.2em]">System Stress Test Utility v1.0</p>
        </div>
        
        <button 
          onClick={() => {
            const nextState = !isRunning;
            setIsRunning(nextState);
            if (nextState) unlockAchievement('speed_demon');
          }}
          className={`group relative px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-500 overflow-hidden ${isRunning ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-os-primary text-black'}`}
        >
          <div className="relative z-10 flex items-center gap-3">
             {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
             {isRunning ? 'Stop Stress Test' : 'Start Stress Test'}
          </div>
          {!isRunning && (
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 rounded-3xl bg-os-surfaceContainerLow/30 border border-white/5 space-y-4">
           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40">
             <span>Compute Power</span>
             <Zap size={14} />
           </div>
           <div className="text-4xl font-black font-mono tracking-tighter">
             {iterations.toLocaleString()} <span className="text-xs opacity-40">ops</span>
           </div>
           <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
             <motion.div 
               animate={{ width: isRunning ? '100%' : '0%' }} 
               transition={{ duration: isRunning ? 30 : 0.5 }}
               className="h-full bg-os-primary" 
             />
           </div>
        </div>

        <div className="p-6 rounded-3xl bg-os-surfaceContainerLow/30 border border-white/5 space-y-4 col-span-2">
           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-40">
             <span>Pressure Graph (20s)</span>
             <Cpu size={14} />
           </div>
           <div className="h-20 flex items-end gap-1 px-2">
              {history.map((val, i) => (
                <motion.div 
                  key={i}
                  animate={{ height: `${val}%` }}
                  className={`flex-grow rounded-t-sm transition-colors duration-500 ${val > 70 ? 'bg-red-500/50' : 'bg-os-primary/30'}`}
                />
              ))}
           </div>
        </div>
      </div>

      <div className="mt-auto p-10 rounded-[3rem] bg-gradient-to-br from-red-500/10 via-transparent to-transparent border border-white/5 relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle size={120} />
         </div>
         <div className="relative z-10 space-y-6">
            <h3 className="text-2xl font-black tracking-tight">Technical Warning</h3>
            <p className="text-os-onSurfaceVariant text-lg leading-relaxed max-w-2xl font-medium">
              This benchmark utility executes high-frequency mathematical operations on the browser's execution thread. 
              Running this test will intentionally cause the <strong>CPU Load</strong> metric in the System Widget to spike towards 100%.
            </p>
            <div className="flex gap-4">
               <div className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-400/10 px-4 py-2 rounded-full border border-red-400/20">
                  <Square size={12} /> High Thread Pressure
               </div>
               <div className="flex items-center gap-2 text-xs font-bold text-os-secondary bg-os-secondary/10 px-4 py-2 rounded-full border border-os-secondary/20">
                   <Zap size={12} /> Real-time Validation
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Benchmark;
