import React from 'react';
import { Cpu } from 'lucide-react';
import CustomIcon from '../common/CustomIcon';
import { FactValue, PressureValue } from '../common/FactValue';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useSystemFact } from '../../hooks/useSystemFacts';
import { describeBrowser } from '../../capabilities/browser.js';
import { fmt } from '../../system/facts.js';
import ScreenCard from './ScreenCard';

const MB = 1024 * 1024;

/**
 * Settings → System. Moved out of Settings.jsx (was `renderSystem`) so its fact subscriptions and the
 * heap poll run only while this tab is shown. Same cards, same order; every value is either reported
 * by the browser or says that it isn't.
 */
const SystemTab = () => {
  const isMobile = useIsMobile();
  const browser = describeBrowser();
  const cores = useSystemFact('cores');
  const deviceMemory = useSystemFact('deviceMemory');
  const os = useSystemFact('os');
  const arch = useSystemFact('arch');
  const storage = useSystemFact('storage');
  const gpu = useSystemFact('gpu');
  const display = useSystemFact('display');
  const pressure = useSystemFact('pressure');
  const jsHeap = useSystemFact('jsHeap');

  const heapReported = jsHeap.source === 'reported';
  const history = heapReported ? jsHeap.detail.history : [];
  const historyMax = Math.max(1, ...history);

    return (
      <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-2">System</h2>
          <p className="text-os-onSurfaceVariant text-sm">Hardware utilization and OS architecture details.</p>
        </div>

      <ScreenCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <section className="p-6 md:p-8 rounded-[2rem] bg-os-surfaceContainerLow/30 border border-os-outline/10 backdrop-blur-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-full md:w-[400px] h-full bg-gradient-to-l from-sdl-accent/5 to-transparent pointer-events-none" />

                  <div className="flex items-center justify-between mb-8">
                      <div className="flex flex-col">
                        <span className="text-2xl md:text-3xl font-black font-display text-sdl-accent">Lumina OS</span>
                        <span className="text-xs md:text-sm font-semibold text-os-onSurfaceVariant">Version 1.0.0</span>
                      </div>
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-os-primary/20 to-os-secondary/20 border border-os-outline/10 flex items-center justify-center shadow-[0_0_30px_rgb(var(--sdl-accent-rgb)/0.15)]">
                          <CustomIcon icon={Cpu} size={isMobile ? 24 : 28} color="text-os-onSurface" glow="rgb(var(--os-primary-rgb) / 0.3)" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-os-surfaceContainerHighest/50">
                          <span className="block text-xs text-os-onSurfaceVariant mb-1">Runtime</span>
                          <span className="block text-sm font-semibold">{`${browser.name} ${browser.version}`.trim()} · {browser.engine}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-os-surfaceContainerHighest/50">
                          <span className="block text-xs text-os-onSurfaceVariant mb-1">Rendering Engine</span>
                          <span className="block text-sm font-semibold">React + Vite + WebGL</span>
                      </div>
                  </div>
              </section>

              <section className="p-6 rounded-[2rem] bg-os-surfaceContainerLow/30 border border-os-outline/10 backdrop-blur-md">
                 <h3 className="text-lg font-bold mb-6">Device Specifications</h3>
                 <div className="space-y-4">
                     <div className="flex flex-col md:flex-row border-b border-os-outline/5 pb-4 last:border-0 last:pb-0 gap-1 md:gap-0">
                         <div className="w-full md:w-1/3 text-xs md:text-sm text-os-onSurfaceVariant font-medium">Processor</div>
                         <div className="w-full md:w-2/3 text-xs md:text-sm font-semibold"><FactValue fact={cores} /></div>
                     </div>
                     <div className="flex flex-col md:flex-row border-b border-os-outline/5 pb-4 last:border-0 last:pb-0 gap-1 md:gap-0">
                         <div className="w-full md:w-1/3 text-xs md:text-sm text-os-onSurfaceVariant font-medium">Device memory class</div>
                         <div className="w-full md:w-2/3 text-xs md:text-sm font-semibold"><FactValue fact={deviceMemory} /></div>
                     </div>
                     <div className="flex flex-col md:flex-row border-b border-os-outline/5 pb-4 last:border-0 last:pb-0 gap-1 md:gap-0">
                         <div className="w-full md:w-1/3 text-xs md:text-sm text-os-onSurfaceVariant font-medium">System</div>
                         <div className="w-full md:w-2/3 text-xs md:text-sm font-semibold"><FactValue fact={os} /> · <FactValue fact={arch} /></div>
                     </div>
                     <div className="flex flex-col md:flex-row border-b border-os-outline/5 pb-4 last:border-0 last:pb-0 gap-1 md:gap-0">
                         <div className="w-full md:w-1/3 text-xs md:text-sm text-os-onSurfaceVariant font-medium">Site storage</div>
                         <div className="w-full md:w-2/3 text-xs md:text-sm font-semibold"><FactValue fact={storage} /></div>
                     </div>
                     <div className="flex flex-col md:flex-row border-b border-os-outline/5 pb-4 last:border-0 last:pb-0 gap-1 md:gap-0">
                         <div className="w-full md:w-1/3 text-xs md:text-sm text-os-onSurfaceVariant font-medium">GPU</div>
                         <div className="w-full md:w-2/3 text-xs md:text-sm font-semibold break-words"><FactValue fact={gpu} /></div>
                     </div>
                     <div className="flex flex-col md:flex-row border-b border-os-outline/5 pb-4 last:border-0 last:pb-0 gap-1 md:gap-0">
                         <div className="w-full md:w-1/3 text-xs md:text-sm text-os-onSurfaceVariant font-medium">Display</div>
                         <div className="w-full md:w-2/3 text-xs md:text-sm font-semibold"><FactValue fact={display} /></div>
                     </div>
                 </div>
              </section>
          </div>

          <div className="space-y-6">
              <section className="p-6 rounded-[2rem] bg-gradient-to-b from-os-surfaceContainerLow/50 to-os-surfaceContainerLowest/80 border border-os-outline/10 backdrop-blur-xl relative">
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-sdl-accent shadow-[0_0_8px_rgb(var(--sdl-accent-rgb))] animate-pulse" />
                  <h3 className="text-sm font-semibold text-os-onSurfaceVariant mb-4 uppercase tracking-wider">Performance</h3>

                  <div className="mb-4">
                      <div className="flex items-end gap-2 mb-1">
                          <PressureValue fact={pressure} className="text-sm" />
                      </div>
                      <span className="text-xs text-os-onSurfaceVariant font-bold uppercase tracking-widest">CPU Pressure</span>
                  </div>

                  <div className="mb-8">
                      <div className="flex items-end flex-wrap gap-x-1 mb-1">
                          {heapReported ? (
                            <>
                              <span className="text-4xl md:text-5xl font-display font-black tracking-tighter text-os-tertiary leading-none">{Math.round(jsHeap.value.used / MB)}</span>
                              <span className="text-xl font-bold text-os-onSurfaceVariant leading-none pb-0.5">MB</span>
                              <span className="text-sm text-os-onSurfaceVariant/50 font-bold leading-none ml-1 pb-1">/ {fmt.bytes(jsHeap.value.limit)}</span>
                            </>
                          ) : (
                            <FactValue fact={jsHeap} className="text-sm" />
                          )}
                      </div>
                      <span className="text-xs text-os-onSurfaceVariant font-bold uppercase tracking-widest">
                        JS Heap{heapReported ? ` (${jsHeap.detail.percent}%)` : ''}
                      </span>
                  </div>

                  {/* Real heap samples, oldest to newest, each drawn against the largest one. Static
                      heights: a sample is a measurement, not something to tween between. */}
                  <div className="h-24 md:h-32 flex items-end gap-1 mb-4">
                      {heapReported ? history.map((val, i) => (
                            <div
                              key={i}
                              className={`flex-1 rounded-t-sm ${i === history.length - 1 ? 'bg-os-tertiary' : 'bg-os-tertiary/20'}`}
                              style={{ height: `${(val / historyMax) * 100}%` }}
                            />
                      )) : (
                        <FactValue fact={jsHeap} className="text-xs self-center mx-auto" />
                      )}
                  </div>
              </section>
          </div>
      </div>
    </div>
    );
};

export default SystemTab;
