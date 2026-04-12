import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Sun, Cpu, Database, Activity, 
  Zap, ChevronRight, 
  LayoutDashboard, MessageSquare, Globe,
  ShieldCheck, ArrowUpRight
} from 'lucide-react';
import useOSStore from '../store/osStore';
import useSystemMetrics from '../hooks/useSystemMetrics';
import SocialWidget from './SocialWidget';

const SystemDashboard = () => {
  const { transparencyEffects, activeAccent } = useOSStore();
  const metrics = useSystemMetrics();
  const [activeTab, setActiveTab] = useState('social'); // 'social', 'system', 'network'
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const accentHex = activeAccent === 'purple' ? '#cc97ff' : 
                    activeAccent === 'blue' ? '#3b82f6' : 
                    activeAccent === 'green' ? '#00f5a0' : '#ff68f0';

  return (
    <div className={`w-[420px] bg-[#0a0a0a]/90 ${transparencyEffects ? 'backdrop-blur-3xl' : ''} rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col select-none`}>
      {/* 1. Mini Metrics Bar (Now the header) */}
      <div className="px-6 py-4 flex gap-4 border-b border-white/5 bg-black/20">
         <div className="flex-1 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-os-secondary/10 text-os-secondary">
               <Cpu size={14} />
            </div>
            <div className="flex flex-col flex-1">
               <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/30">
                  <span>CPU</span>
                  <span className="text-os-secondary">{metrics.cpu}%</span>
               </div>
               <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                  <motion.div className="h-full bg-os-secondary" animate={{ width: `${metrics.cpu}%` }} />
               </div>
            </div>
         </div>
         <div className="w-px h-8 bg-white/5" />
         <div className="flex-1 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-os-tertiary/10 text-os-tertiary">
               <Database size={14} />
            </div>
            <div className="flex flex-col flex-1">
               <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/30">
                  <span>RAM</span>
                  <span className="text-os-tertiary">{metrics.ram}%</span>
               </div>
               <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                  <motion.div className="h-full bg-os-tertiary" animate={{ width: `${metrics.ram}%` }} />
               </div>
            </div>
         </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex p-2 gap-1 bg-black/40 border-b border-white/5">
         {[
           { id: 'social', icon: Globe, label: 'Feed' },
           { id: 'system', icon: ShieldCheck, label: 'Health' },
           { id: 'shortcuts', icon: LayoutDashboard, label: 'Nodes' }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-white/10 text-white shadow-inner' : 'text-white/30 hover:bg-white/5 hover:text-white/60'}`}
           >
             <tab.icon size={14} />
             <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
           </button>
         ))}
      </div>

      {/* 4. Tab Content Area */}
      <div className="flex-grow min-h-[340px] relative overflow-hidden flex flex-col">
         <AnimatePresence mode="wait">
            {activeTab === 'social' && (
              <motion.div 
                key="social"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="h-full flex flex-col p-4"
              >
                {/* We can directly wrap SocialWidget or a condensed version */}
                <div className="flex-grow scale-[0.95] origin-top">
                   <SocialWidget />
                </div>
              </motion.div>
            )}

            {activeTab === 'system' && (
              <motion.div 
                key="system"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-6 space-y-6"
              >
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 px-1">Security Status</h4>
                   <div className="p-4 rounded-2xl bg-os-primary/10 border border-os-primary/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-os-primary animate-pulse" />
                         <span className="text-xs font-bold text-white">Neural Firewall Active</span>
                      </div>
                      <ShieldCheck size={16} className="text-os-primary" />
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 px-1">Resource Distribution</h4>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                         <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Uptime</span>
                         <p className="text-sm font-black text-white">124:12:05</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                         <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Efficiency</span>
                         <p className="text-sm font-black text-os-secondary">98.4%</p>
                      </div>
                   </div>
                </div>

                <div className="mt-auto pt-4 flex justify-center">
                   <button 
                    onClick={() => useOSStore.getState().openWindow('taskmanager')}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-os-primary hover:text-white transition-colors group"
                   >
                      Open Advanced Monitor <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                   </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'shortcuts' && (
              <motion.div 
                key="shortcuts"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-6 grid grid-cols-2 gap-3"
              >
                {[
                  { id: 'terminal', name: 'Terminal', desc: 'Shell access' },
                  { id: 'files', name: 'Explorer', desc: 'Storage' },
                  { id: 'chat', name: 'Guestbook', desc: 'Social' },
                  { id: 'mail', name: 'Neural Mail', desc: 'Contact' },
                  { id: 'benchmark', name: 'Quantum Bench', desc: 'Stress' },
                  { id: 'settings', name: 'Preferences', desc: 'Control' }
                ].map(node => (
                  <button 
                    key={node.id}
                    onClick={() => useOSStore.getState().openWindow(node.id)}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-os-primary/10 hover:border-os-primary/30 transition-all text-left group"
                  >
                    <span className="block text-xs font-black text-white group-hover:text-os-primary">{node.name}</span>
                    <span className="block text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">{node.desc}</span>
                  </button>
                ))}
              </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* 5. Footer Signature */}
      <div className="p-4 border-t border-white/5 bg-black/40 flex justify-between items-center text-[8px] font-black text-white/10 uppercase tracking-[0.3em]">
         <span>System Authority: Vibe-OS</span>
         <span>Node ID: 0xAbhi</span>
      </div>
    </div>
  );
};

export default SystemDashboard;
