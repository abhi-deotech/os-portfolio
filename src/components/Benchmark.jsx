import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, Square, Activity, Cpu, AlertTriangle, Zap, CheckCircle2, 
  ShieldAlert, BarChart3, Database, HardDrive, Timer, Gauge
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../store/osStore';

const STAGES = [
  { id: 'int', name: 'Integer Math', desc: 'Stress testing ALU with prime calculations', color: 'text-blue-400', icon: Cpu },
  { id: 'float', name: 'Floating Point', desc: 'Complex trigonometric and matrix simulations', color: 'text-purple-400', icon: Zap },
  { id: 'memory', name: 'Memory Bandwidth', desc: 'Simulated high-frequency buffer allocations', color: 'text-os-tertiary', icon: Database },
  { id: 'io', name: 'IO Throughput', desc: 'Virtual disk read/write throughput analysis', color: 'text-os-secondary', icon: HardDrive }
];

const Benchmark = () => {
  const { updateMetrics, unlockAchievement } = useOSStore();
  const [status, setStatus] = useState('idle'); // idle, running, completed
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [iterations, setIterations] = useState(0);
  const [results, setResults] = useState({});
  const [history, setHistory] = useState(Array(30).fill(0));
  const [ips, setIps] = useState(0); // Iterations Per Second

  const workerRef = useRef(null);
  const lastUpdateRef = useRef(performance.now());
  const iterationsSinceLastUpdate = useRef(0);

  useEffect(() => {
    // Shared worker for performance
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/benchmark.worker.js', import.meta.url));
    }

    const handleWorkerMessage = (e) => {
      const { iterations: count } = e.data;
      const stage = STAGES[currentStage];
      
      iterationsSinceLastUpdate.current += count;
      setIterations(prev => prev + count);
      
      setProgress(prev => {
        const next = Math.min(prev + (status === 'running' ? 0.4 : 0), 100);
        if (next >= 100 && status === 'running') {
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

      // Update global metrics to show "Stress"
      updateMetrics({
        cpu: Math.floor(Math.random() * 5) + 95,
        ram: Number((Math.random() * 0.2 + 7.8).toFixed(1)),
        temp: Math.floor(Math.random() * 3) + 72,
        isOverridden: true
      });
    };

    workerRef.current.onmessage = handleWorkerMessage;

    return () => {
      if (workerRef.current) {
        workerRef.current.onmessage = null;
      }
    };
  }, [status, currentStage, iterations, updateMetrics]);

  // IPS Calculation logic
  useEffect(() => {
    if (status !== 'running') {
      setIps(0);
      return;
    }

    const interval = setInterval(() => {
      const now = performance.now();
      const delta = (now - lastUpdateRef.current) / 1000;
      const currentIps = Math.floor(iterationsSinceLastUpdate.current / delta);
      
      setIps(currentIps);
      setHistory(prev => [...prev.slice(1), currentIps / 1000]);
      
      iterationsSinceLastUpdate.current = 0;
      lastUpdateRef.current = now;
    }, 200);

    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    let frameId;
    if (status === 'running' && workerRef.current) {
      const loop = () => {
        const stage = STAGES[currentStage];
        if (stage) {
          workerRef.current.postMessage({ stage: stage.id, duration: 16 });
        }
        frameId = requestAnimationFrame(loop);
      };
      frameId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(frameId);
  }, [status, currentStage]);

  const startBenchmark = () => {
    setStatus('running');
    setCurrentStage(0);
    setProgress(0);
    setIterations(0);
    setResults({});
    iterationsSinceLastUpdate.current = 0;
    lastUpdateRef.current = performance.now();
    unlockAchievement('speed_demon');
  };

  const stopBenchmark = () => {
    setStatus('idle');
    updateMetrics({ isOverridden: false });
  };

  const calculateFinalScore = () => {
    const total = Object.values(results).reduce((a, b) => a + b, 0);
    return Math.floor(total / 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#030305] text-os-onSurface p-4 md:p-8 font-sans overflow-hidden relative">
      <div className="scanline" />
      
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8 z-20">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="space-y-1"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-os-primary/20 rounded-lg border border-os-primary/30">
              <Gauge className="text-os-primary" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase italic text-glow">Quantum Bench</h1>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'running' ? 'bg-red-500 animate-pulse' : 'bg-os-tertiary'}`} />
                <p className="text-os-onSurfaceVariant text-[8px] font-bold uppercase tracking-[0.2em] opacity-60">
                  {status === 'running' ? 'Core Stress Active' : 'System Ready for Calibration'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
        
        <div className="flex gap-3">
          {status !== 'running' ? (
            <button 
              onClick={startBenchmark}
              className="group relative px-6 py-2.5 rounded-xl bg-os-primary text-black font-black uppercase tracking-widest text-[10px] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(var(--os-primary-rgb),0.4)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center gap-2">
                <Play size={14} fill="currentColor" /> Run Sequence
              </span>
            </button>
          ) : (
            <button 
              onClick={stopBenchmark}
              className="px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              Abort Test
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* Left Side: Stages & Telemetry */}
        <div className="lg:col-span-4 space-y-4 overflow-y-auto scrollbar-hide pr-2">
          {STAGES.map((stage, idx) => {
            const isActive = idx === currentStage && status === 'running';
            const isCompleted = idx < currentStage || status === 'completed';
            const Icon = stage.icon;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  isActive 
                    ? 'bg-os-primary/10 border-os-primary/40 shadow-[0_0_20px_rgba(var(--os-primary-rgb),0.1)]' 
                    : 'bg-white/[0.02] border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-os-primary text-black' : 'bg-white/5 text-os-onSurfaceVariant'}`}>
                      <Icon size={14} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-os-primary' : 'text-os-onSurfaceVariant'}`}>
                      {stage.name}
                    </span>
                  </div>
                  {isCompleted && <CheckCircle2 size={14} className="text-os-tertiary" />}
                </div>
                
                {isActive && (
                  <div className="space-y-2 mt-3 overflow-hidden">
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-os-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-os-onSurfaceVariant/60 uppercase">
                      <span>Analyzing...</span>
                      <span>{Math.floor(progress)}%</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Core Metrics */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center gap-2 opacity-40">
              <Activity size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest">Live Telemetry</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-os-onSurfaceVariant uppercase">Core Throttling</span>
                <span className="text-lg font-mono font-black text-os-primary italic">{status === 'running' ? 'Active' : 'Nominal'}</span>
              </div>
              <div className="h-12 flex items-end gap-1">
                {history.map((v, i) => (
                  <motion.div 
                    key={i} 
                    animate={{ height: `${Math.max(10, Math.min(100, (v / Math.max(...history, 1)) * 100))}%` }}
                    className={`flex-1 rounded-t-sm ${status === 'running' ? 'bg-os-primary' : 'bg-white/10'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Primary Visualizer & IPS */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex-grow rounded-[2.5rem] bg-white/[0.01] border border-white/5 p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--os-primary-rgb),0.05),transparent)] pointer-events-none" />
            
            {/* Quantum Core Animation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ 
                  rotate: status === 'running' ? 360 : 0,
                  scale: status === 'running' ? [1, 1.1, 1] : 1,
                }}
                transition={{ 
                  rotate: { repeat: Infinity, duration: status === 'running' ? 4 : 20, ease: "linear" },
                  scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                }}
                className="relative"
              >
                {/* Visualizer Rings */}
                <div className={`w-48 h-48 rounded-full border border-dashed transition-colors duration-500 ${status === 'running' ? 'border-os-primary/40' : 'border-white/10'}`} />
                <div className={`absolute inset-4 rounded-full border border-double animate-spin-slow transition-colors duration-500 ${status === 'running' ? 'border-os-secondary/40' : 'border-white/5'}`} />
                <motion.div 
                  animate={{ opacity: status === 'running' ? [0.2, 0.5, 0.2] : 0.1 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-12 rounded-full bg-os-primary blur-3xl" 
                />
              </motion.div>

              {/* Central IPS Display */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <AnimatePresence mode="wait">
                  {status === 'idle' ? (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      className="space-y-2"
                    >
                      <Timer className="text-os-onSurfaceVariant/20 mx-auto" size={48} />
                      <p className="text-[10px] font-black text-os-onSurfaceVariant uppercase tracking-[0.3em]">Awaiting Start</p>
                    </motion.div>
                  ) : status === 'running' ? (
                    <motion.div
                      key="running"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-0"
                    >
                      <span className="text-6xl font-black font-mono italic text-glow tracking-tighter">
                        {Math.floor(ips / 1000)}k
                      </span>
                      <p className="text-[10px] font-black text-os-primary uppercase tracking-[0.3em] block">Iterations / Sec</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="completed"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center"
                    >
                      <div className="text-6xl font-black italic text-glow-secondary">
                        {calculateFinalScore()}
                      </div>
                      <p className="text-[10px] font-black text-os-secondary uppercase tracking-[0.3em]">Quantum Score</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Corner Indicators */}
            <div className="absolute top-8 left-8 flex items-center gap-2 opacity-30">
              <ShieldAlert size={14} />
              <span className="text-[9px] font-bold uppercase tracking-widest leading-none">Security Mask: Enabled</span>
            </div>
          </div>

          {/* Bottom Actions/Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-center gap-1">
              <span className="text-[9px] font-black text-os-onSurfaceVariant uppercase tracking-widest">Total Computed</span>
              <span className="text-2xl font-black font-mono tracking-tight whitespace-nowrap">
                {iterations.toLocaleString()} <span className="text-[10px] opacity-40">OPS</span>
              </span>
            </div>
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col justify-center gap-1">
              <span className="text-[9px] font-black text-os-onSurfaceVariant uppercase tracking-widest">Environment</span>
              <span className="text-2xl font-black italic tracking-wide text-os-tertiary">Lumina-V8</span>
            </div>
          </div>
        </div>
      </div>
{/* Alert Footer */}
      <motion.div 
        animate={{ opacity: status === 'running' ? 1 : 0.4 }}
        className="mt-6 flex items-center gap-4 p-4 rounded-2xl bg-os-primary/5 border border-os-primary/10"
      >
        <AlertTriangle size={18} className="text-os-primary shrink-0" />
        <p className="text-[9px] font-bold uppercase tracking-wider leading-relaxed text-os-onSurfaceVariant">
          System integrity verified. Quantum Bench bypasses standard browser throttling to access peak virtual cycles. 
          Expect elevated fan curves and system temperature during execution.
        </p>
      </motion.div>
    </div>
  );
};

export default Benchmark;
