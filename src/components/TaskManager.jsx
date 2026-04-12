import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X, Shield, Cpu, Database, Zap, HardDrive } from 'lucide-react';
import useOSStore from '../store/osStore';

const TaskManager = () => {
  const { openWindows, closeWindow, unlockAchievement, systemMetrics, triggerBSOD } = useOSStore();

  useEffect(() => {
    unlockAchievement('monitor');
    unlockAchievement('system_pro');
  }, [unlockAchievement]);

  const appMeta = {
    terminal: { name: 'Terminal (zsh)', icon: Database, color: 'text-os-primary' },
    settings: { name: 'Settings Hub', icon: Shield, color: 'text-os-secondary' },
    music: { name: 'Music Player', icon: HardDrive, color: 'text-purple-400' },
    benchmark: { name: 'Stress Test Tool', icon: Zap, color: 'text-red-400' },
    notepad: { name: 'Notepad Text Editor', icon: Activity, color: 'text-cyan-400' },
    files: { name: 'File Explorer', icon: HardDrive, color: 'text-yellow-400' },
    browser: { name: 'Flow-Net Browser', icon: Database, color: 'text-blue-400' },
    aichat: { name: 'Lumina Neural Link', icon: Cpu, color: 'text-os-primary' },
  };

  const systemProcesses = [
    { id: 'kernel', name: 'Lumina Kernel', icon: Cpu, color: 'text-os-primary', cpu: 1.2, ram: 0.8 },
    { id: 'window-server', name: 'Window Server', icon: Activity, color: 'text-os-secondary', cpu: 2.4, ram: 1.2 },
    { id: 'system-ui', name: 'System UI Shell', icon: Shield, color: 'text-os-tertiary', cpu: 0.8, ram: 0.5 },
    { id: 'network-mgr', name: 'Network Manager', icon: Zap, color: 'text-blue-400', cpu: 0.2, ram: 0.2 },
    { id: 'audio-daemon', name: 'Audio Daemon', icon: HardDrive, color: 'text-purple-400', cpu: 0.1, ram: 0.1 },
  ];

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="px-8 py-8 border-b border-white/5 bg-gradient-to-br from-os-primary/5 to-transparent">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-os-primary">
              <Activity size={28} />
              <h1 className="text-3xl font-black tracking-tight uppercase italic">Task Manager</h1>
            </div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.25em]">System Monitor v1.2.0</p>
          </div>
          <div className="flex gap-6">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">CPU Load</span>
                <span className="text-2xl font-black font-mono text-os-primary">{systemMetrics.cpu}%</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Memory</span>
                <span className="text-2xl font-black font-mono text-os-secondary">{systemMetrics.ram}GB</span>
             </div>
          </div>
        </div>
      </div>

      {/* Process List */}
      <div className="flex-grow overflow-auto scrollbar-os">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#050505] z-10 border-b border-white/5">
            <tr className="text-[10px] font-black text-white/20 uppercase tracking-widest">
              <th className="px-8 py-4">Process Name</th>
              <th className="px-4 py-4 text-center">CPU</th>
              <th className="px-4 py-4 text-center">RAM</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* System Processes */}
            {systemProcesses.map((p) => (
              <tr key={p.id} className="border-b border-white/[0.02] bg-white/[0.01]">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl bg-white/5 ${p.color}`}>
                      <p.icon size={16} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-sm font-bold text-white/60 italic">{p.name}</span>
                       <span className="text-[9px] font-black text-white/10 uppercase tracking-widest">SYSTEM</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center font-mono text-xs text-os-primary/50">{(p.cpu + Math.random() * 0.5).toFixed(1)}%</td>
                <td className="px-4 py-4 text-center font-mono text-xs text-os-secondary/50">{p.ram} GB</td>
                <td className="px-8 py-4 text-right">
                  <button 
                    onClick={() => ['kernel', 'window-server', 'system-ui'].includes(p.id) ? triggerBSOD() : null}
                    className="text-[9px] font-black text-white/10 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    KILL
                  </button>
                </td>
              </tr>
            ))}

            {/* User Processes */}
            <AnimatePresence mode="popLayout">
              {openWindows.map((appId) => {
                const meta = appMeta[appId] || { name: appId, icon: Activity, color: 'text-white' };
                // Scale process CPU by global load
                const cpuBase = appId === 'benchmark' && systemMetrics.isOverridden ? 80 : 2;
                const cpu = (Math.random() * 5 + cpuBase).toFixed(1);
                const ram = (Math.random() * 0.5 + 0.5).toFixed(1);

                return (
                  <motion.tr
                    key={appId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl bg-white/5 ${meta.color}`}>
                          <meta.icon size={18} />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-white/80">{meta.name}</span>
                           <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">PID: {Math.floor(Math.random() * 9000) + 1000}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center font-mono text-xs text-os-primary">{cpu}%</td>
                    <td className="px-4 py-5 text-center font-mono text-xs text-os-secondary">{ram} GB</td>
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => closeWindow(appId)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {openWindows.length === 0 && (
              <tr>
                <td colSpan="4" className="px-8 py-20 text-center">
                   <div className="flex flex-col items-center gap-4 opacity-20">
                      <Cpu size={64} strokeWidth={1} />
                      <p className="text-sm font-bold uppercase tracking-widest">No Active User Processes</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer System Stats Bar */}
      <div className="px-8 py-4 bg-black/40 border-t border-white/5 flex justify-between items-center">
         <div className="flex gap-6">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Status: Healthy</span>
            </div>
            <div className="flex items-center gap-2">
               <HardDrive size={14} className="text-white/20" />
               <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Storage: 42% Free</span>
            </div>
         </div>
         <div className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em]">Kernel v6.8.0 Premium</div>
      </div>
    </div>
  );
};

export default TaskManager;
