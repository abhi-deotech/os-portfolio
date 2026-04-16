import React, { useEffect, useState, useCallback } from 'react';
import { Cpu, Database, Zap, Thermometer, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useOSStore from '../store/osStore';

// Number counter animation hook
const useCountUp = (end, duration = 1000, start = 0) => {
  const [value, setValue] = useState(start);
  
  useEffect(() => {
    let startTime = null;
    let animationFrame = null;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setValue(Math.floor(start + (end - start) * easeOutQuart));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, start]);
  
  return value;
};

// Expanded metric row with Task Manager styling
const ExpandedMetric = ({ icon: Icon, label, value, unit, color, delay, isOpen }) => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const animatedValue = useCountUp(isOpen ? numericValue : 0, 1000);
  const displayValue = unit === 'GB' ? animatedValue.toFixed(1) : animatedValue;
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group flex items-center justify-between p-4 bg-gradient-to-r from-white/[0.03] to-transparent rounded-2xl border border-white/[0.08] hover:border-white/20 transition-all cursor-default overflow-hidden relative"
    >
      {/* Background glow on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, ${color}08 0%, transparent 100%)` }}
      />
      
      <div className="flex items-center gap-4 relative z-10">
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-11 h-11 rounded-xl flex items-center justify-center relative"
          style={{ 
            background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
            boxShadow: `0 4px 24px ${color}25, inset 0 1px 0 ${color}20`
          }}
        >
          <Icon size={20} style={{ color }} />
          {/* Animated ring */}
          <div 
            className="absolute inset-0 rounded-xl animate-ping opacity-20"
            style={{ border: `1px solid ${color}` }}
          />
        </motion.div>
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-[0.15em]">{label}</span>
          <div className="h-0.5 w-8 bg-white/10 rounded-full mt-1 overflow-hidden">
            <motion.div 
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: delay + 0.3, duration: 0.8 }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex items-baseline gap-1 relative z-10">
        <span 
          className="text-lg font-black text-white tabular-nums"
          style={{ textShadow: `0 0 20px ${color}40` }}
        >
          {displayValue}
        </span>
        <span className="text-xs font-bold text-white/30 uppercase ml-0.5">{unit}</span>
      </div>
    </motion.div>
  );
};

// Compact metric for widget view
const CompactMetric = ({ icon: Icon, label, value, unit, color }) => (
  <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
    <div className="flex items-center gap-3">
      <div 
        className="p-2 rounded-xl"
        style={{ 
          backgroundColor: `rgba(var(--${color.split('/')[0]}-rgb), 0.1)`,
          boxShadow: `0 0 15px rgba(var(--${color.split('/')[0]}-rgb), 0.2)`
        }}
      >
        <Icon size={14} className="text-white" />
      </div>
      <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xs font-black text-white">{value}</span>
      <span className="text-[8px] font-black text-white/20 uppercase">{unit}</span>
    </div>
  </div>
);

const SystemMetricsWidget = () => {
  const systemMetrics = useOSStore(state => state.systemMetrics);
  const updateMetrics = useOSStore(state => state.updateMetrics);
  const transparencyEffects = useOSStore(state => state.transparencyEffects);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Stable metrics update
  useEffect(() => {
    const interval = setInterval(() => {
      if (!systemMetrics.isOverridden) {
        updateMetrics({
          cpu: Math.floor(Math.random() * 8) + 5,
          ram: Number((Math.random() * 0.1 + 4.2).toFixed(1)),
          temp: Math.floor(Math.random() * 4) + 38,
          power: Math.floor(Math.random() * 3) + 12
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [systemMetrics.isOverridden, updateMetrics]);

  const handleExpand = useCallback(() => {
    setIsClosing(false);
    setIsExpanded(true);
  }, []);

  const handleClose = useCallback((e) => {
    if (e) e.stopPropagation();
    setIsClosing(true);
    setTimeout(() => {
      setIsExpanded(false);
      setIsClosing(false);
    }, 400);
  }, []);

  return (
    <>
      {/* Compact Widget */}
      <motion.div 
        onClick={handleExpand}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="h-full p-5 bg-[#080808] rounded-3xl border border-white/5 flex flex-col gap-4 overflow-hidden cursor-pointer hover:border-white/10 transition-colors"
      >
        <div className="flex items-center gap-3 mb-2">
          <Activity className="text-os-secondary animate-pulse" size={20} />
          <div>
            <h3 className="text-xs font-black text-white italic tracking-tight uppercase">Architecture Load</h3>
            <p className="text-[8px] font-bold text-os-secondary uppercase tracking-widest">System Engine v2.0</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <CompactMetric icon={Cpu} label="Quantum CPU" value={systemMetrics.cpu} unit="%" color="os-primary/20" />
          <CompactMetric icon={Database} label="System RAM" value={systemMetrics.ram} unit="GB" color="blue-500/10" />
          <CompactMetric icon={Thermometer} label="Core Temp" value={systemMetrics.temp} unit="°C" color="red-500/10" />
          <CompactMetric icon={Zap} label="Power Draw" value={systemMetrics.power} unit="W" color="yellow-500/10" />
        </div>

        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Efficiency</span>
            <span className="text-[9px] font-black text-os-secondary uppercase tracking-widest">94.2%</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: '0%' }}
               animate={{ width: '94.2%' }}
               className="h-full bg-os-secondary"
             />
          </div>
        </div>
      </motion.div>

      {/* Expanded Popup - Fixed animation and z-index */}
      <AnimatePresence mode="wait">
        {isExpanded && !isClosing && (
          <motion.div
            key="expanded-metrics-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200]"
          >
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Card Container */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <motion.div
                key="card"
                initial={{ scale: 0.7, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{ 
                  type: "spring",
                  stiffness: 350,
                  damping: 30,
                  mass: 0.8
                }}
                className={`pointer-events-auto w-[340px] ${transparencyEffects ? 'backdrop-blur-2xl' : ''}`}
              >
                <div className="p-6 bg-[#0a0a0a]/95 rounded-[2rem] border border-white/[0.12] shadow-[0_32px_64px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden relative">
                  {/* Ambient glow layers */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-os-primary/20 rounded-full blur-[80px] pointer-events-none" />
                  <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-os-secondary/15 rounded-full blur-[80px] pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                  {/* Header - Task Manager style */}
                  <motion.div 
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="flex items-center gap-4 mb-8 relative z-10"
                  >
                    <div className="p-3 rounded-xl bg-gradient-to-br from-os-primary/20 to-os-primary/5 border border-os-primary/20">
                      <Activity className="text-os-primary" size={22} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-sm font-black text-white italic tracking-tight uppercase">Architecture Load</h2>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-0.5">System Engine V2.0</p>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleClose}
                      className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/10"
                    >
                      <X size={16} strokeWidth={2.5} />
                    </motion.button>
                  </motion.div>

                  {/* Metrics */}
                  <div className="flex flex-col gap-3 relative z-10">
                    <ExpandedMetric 
                      icon={Cpu} 
                      label="Quantum CPU" 
                      value={systemMetrics.cpu} 
                      unit="%" 
                      color="#cc97ff" 
                      delay={0.15}
                      isOpen={isExpanded}
                    />
                    <ExpandedMetric 
                      icon={Database} 
                      label="System RAM" 
                      value={systemMetrics.ram} 
                      unit="GB" 
                      color="#00d2fd" 
                      delay={0.22}
                      isOpen={isExpanded}
                    />
                    <ExpandedMetric 
                      icon={Thermometer} 
                      label="Core Temp" 
                      value={systemMetrics.temp} 
                      unit="°C" 
                      color="#ff6b6b" 
                      delay={0.29}
                      isOpen={isExpanded}
                    />
                    <ExpandedMetric 
                      icon={Zap} 
                      label="Power Draw" 
                      value={systemMetrics.power} 
                      unit="W" 
                      color="#ffd93d" 
                      delay={0.36}
                      isOpen={isExpanded}
                    />
                  </div>

                  {/* Efficiency Section */}
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.4 }}
                    className="mt-6 pt-5 border-t border-white/[0.08] relative z-10"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-os-secondary animate-pulse" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Efficiency Rating</span>
                      </div>
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, type: "spring", stiffness: 500 }}
                        className="text-lg font-black text-os-secondary uppercase tracking-wider"
                        style={{ textShadow: '0 0 20px rgba(0, 210, 253, 0.4)' }}
                      >
                        94.2%
                      </motion.span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
                      <motion.div 
                        initial={{ width: '0%', opacity: 0 }}
                        animate={{ width: '94.2%', opacity: 1 }}
                        transition={{ delay: 0.5, duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="h-full bg-gradient-to-r from-os-primary via-os-secondary to-os-primary rounded-full relative"
                      >
                        {/* Shimmer effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Footer status */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-4 pt-3 border-t border-white/[0.05] flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-green-500" />
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">System Optimal</span>
                    </div>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">v2.0.1</span>
                  </motion.div>

                  {/* Floating particles */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
                    {[...Array(4)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 rounded-full"
                        style={{ background: `linear-gradient(180deg, #cc97ff 0%, transparent 100%)` }}
                        initial={{ 
                          x: 30 + i * 70, 
                          y: 350,
                          opacity: 0,
                          scale: 0
                        }}
                        animate={{ 
                          y: -20,
                          opacity: [0, 0.6, 0],
                          scale: [0.5, 1, 0.5]
                        }}
                        transition={{ 
                          duration: 4,
                          delay: 0.8 + i * 0.6,
                          repeat: Infinity,
                          ease: "easeOut"
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SystemMetricsWidget;
