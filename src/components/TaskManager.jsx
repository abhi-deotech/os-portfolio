import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X, Shield, Cpu, Zap, HardDrive } from 'lucide-react';
import useOSStore from '../store/osStore';
import { APP_BY_ID } from '../config/apps';
import AppIcon from './common/AppIcon';


/**
 * Process rows used to carry their own colour map (`text-purple-400` for Music, `text-cyan-400` for
 * Notepad) invented here and agreeing with nothing: Music is violet in the dock and Notepad amber.
 * A task manager that recolours the app you are trying to find defeats its own purpose, so identity
 * now comes from the app record and `AppIcon` renders it under the active icon theme. Only the
 * process NAME is local — "Terminal (zsh)" is task-manager voice, not the dock label.
 */
const PROCESS_NAMES = {
  terminal: 'Terminal (zsh)',
  settings: 'Settings Hub',
  music: 'Music Player',
  benchmark: 'Stress Test Tool',
  notepad: 'Notepad Text Editor',
  files: 'File Explorer',
  browser: 'Flow-Net Browser',
  aichat: 'Lumina Neural Link',
};

const TaskManager = () => {
  const openWindows = useOSStore(state => state.openWindows);
  const closeWindow = useOSStore(state => state.closeWindow);
  const unlockAchievement = useOSStore(state => state.unlockAchievement);
  const systemMetrics = useOSStore(state => state.systemMetrics);
  const triggerBSOD = useOSStore(state => state.triggerBSOD);

  useEffect(() => {
    unlockAchievement('monitor');
    unlockAchievement('system_pro');
  }, [unlockAchievement]);

  // Kernel-level rows are infrastructure, not apps: they get no identity colour, which is also what
  // separates them from the user processes below at a glance.
  const systemProcesses = [
    { id: 'kernel', name: 'Lumina Kernel', icon: Cpu, cpu: 1.2, ram: 0.8 },
    { id: 'window-server', name: 'Window Server', icon: Activity, cpu: 2.4, ram: 1.2 },
    { id: 'system-ui', name: 'System UI Shell', icon: Shield, cpu: 0.8, ram: 0.5 },
    { id: 'network-mgr', name: 'Network Manager', icon: Zap, cpu: 0.2, ram: 0.2 },
    { id: 'audio-daemon', name: 'Audio Daemon', icon: HardDrive, cpu: 0.1, ram: 0.1 },
  ];

  // Stable random variations for system processes
  const [systemMetricsVariations] = useState(() => 
    systemProcesses.map(() => Math.random() * 0.5)
  );

  // Stable random variations for user processes
  const [userProcessMetrics] = useState(() => {
    const metrics = {};
    Object.keys(PROCESS_NAMES).forEach(appId => {
      metrics[appId] = {
        cpuVar: Math.random() * 5,
        ramVar: Math.random() * 0.5 + 0.5,
        pid: Math.floor(Math.random() * 9000) + 1000
      };
    });
    return metrics;
  });

  return (
    <div className="flex flex-col h-full bg-sdl-plane text-sdl-ink font-sans overflow-hidden">
      {/* Header */}
      <div className="px-8 py-8 border-b border-hairline/5 bg-gradient-to-br from-os-primary/5 to-transparent">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-os-primary">
              <Activity size={28} />
              <h1 className="text-3xl font-black tracking-tight uppercase italic">Task Manager</h1>
            </div>
            <p className="text-sdl-sec text-[10px] font-bold uppercase tracking-[0.25em]">System Monitor v1.2.0</p>
          </div>
          <div className="flex gap-6">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-sdl-sec uppercase tracking-widest">CPU Load</span>
                <span className="text-2xl font-black font-mono text-os-primary">{systemMetrics.cpu}%</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-sdl-sec uppercase tracking-widest">Memory</span>
                <span className="text-2xl font-black font-mono text-os-secondary">{systemMetrics.ram}GB</span>
             </div>
          </div>
        </div>
      </div>

      {/* Process List */}
      <div className="flex-grow overflow-auto scrollbar-os">
        <table className="w-full text-left border-collapse">
          {/* Opaque, and the same tone as the app root — the header sits over scrolling rows. */}
          <thead className="sticky top-0 bg-sdl-plane z-10 border-b border-hairline/5">
            <tr className="text-[10px] font-black text-sdl-sec uppercase tracking-widest">
              <th className="px-8 py-4">Process Name</th>
              <th className="px-4 py-4 text-center">CPU</th>
              <th className="px-4 py-4 text-center">RAM</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* System Processes */}
            {systemProcesses.map((p, idx) => (
              <tr key={p.id} className="border-b border-hairline/[0.02] bg-veil/[0.01]">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-veil/5 text-sdl-sec">
                      <p.icon size={16} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-sm font-bold text-sdl-sec italic">{p.name}</span>
                       <span className="text-[9px] font-black text-sdl-sec uppercase tracking-widest">SYSTEM</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center font-mono text-xs text-os-primary/50">{(p.cpu + systemMetricsVariations[idx]).toFixed(1)}%</td>
                <td className="px-4 py-4 text-center font-mono text-xs text-os-secondary/50">{p.ram} GB</td>
                <td className="px-8 py-4 text-right">
                  <button
                    onClick={() => ['kernel', 'window-server', 'system-ui'].includes(p.id) ? triggerBSOD() : null}
                    aria-label={`Kill ${p.name}`}
                    className="text-[9px] font-black text-sdl-sec hover:text-sdl-alert uppercase tracking-widest transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                  >
                    KILL
                  </button>
                </td>
              </tr>
            ))}

            {/* User Processes */}
            <AnimatePresence mode="popLayout">
              {openWindows.map((appId) => {
                const app = APP_BY_ID[appId];
                const name = PROCESS_NAMES[appId] || appId;
                const metrics = userProcessMetrics[appId] || { cpuVar: 1, ramVar: 0.5, pid: 1234 };
                // Scale process CPU by global load
                const cpuBase = appId === 'benchmark' && systemMetrics.isOverridden ? 80 : 2;
                const cpu = (metrics.cpuVar + cpuBase).toFixed(1);
                const ram = metrics.ramVar.toFixed(1);

                return (
                  <motion.tr
                    key={appId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="border-b border-hairline/[0.02] hover:bg-veil/[0.03] transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-veil/5 text-sdl-sec">
                          {app ? <AppIcon app={app} size={18} animate={false} /> : <Activity size={18} />}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-sdl-ink/80">{name}</span>
                           <span className="text-[9px] font-black text-sdl-sec uppercase tracking-widest">PID: {metrics.pid}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center font-mono text-xs text-os-primary">{cpu}%</td>
                    <td className="px-4 py-5 text-center font-mono text-xs text-os-secondary">{ram} GB</td>
                    <td className="px-8 py-5 text-right">
                      {/* Stays a tint on hover rather than a solid alert fill: `onAccent` is computed
                          against the ACCENT, so it is not guaranteed to read on alert. */}
                      <button
                        onClick={() => closeWindow(appId)}
                        aria-label={`End ${name}`}
                        className="p-2 rounded-lg bg-sdl-alert/10 text-sdl-alert opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all hover:bg-sdl-alert/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
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
      {/* A recessed strip, not an overlay: `bg-black/40` would have to invert to stay recessed on the
          ten light colorways, and `veil` inverts the wrong way (it LIFTS in dark). */}
      <div className="px-8 py-4 bg-sdl-sunken border-t border-hairline/5 flex justify-between items-center">
         <div className="flex gap-6">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-sdl-done animate-pulse" />
               <span className="text-[10px] font-bold text-sdl-sec uppercase tracking-widest">Status: Healthy</span>
            </div>
            <div className="flex items-center gap-2">
               <HardDrive size={14} className="text-sdl-sec" />
               <span className="text-[10px] font-bold text-sdl-sec uppercase tracking-widest">Storage: 42% Free</span>
            </div>
         </div>
         <div className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.4em]">Kernel v6.8.0 Premium</div>
      </div>
    </div>
  );
};

export default TaskManager;
