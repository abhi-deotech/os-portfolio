import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, X, Shield, Cpu, HardDrive } from 'lucide-react';
import useOSStore from '../store/osStore';
import { APP_BY_ID } from '../config/apps';
import { GAMES } from '../config/games';
import AppIcon from './common/AppIcon';
import { StatusChip } from './common/StatusChip';
import { FactValue, PressureValue } from './common/FactValue';
import useMinuteClock from '../hooks/useMinuteClock';
import useNetworkInfo from '../hooks/useNetworkInfo';
import { useSystemFact } from '../hooks/useSystemFacts';
import { describeBrowser } from '../capabilities/browser.js';
import { fmt } from '../system/facts.js';

const SNAP_LABEL = { left: 'snapped left', right: 'snapped right' };


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
  // No game was listed, so a running Snake showed up as the bare window id. Registered games
  // name themselves; the "(game)" suffix is task-manager voice, matching "Terminal (zsh)".
  ...Object.fromEntries(GAMES.map((g) => [g.id, `${g.title} (game)`])),
};

const TaskManager = () => {
  const openWindows = useOSStore(state => state.openWindows);
  const closeWindow = useOSStore(state => state.closeWindow);
  const unlockAchievement = useOSStore(state => state.unlockAchievement);
  const triggerBSOD = useOSStore(state => state.triggerBSOD);
  const activeWindow = useOSStore(state => state.activeWindow);
  const minimizedWindows = useOSStore(state => state.minimizedWindows);
  const maximizedWindows = useOSStore(state => state.maximizedWindows);
  const snappedWindows = useOSStore(state => state.snappedWindows);
  const poppedOut = useOSStore(state => state.poppedOut);
  const windowOpenedAt = useOSStore(state => state.windowOpenedAt);
  const now = useMinuteClock().getTime();
  const network = useNetworkInfo();
  const pressure = useSystemFact('pressure');
  const storage = useSystemFact('storage');
  const jsHeap = useSystemFact('jsHeap');
  const browser = describeBrowser();

  useEffect(() => {
    unlockAchievement('monitor');
    unlockAchievement('system_pro');
  }, [unlockAchievement]);

  // Kernel-level rows are infrastructure, not apps: they get no identity colour, which is also what
  // separates them from the user processes below at a glance. No numbers: a web page cannot see what
  // these cost, so nothing is shown rather than something invented.
  const systemProcesses = [
    { id: 'kernel', name: 'Lumina Kernel', icon: Cpu },
    { id: 'window-server', name: 'Window Server', icon: Activity },
    { id: 'system-ui', name: 'System UI Shell', icon: Shield },
  ];

  // The State chip, from the store: what the window is doing, in words.
  const stateLabel = (id) => {
    const base = activeWindow === id ? 'Active' : minimizedWindows.includes(id) ? 'Minimized' : 'Background';
    const extras = [];
    if (maximizedWindows.includes(id)) extras.push('maximized');
    if (snappedWindows?.[id]) extras.push(SNAP_LABEL[snappedWindows[id]] ?? 'snapped');
    if (poppedOut?.[id]) extras.push('popped out');
    return [base, ...extras].join(' · ');
  };

  return (
    <div className="flex flex-col h-full bg-sdl-plane text-sdl-ink font-sans overflow-hidden">
      {/* Header */}
      <div className="px-8 py-8 border-b border-hairline/5 bg-gradient-to-br from-os-primary/5 to-transparent">
        <div className="flex flex-wrap justify-between items-start gap-x-6 gap-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-os-primary">
              <Activity size={28} />
              <h1 className="text-3xl font-black tracking-tight uppercase italic">Task Manager</h1>
            </div>
            <p className="text-sdl-sec text-[10px] font-bold uppercase tracking-[0.25em]">System Monitor v1.2.0</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
             <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-black text-sdl-sec uppercase tracking-widest">CPU Pressure</span>
                <PressureValue fact={pressure} className="text-xs" />
             </div>
             <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-black text-sdl-sec uppercase tracking-widest">Site Storage</span>
                {storage.source === 'reported'
                  ? <span className="text-2xl font-black font-mono text-os-primary" title={storage.text}>{fmt.bytes(storage.value.usage)}</span>
                  : <FactValue fact={storage} className="text-xs" />}
             </div>
             <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-black text-sdl-sec uppercase tracking-widest">JS Heap</span>
                {jsHeap.source === 'reported'
                  ? <span className="text-2xl font-black font-mono text-os-secondary" title={jsHeap.text}>{fmt.bytes(jsHeap.value.used)}</span>
                  : <FactValue fact={jsHeap} className="text-xs" />}
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
              <th className="px-8 py-4">Process</th>
              <th className="px-4 py-4 text-center">State</th>
              <th className="px-4 py-4 text-center">Opened</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* System Processes */}
            {systemProcesses.map((p) => (
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
                <td className="px-4 py-4 text-center"><StatusChip tone="muted" label="Lumina shell" /></td>
                <td className="px-4 py-4 text-center text-xs text-sdl-sec">since page load</td>
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
                const openedAt = windowOpenedAt?.[appId];
                // A window restored after a reload has no timestamp: say so rather than guess.
                const opened = openedAt ? fmt.duration(Math.max(0, now - openedAt)) : 'restored';

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
                           <span className="text-[9px] font-mono text-sdl-sec">{appId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <StatusChip tone={activeWindow === appId ? 'accent' : 'muted'} label={stateLabel(appId)} />
                    </td>
                    <td className="px-4 py-5 text-center text-xs text-sdl-sec tabular-nums">{opened}</td>
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
               <span className="text-[10px] font-bold text-sdl-sec uppercase tracking-widest">{network.isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-2">
               <HardDrive size={14} className="text-sdl-sec" />
               <FactValue fact={storage} className="text-[10px] font-bold" />
            </div>
         </div>
         <div className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em]">
           {openWindows.length} {openWindows.length === 1 ? 'window' : 'windows'} · reported by {browser.name}
         </div>
      </div>
    </div>
  );
};

export default TaskManager;
