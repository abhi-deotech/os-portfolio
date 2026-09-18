import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Sun, Cpu, Database, Activity, 
  Zap, ChevronRight, 
  LayoutDashboard, MessageSquare, Globe,
  ShieldCheck, ArrowUpRight
} from 'lucide-react';
import useOSStore from '../store/osStore';
import SocialWidget from './SocialWidget';
import { FactValue, PressureValue } from './common/FactValue';
import SessionUptime from './common/SessionUptime';
import { useSystemFact } from '../hooks/useSystemFacts';
import useNetworkInfo from '../hooks/useNetworkInfo';
import { describeBrowser } from '../capabilities/browser.js';
import { fmt } from '../system/facts.js';

/**
 * The Health tab's facts, each reported by the browser or labelled as not exposed. Its own component
 * so these subscriptions (and the network listeners) exist only while the tab is open.
 */
const ReportedFacts = () => {
  const jsHeap = useSystemFact('jsHeap');
  const deviceMemory = useSystemFact('deviceMemory');
  const storage = useSystemFact('storage');
  const network = useNetworkInfo();
  const usageDetails = storage.source === 'reported' ? storage.detail?.usageDetails : undefined;
  const hasEstimate = network.effectiveType !== 'unknown' && network.downlink > 0;

  return (
    <div className="grid grid-cols-2 gap-3">
       <div className="p-4 rounded-2xl bg-veil/[0.03] border border-hairline/5 space-y-2">
          <span className="text-[9px] font-bold text-sdl-sec uppercase tracking-widest">Session uptime</span>
          <p className="text-sm font-black text-sdl-ink"><SessionUptime captionClassName="block text-[10px] font-bold text-sdl-sec" /></p>
       </div>
       <div className="p-4 rounded-2xl bg-veil/[0.03] border border-hairline/5 space-y-2">
          <span className="text-[9px] font-bold text-sdl-sec uppercase tracking-widest">JS heap</span>
          <p className="text-sm font-black"><FactValue fact={jsHeap} /></p>
       </div>
       <div className="p-4 rounded-2xl bg-veil/[0.03] border border-hairline/5 space-y-2">
          <span className="text-[9px] font-bold text-sdl-sec uppercase tracking-widest">Device memory class</span>
          <p className="text-sm font-black"><FactValue fact={deviceMemory} /></p>
       </div>
       <div className="p-4 rounded-2xl bg-veil/[0.03] border border-hairline/5 space-y-2">
          <span className="text-[9px] font-bold text-sdl-sec uppercase tracking-widest">Network</span>
          <p className="text-sm font-black text-sdl-ink">{fmt.networkText(network)}</p>
          {hasEstimate && (
            <p className="text-[10px] font-bold text-sdl-sec tabular-nums">~{network.downlink} Mbps · ~{network.rtt} ms estimate</p>
          )}
       </div>
       <div className="col-span-2 p-4 rounded-2xl bg-veil/[0.03] border border-hairline/5 space-y-2">
          <span className="text-[9px] font-bold text-sdl-sec uppercase tracking-widest">Site storage</span>
          <p className="text-sm font-black"><FactValue fact={storage} /></p>
          {usageDetails && Object.keys(usageDetails).length > 0 && (
            <p className="text-[10px] font-bold text-sdl-sec tabular-nums">
              {Object.entries(usageDetails).map(([k, v]) => `${k} ${fmt.bytes(v)}`).join(' · ')}
            </p>
          )}
       </div>
    </div>
  );
};

const SystemDashboard = () => {
  const transparencyEffects = useOSStore((s) => s.transparencyEffects);
  const pressure = useSystemFact('pressure');
  const storage = useSystemFact('storage');
  const storagePct = storage.source === 'reported' ? storage.detail.percent : 0;
  const browser = describeBrowser();
  const [activeTab, setActiveTab] = useState('social'); // 'social', 'system', 'network'


  return (
    /* max-h caps the panel against the viewport. Without it this widget measured 1097px tall in a
       900px viewport from its default y=40 — 237px of it, ending in the middle of Recent Pulses,
       rendered below the fold with no way to reach it (the Widgets layer is `overflow-hidden`, so
       it was clipped rather than scrolled). The 11rem subtracts the widget's own top inset plus the
       dock's footprint. The tab body below scrolls instead. */
    <div className={`w-[420px] max-h-[calc(100vh-11rem)] bg-sdl-surface/90 ${transparencyEffects ? 'backdrop-blur-xl' : ''} rounded-[2.5rem] border border-hairline/10 shadow-lift-window overflow-hidden flex flex-col select-none`}>
      {/* 1. Mini Metrics Bar (Now the header).
          The header/tab/footer strips stay TRANSLUCENT veils rather than an opaque `sunken` fill —
          the panel is backdrop-blurred glass, and a solid band would punch a flat hole through it.
          Their alphas drop (20/40/40 -> 3/5/5) because veil INVERTS polarity: the old black/40 was a
          barely-there darkening over a near-black panel, whereas white/40 over the same panel is a
          mid-grey slab. Matching the file's own veil scale keeps the strips at their original
          weight, and keeps the bar below the active tab's veil/10 so the selection still reads. */}
      <div className="px-6 py-4 flex gap-4 border-b border-hairline/5 bg-veil/[0.03]">
         <div className="flex-1 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-os-secondary/10 text-os-secondary">
               <Cpu size={14} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
               <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-sdl-sec">
                  <span>CPU pressure</span>
               </div>
               <div className="mt-1 text-[10px]">
                  <PressureValue fact={pressure} />
               </div>
            </div>
         </div>
         <div className="w-px h-8 bg-veil/5" />
         <div className="flex-1 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-os-tertiary/10 text-os-tertiary">
               <Database size={14} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
               <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-sdl-sec">
                  <span>Site storage</span>
                  {storage.source === 'reported' && (
                    <span className="text-os-tertiary tabular-nums">{fmt.bytes(storage.value.usage)}</span>
                  )}
               </div>
               {storage.source === 'reported' ? (
                 <div className="h-1 bg-veil/5 rounded-full mt-1 overflow-hidden" title={storage.text}>
                    <div className="h-full bg-os-tertiary transition-[width] duration-pane ease-sdl" style={{ width: `${storagePct}%` }} />
                 </div>
               ) : (
                 <FactValue fact={storage} className="mt-1 text-[10px]" />
               )}
            </div>
         </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex p-2 gap-1 bg-veil/5 border-b border-hairline/5">
         {[
           { id: 'social', icon: Globe, label: 'Feed' },
           { id: 'system', icon: ShieldCheck, label: 'Health' },
           { id: 'shortcuts', icon: LayoutDashboard, label: 'Nodes' }
         ].map(tab => (
           <button
             key={tab.id}
             type="button"
             aria-pressed={activeTab === tab.id}
             onClick={() => setActiveTab(tab.id)}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50 ${activeTab === tab.id ? 'bg-veil/10 text-sdl-ink shadow-inner' : 'text-sdl-sec hover:bg-veil/5 hover:text-sdl-sec'}`}
           >
             <tab.icon size={14} />
             <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
           </button>
         ))}
      </div>

      {/* 4. Tab Content Area */}
      {/* Scrolls rather than clips. `min-h-[340px]` is a floor, not a fixed height, so the flex
          item shrinks to whatever the capped panel leaves and the overflow becomes reachable. */}
      <div className="flex-grow min-h-[340px] relative overflow-y-auto overflow-x-hidden flex flex-col">
         <AnimatePresence mode="wait">
            {activeTab === 'social' && (
              <motion.div 
                key="social"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="min-h-full flex flex-col p-4"
              >
                {/* `min-h-full`, not `h-full`: it still fills a short panel, but is allowed to grow
                    past it so the scroll container above has something to scroll. */}
                <div className="flex-grow">
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
                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-sdl-sec px-1">Reported by {browser.name}</h4>
                   <ReportedFacts />
                </div>

                <div className="mt-auto pt-4 flex justify-center">
                   <button
                    type="button"
                    onClick={() => useOSStore.getState().openWindow('taskmanager')}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-os-primary hover:text-sdl-ink transition-colors group rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
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
                    type="button"
                    onClick={() => useOSStore.getState().openWindow(node.id)}
                    className="p-4 rounded-2xl bg-veil/[0.03] border border-hairline/5 hover:bg-os-primary/10 hover:border-os-primary/30 transition-all text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                  >
                    <span className="block text-xs font-black text-sdl-ink group-hover:text-os-primary">{node.name}</span>
                    <span className="block text-[9px] font-bold text-sdl-sec uppercase tracking-widest mt-1">{node.desc}</span>
                  </button>
                ))}
              </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* 5. Footer Signature */}
      <div className="p-4 border-t border-hairline/5 bg-veil/5 flex justify-between items-center text-[8px] font-black text-sdl-sec uppercase tracking-[0.3em]">
         <span>System Authority: Vibe-OS</span>
         <span>Signed: 0xAbhi</span>
      </div>
    </div>
  );
};

export default SystemDashboard;
