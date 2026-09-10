import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, File, Command, X, ArrowRight } from 'lucide-react';
import useOSStore from '../store/osStore';
import { GAMES, isGameId } from '../config/games';
import { APPS } from '../config/apps';

// Both halves derive from their registries. The app half used to be a hand-maintained list of
// nine — ten apps, Flow-Net among them, were simply unsearchable, the same drift the games half
// already fixed for "snake". Apps that are ALSO game registry entries (retroarcade) are searched
// as their game identity only, so one id never yields two rows sharing a React key. Terminal's
// mark is `mono`, not a glyph component; Command stands in for it.
const APP_ENTRIES = APPS.filter((a) => !isGameId(a.id)).map((a) => ({
  id: a.id,
  name: a.title,
  type: 'app',
  icon: a.glyph ?? Command,
  quick: Boolean(a.pinned || a.featured),
}));

const SPOTLIGHT_APPS = [
  ...APP_ENTRIES,
  ...GAMES.map((g) => ({ id: g.id, name: g.title, type: 'game', icon: g.icon })),
];

// The empty-query grid is a shortcut row, not a directory — all ~30 registry entries there would
// bury the handful a visitor actually reaches for. Search still spans everything above.
const QUICK_APPS = APP_ENTRIES.filter((entry) => entry.quick);

const Spotlight = () => {
  // Field-by-field, not `useOSStore()`. This component is mounted for the whole session, so a
  // whole-store subscription re-rendered it on every state change anywhere in the OS — including
  // the metrics widget's 3-second tick and every file operation.
  const isSpotlightOpen = useOSStore((s) => s.isSpotlightOpen);
  const toggleSpotlight = useOSStore((s) => s.toggleSpotlight);
  const fileSystem = useOSStore((s) => s.fileSystem);
  const openWindow = useOSStore((s) => s.openWindow);
  const openNotepad = useOSStore((s) => s.openNotepad);
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);
  const transparencyEffects = useOSStore((s) => s.transparencyEffects);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (query.length > 0) unlockAchievement('search_pro');
  }, [query, unlockAchievement]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);


  useEffect(() => {
    if (isSpotlightOpen) {
      inputRef.current?.focus();
    }
  }, [isSpotlightOpen]);

  const [prevIsSpotlightOpen, setPrevIsSpotlightOpen] = useState(isSpotlightOpen);
  if (isSpotlightOpen && !prevIsSpotlightOpen) {
    setPrevIsSpotlightOpen(isSpotlightOpen);
    setQuery('');
  }

  const results = useMemo(() => {
    if (!query) return [];

    const searchFileSystem = (nodes, path = '') => {
      let found = [];
      nodes.forEach(node => {
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
          found.push({ ...node, path: path + node.name });
        }
        if (node.children) {
          found = [...found, ...searchFileSystem(node.children, path + node.name + '/')];
        }
      });
      return found;
    };

    const fileResults = searchFileSystem(fileSystem).map(f => ({
      ...f,
      type: 'file',
      icon: File
    }));

    const appResults = SPOTLIGHT_APPS.filter(a => 
      a.name.toLowerCase().includes(query.toLowerCase())
    );

    return [...appResults, ...fileResults].slice(0, 8);
  }, [query, fileSystem]);

  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % results.length);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      e.preventDefault();
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      toggleSpotlight(false);
    }
  };

  const handleSelect = (result) => {
    if (result.type === 'app') {
      openWindow(result.id);
    } else if (result.type === 'game') {
      openWindow(result.id);
      unlockAchievement('gamer');
    } else if (result.type === 'file') {
      if (result.type === 'pdf') {
         // handle PDF opening if relevant, but for now we'll stick to notepad/text
         openWindow('terminal'); // fallback
      } else {
         openNotepad(result.id);
      }
    }
    toggleSpotlight(false);
  };

  return (
    <AnimatePresence>
      {isSpotlightOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => toggleSpotlight(false)}
            className={`fixed inset-0 bg-scrim ${transparencyEffects ? 'backdrop-blur-sm' : ''} z-[1000]`}
          />

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={`fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-os-surfaceContainerLow/90 ${transparencyEffects ? 'backdrop-blur-2xl' : ''} rounded-3xl border border-hairline/10 shadow-[var(--sdl-lift)] z-[1001] overflow-hidden`}
          >
            <div className="flex items-center px-6 py-5 gap-4 border-b border-hairline/5">
              <Search className="text-os-primary" size={24} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search files, apps, and commands..."
                className="flex-grow bg-transparent text-xl font-medium text-sdl-ink placeholder:text-sdl-sec rounded-lg outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-veil/5 border border-hairline/5 text-[10px] font-bold text-sdl-sec uppercase tracking-widest">
                ESC
              </div>
            </div>

            <div className="max-h-[400px] overflow-auto py-2 scrollbar-os">
              {results.length > 0 ? (
                results.map((result, index) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-6 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-os-primary/50 ${
                      selectedIndex === index ? 'bg-os-primary/10' : 'hover:bg-veil/5'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${selectedIndex === index ? 'bg-os-primary/20 text-os-primary' : 'bg-veil/5 text-sdl-sec'}`}>
                        <result.icon size={20} />
                      </div>
                      <div className="text-left">
                        <div className={`font-bold ${selectedIndex === index ? 'text-sdl-ink' : 'text-sdl-sec'}`}>
                          {result.name}
                        </div>
                        {result.path && (
                          <div className="text-[10px] uppercase tracking-wider text-sdl-sec font-black">
                            {result.path}
                          </div>
                        )}
                        {result.type === 'app' && (
                          <div className="text-[10px] uppercase tracking-wider text-os-primary/60 font-black">
                            System Application
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedIndex === index && (
                      <ArrowRight size={18} className="text-os-primary animate-pulse" />
                    )}
                  </button>
                ))
              ) : query ? (
                <div className="flex flex-col items-center justify-center py-12 text-sdl-sec">
                   <X size={48} strokeWidth={1} className="mb-4" />
                   <p className="text-sm font-bold uppercase tracking-widest">No results for &quot;{query}&quot;</p>
                </div>
              ) : (
                <div className="px-8 py-6">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sdl-sec mb-4">Quick Shortcuts</p>
                   <div className="grid grid-cols-2 gap-3">
                      {QUICK_APPS.map(app => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => handleSelect(app)}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-veil/5 border border-hairline/5 hover:border-os-primary/30 hover:bg-os-primary/5 transition-all group outline-none"
                        >
                           <app.icon size={18} className="text-sdl-sec group-hover:text-os-primary" />
                           <span className="text-xs font-bold text-sdl-sec group-hover:text-sdl-ink">{app.name}</span>
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-veil/5 flex justify-between items-center border-t border-hairline/5">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 border border-hairline/10 rounded px-1.5 py-0.5">
                     <div className="text-[8px] font-black text-sdl-sec uppercase">↑↓</div>
                     <span className="text-[9px] font-bold text-sdl-sec uppercase tracking-widest">Navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5 border border-hairline/10 rounded px-1.5 py-0.5">
                     <div className="text-[8px] font-black text-sdl-sec uppercase">↵</div>
                     <span className="text-[9px] font-bold text-sdl-sec uppercase tracking-widest">Open</span>
                  </div>
               </div>
               <div className="text-[9px] font-black text-sdl-sec uppercase tracking-[0.2em]">Lumina Spotlight v1.0</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Spotlight;
