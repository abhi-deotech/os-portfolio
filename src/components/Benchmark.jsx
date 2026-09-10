import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Activity, Cpu, AlertTriangle, Zap, CheckCircle2,
  ShieldAlert, Database, HardDrive, Timer, Gauge, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../store/osStore';
import { createGpuBench } from '../workers/gpuBench';

const STAGES = [
  { id: 'int', kind: 'cpu', name: 'Integer Math', desc: 'Stress testing ALU with prime calculations', color: 'text-blue-400', icon: Cpu },
  { id: 'float', kind: 'cpu', name: 'Floating Point', desc: 'Complex trigonometric and matrix simulations', color: 'text-purple-400', icon: Zap },
  { id: 'memory', kind: 'cpu', name: 'Memory Bandwidth', desc: 'Simulated high-frequency buffer allocations', color: 'text-os-tertiary', icon: Database },
  { id: 'io', kind: 'cpu', name: 'IO Throughput', desc: 'Virtual disk read/write throughput analysis', color: 'text-os-secondary', icon: HardDrive },
  { id: 'gpu', kind: 'gpu', name: 'GPU Compute', desc: 'WebGPU 512x512 single-precision matrix multiply', color: 'text-os-primary', icon: Layers },
];

const CPU_STAGES = STAGES.filter((s) => s.kind === 'cpu');

/**
 * Wall-clock budget per stage. Progress is `elapsed / STAGE_MS` — a real fraction of real work.
 *
 * The previous bar advanced by 0.4 per worker reply, so it measured *messages*, not work. That is
 * also why a pool could not simply be dropped in underneath it: N workers reply N times faster, so
 * the bar would have filled N times sooner and every stage would have ended early.
 */
const STAGE_MS = 2500;

/** One worker slice. Short slices keep the pool responsive to an abort. */
const SLICE_MS = 16;

/**
 * One worker per core, leaving one for the main thread so the shell keeps painting during a run.
 * Capped at 16: `hardwareConcurrency` can report implausible values, and past that point the pool
 * costs more to coordinate than it returns.
 */
const POOL_SIZE = Math.max(1, Math.min((navigator.hardwareConcurrency || 4) - 1, 16));

const Benchmark = () => {
  const updateMetrics = useOSStore((s) => s.updateMetrics);
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);
  const [status, setStatus] = useState('idle'); // idle, running, completed
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({});
  const [history, setHistory] = useState(Array(30).fill(0));
  const [totalOps, setTotalOps] = useState(0);
  // Work per second in the current stage's own unit: iterations for CPU stages, FLOPs for the GPU.
  const [rate, setRate] = useState(0);
  const [gpuInfo, setGpuInfo] = useState(null);

  const poolRef = useRef(null);
  const runIdRef = useRef(0);
  const liveRef = useRef(0);      // work since the last rate tick
  const totalRef = useRef(0);     // CPU iterations across the whole run
  const lastTickRef = useRef(0);

  // Build the pool once. A run cannot create workers on demand: spawning sixteen threads is slow
  // enough to eat a measurable slice of the first stage and skew it.
  useEffect(() => {
    poolRef.current = Array.from({ length: POOL_SIZE }, () =>
      new Worker(new URL('../workers/benchmark.worker.js', import.meta.url))
    );
    const pool = poolRef.current;
    // Hold the ref object, not `.current`. Cleanup must bump the *live* run id — that is what
    // stops the GPU loop calling setState on an unmounted component — and reading `.current` here
    // instead would capture the mount-time value, which is exactly what the lint rule warns about.
    const runId = runIdRef;
    return () => {
      runId.current++;
      pool.forEach((w) => w.terminate());
      poolRef.current = null;
    };
  }, []);

  /**
   * Saturate the pool for STAGE_MS, then wait for in-flight slices to land.
   *
   * Each worker is re-fed the moment its own reply arrives, so a slow core never holds back a fast
   * one — the pool self-clocks instead of running in lockstep rounds.
   */
  const runCpuStage = useCallback((stageId, runId) => new Promise((resolve) => {
    const pool = poolRef.current;
    if (!pool) {
      resolve({ ops: 0, ms: 0 });
      return;
    }

    const started = performance.now();
    let ops = 0;
    let inFlight = 0;
    let settled = false;

    const settle = () => {
      if (settled) return;
      settled = true;
      pool.forEach((w) => { w.onmessage = null; });
      resolve({ ops, ms: performance.now() - started });
    };

    const feed = (worker) => {
      if (runIdRef.current !== runId) return;
      if (performance.now() - started >= STAGE_MS) return;
      inFlight++;
      worker.postMessage({ stage: stageId, duration: SLICE_MS });
    };

    pool.forEach((worker) => {
      worker.onmessage = (e) => {
        inFlight--;
        ops += e.data.iterations;
        liveRef.current += e.data.iterations;
        totalRef.current += e.data.iterations;

        setProgress(Math.min(100, ((performance.now() - started) / STAGE_MS) * 100));

        feed(worker);
        // The budget is spent and the last outstanding slice has reported.
        if (inFlight === 0) settle();
      };
      feed(worker);
    });

    if (inFlight === 0) settle();
  }), []);

  /**
   * The GPU stage. Resolves with `{ unavailable: true }` rather than throwing or hanging when
   * there is no WebGPU — a missing adapter is an ordinary outcome on plenty of machines.
   */
  const runGpuStage = useCallback(async (runId) => {
    const bench = await createGpuBench();
    if (!bench) return { unavailable: true };
    if (runIdRef.current !== runId) {
      bench.destroy();
      return { unavailable: false, flops: 0, ms: 0, gflops: 0 };
    }

    setGpuInfo(bench.info);
    const started = performance.now();
    let flops = 0;

    try {
      while (performance.now() - started < STAGE_MS && runIdRef.current === runId) {
        const slice = await bench.runSlice();
        if (slice.ms === 0) break; // device lost mid-run
        flops += slice.flops;
        liveRef.current += slice.flops;
        setProgress(Math.min(100, ((performance.now() - started) / STAGE_MS) * 100));
      }
    } finally {
      bench.destroy();
    }

    const ms = performance.now() - started;
    return { flops, ms, gflops: ms > 0 ? flops / ms / 1e6 : 0 };
  }, []);

  const startBenchmark = async () => {
    const runId = ++runIdRef.current;
    setStatus('running');
    setCurrentStage(0);
    setProgress(0);
    setResults({});
    setRate(0);
    setTotalOps(0);
    setHistory(Array(30).fill(0));
    liveRef.current = 0;
    totalRef.current = 0;
    lastTickRef.current = performance.now();
    unlockAchievement('speed_demon');

    for (let i = 0; i < STAGES.length; i++) {
      if (runIdRef.current !== runId) return;
      const stage = STAGES[i];
      setCurrentStage(i);
      setProgress(0);
      // Reset the sparkline at each boundary: iterations/sec and FLOPs/sec differ by six orders of
      // magnitude, so a shared scale would flatten one of them to nothing.
      setHistory(Array(30).fill(0));

      const result = stage.kind === 'gpu'
        ? await runGpuStage(runId)
        : await runCpuStage(stage.id, runId);

      if (runIdRef.current !== runId) return;
      setResults((prev) => ({ ...prev, [stage.id]: result }));
      setProgress(100);
    }

    if (runIdRef.current !== runId) return;
    setStatus('completed');
    setRate(0);
    updateMetrics({ isOverridden: false });
  };

  const stopBenchmark = () => {
    runIdRef.current++;
    setStatus('idle');
    setRate(0);
    setProgress(0);
    updateMetrics({ isOverridden: false });
  };

  // Rate + sparkline ticker.
  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      const now = performance.now();
      const seconds = (now - lastTickRef.current) / 1000;
      if (seconds <= 0) return;

      const perSecond = liveRef.current / seconds;
      setRate(perSecond);
      setHistory((prev) => [...prev.slice(1), perSecond]);
      setTotalOps(totalRef.current);

      liveRef.current = 0;
      lastTickRef.current = now;
    }, 200);

    return () => clearInterval(interval);
  }, [status]);

  // Flag the shell as stressed for the duration of the run. This used to fire on every worker
  // reply; with a pool that would be POOL_SIZE * 60 store writes a second.
  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      updateMetrics({
        cpu: Math.floor(Math.random() * 5) + 95,
        ram: Number((Math.random() * 0.2 + 7.8).toFixed(1)),
        temp: Math.floor(Math.random() * 3) + 72,
        isOverridden: true
      });
    }, 500);

    return () => clearInterval(interval);
  }, [status, updateMetrics]);

  const gpuResult = results.gpu;
  const gflops = gpuResult && !gpuResult.unavailable ? gpuResult.gflops : null;

  const calculateFinalScore = () => {
    const total = CPU_STAGES.reduce((sum, s) => sum + (results[s.id]?.ops || 0), 0);
    return Math.floor(total / 1000);
  };

  const activeStage = STAGES[currentStage];
  const isGpuActive = activeStage?.kind === 'gpu';
  // One number, two units — iterations for the CPU stages, GFLOPS for the GPU one.
  const rateValue = isGpuActive ? (rate / 1e9).toFixed(1) : `${Math.floor(rate / 1000)}k`;
  const rateLabel = isGpuActive ? 'GFLOPS' : 'Iterations / Sec';

  const adapterName = gpuInfo
    ? [gpuInfo.vendor, gpuInfo.architecture].filter(Boolean).join(' ') || gpuInfo.description
    : '';

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
              className="group relative px-6 py-2.5 rounded-xl bg-os-primary text-sdl-onAccent font-black uppercase tracking-widest text-[10px] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgb(var(--os-primary-rgb)_/_0.4)]"
            >
              <div className="absolute inset-0 bg-veil/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center gap-2">
                <Play size={14} fill="currentColor" /> Run Sequence
              </span>
            </button>
          ) : (
            <button
              onClick={stopBenchmark}
              className="px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-sdl-onAccent transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
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
            const result = results[stage.id];
            const isCompleted = !!result;
            const Icon = stage.icon;

            let resultText = null;
            if (result?.unavailable) resultText = 'No WebGPU adapter';
            else if (result && stage.kind === 'gpu') resultText = `${result.gflops.toFixed(1)} GFLOPS`;
            else if (result) resultText = `${result.ops.toLocaleString()} ops`;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  isActive
                    ? 'bg-os-primary/10 border-os-primary/40 shadow-[0_0_20px_rgb(var(--os-primary-rgb)_/_0.1)]'
                    : 'bg-veil/[0.02] border-hairline/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-os-primary text-sdl-onAccent' : 'bg-veil/5 text-os-onSurfaceVariant'}`}>
                      <Icon size={14} />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-os-primary' : 'text-os-onSurfaceVariant'}`}>
                      {stage.name}
                    </span>
                  </div>
                  {isCompleted && !result.unavailable && <CheckCircle2 size={14} className="text-os-tertiary" />}
                </div>

                {isActive && (
                  <div className="space-y-2 mt-3 overflow-hidden">
                    <div className="h-1 w-full bg-veil/5 rounded-full overflow-hidden">
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

                {!isActive && resultText && (
                  <div className="mt-2 text-[9px] font-mono font-bold uppercase tracking-wider text-os-onSurfaceVariant/50">
                    {resultText}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Core Metrics */}
          <div className="p-5 rounded-2xl bg-veil/[0.02] border border-hairline/5 space-y-4">
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
                    className={`flex-1 rounded-t-sm ${status === 'running' ? 'bg-os-primary' : 'bg-veil/10'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Primary Visualizer & IPS */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex-grow rounded-[2.5rem] bg-veil/[0.01] border border-hairline/5 p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(var(--os-primary-rgb)_/_0.05),transparent)] pointer-events-none" />

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
                <div className={`w-48 h-48 rounded-full border border-dashed transition-colors duration-500 ${status === 'running' ? 'border-os-primary/40' : 'border-hairline/10'}`} />
                <div className={`absolute inset-4 rounded-full border border-double animate-spin-slow transition-colors duration-500 ${status === 'running' ? 'border-os-secondary/40' : 'border-hairline/5'}`} />
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
                        {rateValue}
                      </span>
                      <p className="text-[10px] font-black text-os-primary uppercase tracking-[0.3em] block">{rateLabel}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-6 rounded-3xl bg-veil/[0.02] border border-hairline/5 flex flex-col justify-center gap-1">
              <span className="text-[9px] font-black text-os-onSurfaceVariant uppercase tracking-widest">Total Computed</span>
              <span className="text-2xl font-black font-mono tracking-tight whitespace-nowrap">
                {totalOps.toLocaleString()} <span className="text-[10px] opacity-40">OPS</span>
              </span>
            </div>
            <div className="p-6 rounded-3xl bg-veil/[0.02] border border-hairline/5 flex flex-col justify-center gap-1">
              <span className="text-[9px] font-black text-os-onSurfaceVariant uppercase tracking-widest">Parallelism</span>
              <span className="text-2xl font-black font-mono tracking-tight whitespace-nowrap">
                {POOL_SIZE}x <span className="text-[10px] opacity-40">THREADS</span>
              </span>
              <span className="text-[9px] font-bold text-os-onSurfaceVariant/40 uppercase tracking-wider">
                {navigator.hardwareConcurrency || '?'} logical cores
              </span>
            </div>
            <div className="p-6 rounded-3xl bg-veil/[0.02] border border-hairline/5 flex flex-col justify-center gap-1">
              <span className="text-[9px] font-black text-os-onSurfaceVariant uppercase tracking-widest">GPU Compute</span>
              <span className="text-2xl font-black font-mono tracking-tight whitespace-nowrap text-os-tertiary">
                {gflops === null ? '—' : gflops.toFixed(1)} <span className="text-[10px] opacity-40">GFLOPS</span>
              </span>
              <span className="text-[9px] font-bold text-os-onSurfaceVariant/40 uppercase tracking-wider truncate">
                {adapterName || (gpuResult?.unavailable ? 'WebGPU unavailable' : 'Not measured')}
              </span>
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
          Quantum Bench saturates {POOL_SIZE} worker thread{POOL_SIZE === 1 ? '' : 's'} and dispatches a
          single-precision matrix multiply to your GPU via WebGPU. This is real work on real silicon.
          Expect elevated fan curves and system temperature during execution.
        </p>
      </motion.div>
    </div>
  );
};

export default Benchmark;
