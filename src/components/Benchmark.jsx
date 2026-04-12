import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, Activity, Cpu, AlertTriangle, Zap, CheckCircle2, ShieldAlert, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../store/osStore';

const STAGES = [
  { id: 'int', name: 'Integer Math', desc: 'Stress testing ALU with prime calculations', color: 'text-blue-400' },
  { id: 'float', name: 'Floating Point', desc: 'Complex trigonometric and matrix simulations', color: 'text-purple-400' },
  { id: 'memory', name: 'Memory Bandwidth', desc: 'Simulated high-frequency buffer allocations', color: 'text-os-tertiary' },
  { id: 'io', name: 'IO Throughput', desc: 'Virtual disk read/write throughput analysis', color: 'text-os-secondary' }
];

const Benchmark = () => {
  const { updateMetrics, unlockAchievement } = useOSStore();
  const [status, setStatus] = useState('idle'); // idle, running, completed
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [iterations, setIterations] = useState(0);
  const [results, setResults] = useState({});
  const [history, setHistory] = useState(Array(20).fill(0));

  const runTest = useCallback(() => {
    if (status !== 'running') return;

    const stage = STAGES[currentStage];
    if (!stage) {
      setStatus('idle');
      return;
    }

    const startTime = performance.now();
    let count = 0;

    // Simulate different loads based on stage
    while (performance.now() - startTime < 16) { // Run for ~1 frame
      if (stage.id === 'int') {
        // Prime check simulation
        let n = Math.floor(Math.random() * 10000);
        for (let i = 2; i < Math.sqrt(n); i++) if (n % i === 0) break;
      } else if (stage.id === 'float') {
        Math.sin(Math.random()) * Math.cos(Math.random());
      } else {
        const arr = new Array(100).fill(Math.random());
        arr.reverse();
      }
      count++;
    }

    setIterations(prev => prev + count);
    setProgress(prev => {
      const next = prev + 0.5;
      if (next >= 100) {
        // Move to next stage or complete
        setResults(prevResults => ({
          ...prevResults,
          [stage.id]: iterations + count
        }));
        
        if (currentStage < STAGES.length - 1) {
          setCurrentStage(prevS => prevS + 1);
          setIterations(0);
          return 0;
        } else {
          setStatus('completed');
          updateMetrics({ isOverridden: false });
          return 100;
        }
      }
      return next;
    });

    // Update global metrics
    updateMetrics({
      cpu: Math.floor(Math.random() * 10) + 90,
      ram: Number((Math.random() * 0.5 + 6.5).toFixed(1)),
      temp: Math.floor(Math.random() * 5) + 65,
      isOverridden: true
    });

  }, [status, currentStage, iterations, updateMetrics]);

  useEffect(() => {
    let frameId;
    if (status === 'running') {
      const loop = () => {
        runTest();
        frameId = requestAnimationFrame(loop);
      };
      frameId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(frameId);
  }, [status, runTest]);

  useEffect(() => {
    const updateHistory = setInterval(() => {
      setHistory(prev => {
        const next = [...prev.slice(1), status === 'running' ? 85 + Math.random() * 15 : 5 + Math.random() * 8];
        return next;
      });
    }, 500);
    return () => clearInterval(updateHistory);
  }, [status]);

  const startBenchmark = () => {
    setStatus('running');
    setCurrentStage(0);
    setProgress(0);
    setIterations(0);
    setResults({});
    unlockAchievement('speed_demon');
  };

  const stopBenchmark = () => {
    setStatus('idle');
    updateMetrics({ isOverridden: false });
  };

  const calculateFinalScore = () => {
    const total = Object.values(results).reduce((a, b) => a + b, 0);
    return Math.floor(total / 100);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-os-onSurface p-6 md:p-8 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-os-primary">
            <BarChart3 size={32} className={status === 'running' ? "animate-pulse" : ""} />
            <h1 className="text-3xl font-black tracking-tight uppercase">Quantum Bench</h1>
          </div>
          <p className="text-os-onSurfaceVariant text-[10px] font-bold opacity-60 uppercase tracking-[0.25em]">Precision Stress Utility v2.4.0</p>
        </div>
        
        {status !== 'running' ? (
          <button 
            onClick={startBenchmark}
            className="px-8 py-3 rounded-2xl bg-os-primary text-black font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(204,151,255,0.3)]"
          >
            Run Benchmark
          </button>
        ) : (
          <button 
            onClick={stopBenchmark}
            className="px-8 py-3 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all"
          >
            Abort Test
          </button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto scrollbar-hide space-y-6">
        {status === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-os-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Zap className="text-os-primary" size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase italic">Ready for Calibration</h2>
              <p className="text-os-onSurfaceVariant text-sm max-w-md mx-auto leading-relaxed">
                Start the benchmark to measure your virtual hardware performance. 
                This will execute 4 stages of intensive computational logic.
              </p>
            </div>
          </motion.div>
        )}

        {status === 'running' && (
          <div className="space-y-6">
            {/* Active Stage Card */}
            <motion.div 
              key={currentStage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Activity size={100} />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black px-2 py-1 rounded bg-white/10 ${STAGES[currentStage]?.color || 'text-gray-400'}`}>STAGE {currentStage + 1}/4</span>
                  <h3 className="text-2xl font-black uppercase italic">{STAGES[currentStage]?.name || 'Complete'}</h3>
                </div>
                <p className="text-os-onSurfaceVariant text-sm font-medium">{STAGES[currentStage]?.desc || 'Finalizing results...'}</p>
                
                <div className="space-y-2 pt-4">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                    <span>Processing Load</span>
                    <span>{Math.floor(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full bg-os-primary`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5">
                <span className="text-[10px] font-black text-os-onSurfaceVariant uppercase tracking-widest block mb-2">Iterations</span>
                <span className="text-3xl font-mono font-black">{iterations.toLocaleString()}</span>
              </div>
              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5">
                <span className="text-[10px] font-black text-os-onSurfaceVariant uppercase tracking-widest block mb-2">Core Pressure</span>
                <div className="h-8 flex items-end gap-0.5">
                  {history.slice(-10).map((v, i) => (
                    <div key={i} className="flex-1 bg-os-primary/40 rounded-t-sm" style={{ height: `${v}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {status === 'completed' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 pb-10"
          >
            <div className="p-8 rounded-[3rem] bg-gradient-to-br from-os-primary/20 to-transparent border border-os-primary/30 relative overflow-hidden">
              <div className="relative z-10 text-center space-y-4">
                <CheckCircle2 className="text-os-primary mx-auto" size={48} />
                <h2 className="text-4xl font-black uppercase italic tracking-tighter">Calibration Complete</h2>
                <div className="py-4">
                  <span className="text-7xl font-black font-display text-white">{calculateFinalScore()}</span>
                  <p className="text-os-primary font-black uppercase tracking-[0.3em] text-xs mt-2">Final Performance Rating</p>
                </div>
                <button 
                  onClick={startBenchmark}
                  className="text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest"
                >
                  Restart Analysis
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STAGES.map(stage => (
                <div key={stage.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-center">
                  <span className="text-xs font-bold text-os-onSurfaceVariant uppercase">{stage.name}</span>
                  <span className="font-mono font-black text-os-primary">{results[stage.id]?.toLocaleString()} <span className="text-[8px] opacity-40">IPS</span></span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Warning Footer */}
      <div className="mt-6 flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 opacity-60">
        <ShieldAlert size={20} className="text-os-secondary shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-wider leading-relaxed">
          System integrity verified. Lumina OS uses neural-link optimization to ensure your browser environment 
          remains stable during high-frequency stress testing.
        </p>
      </div>
    </div>
  );
};

export default Benchmark;
