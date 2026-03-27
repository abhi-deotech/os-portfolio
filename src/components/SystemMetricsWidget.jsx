import React, { useEffect } from 'react';
import { Cpu, Database, Zap, Thermometer, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import useOSStore from '../store/osStore';

const SystemMetricsWidget = () => {
  const { systemMetrics, updateMetrics } = useOSStore();

  useEffect(() => {
    // If not overridden by a benchmark, add some realistic base jitter
    const interval = setInterval(() => {
      if (!systemMetrics.isOverridden) {
        updateMetrics({
          cpu: Math.floor(Math.random() * 8) + 5, // 5-13% idle
          ram: (Math.random() * 0.1 + 4.2).toFixed(1),
          temp: Math.floor(Math.random() * 4) + 38,
          power: Math.floor(Math.random() * 3) + 12
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [systemMetrics.isOverridden, updateMetrics]);

  const Metric = ({ icon: Icon, label, value, unit, color }) => (
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

  return (
    <div className="h-full p-5 bg-[#080808] rounded-3xl border border-white/5 flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center gap-3 mb-2">
        <Activity className="text-os-secondary animate-pulse" size={20} />
        <div>
          <h3 className="text-xs font-black text-white italic tracking-tight uppercase">Architecture Load</h3>
          <p className="text-[8px] font-bold text-os-secondary uppercase tracking-widest">System Engine v2.0</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Metric icon={Cpu} label="Quantum CPU" value={systemMetrics.cpu} unit="%" color="os-primary/20" />
        <Metric icon={Database} label="System RAM" value={systemMetrics.ram} unit="GB" color="blue-500/10" />
        <Metric icon={Thermometer} label="Core Temp" value={systemMetrics.temp} unit="°C" color="red-500/10" />
        <Metric icon={Zap} label="Power Draw" value={systemMetrics.power} unit="W" color="yellow-500/10" />
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
    </div>
  );
};

export default SystemMetricsWidget;
