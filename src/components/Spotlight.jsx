import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, File, AppWindow, Command, X, ArrowRight } from 'lucide-react';
import useOSStore from '../store/osStore';

const Spotlight = () => {
  const { isSpotlightOpen, toggleSpotlight, fileSystem, openWindow, openNotepad, unlockAchievement, transparencyEffects } = useOSStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (query.length > 0) unlockAchievement('search_pro');
  }, [query, unlockAchievement]);
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Define "Apps" available via Spotlight
  const apps = [
    { id: 'terminal', name: 'Terminal', type: 'app', icon: Command },
    { id: 'settings', name: 'Settings', type: 'app', icon: AppWindow },
    { id: 'music', name: 'Music', type: 'app', icon: AppWindow },
    { id: 'benchmark', name: 'Benchmark', type: 'app', icon: AppWindow },
    { id: 'mail', name: 'Mail', type: 'app', icon: AppWindow },
    { id: 'chat', name: 'Guestbook', type: 'app', icon: AppWindow },
    { id: 'files', name: 'File Explorer', type: 'app', icon: AppWindow },
    { id: 'notepad', name: 'Notepad', type: 'app', icon: AppWindow },
  ];

  useEffect(() => {
    if (isSpotlightOpen) {
      inputRef.current?.focus();
      setQuery('');
    }
  }, [isSpotlightOpen]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

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

    const appResults = apps.filter(a => 
      a.name.toLowerCase().includes(query.toLowerCase())
    );

    setResults([...appResults, ...fileResults].slice(0, 8));
    setSelectedIndex(0);
  }, [query, fileSystem]);

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
            className={`fixed inset-0 bg-black/40 ${transparencyEffects ? 'backdrop-blur-sm' : ''} z-[1000]`}
          />

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={`fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-os-surfaceContainerLow/90 ${transparencyEffects ? 'backdrop-blur-2xl' : ''} rounded-3xl border border-white/10 shadow-2xl z-[1001] overflow-hidden`}
          >
            <div className="flex items-center px-6 py-5 gap-4 border-b border-white/5">
              <Search className="text-os-primary" size={24} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search files, apps, and commands..."
                className="flex-grow bg-transparent text-xl font-medium outline-none text-white placeholder:text-white/20"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                ESC
              </div>
            </div>

            <div className="max-h-[400px] overflow-auto py-2 scrollbar-os">
              {results.length > 0 ? (
                results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${
                      selectedIndex === index ? 'bg-os-primary/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${selectedIndex === index ? 'bg-os-primary/20 text-os-primary' : 'bg-white/5 text-white/40'}`}>
                        <result.icon size={20} />
                      </div>
                      <div className="text-left">
                        <div className={`font-bold ${selectedIndex === index ? 'text-white' : 'text-white/60'}`}>
                          {result.name}
                        </div>
                        {result.path && (
                          <div className="text-[10px] uppercase tracking-wider text-white/20 font-black">
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
                <div className="flex flex-col items-center justify-center py-12 text-white/20">
                   <X size={48} strokeWidth={1} className="mb-4" />
                   <p className="text-sm font-bold uppercase tracking-widest">No results for "{query}"</p>
                </div>
              ) : (
                <div className="px-8 py-6">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4">Quick Shortcuts</p>
                   <div className="grid grid-cols-2 gap-3">
                      {apps.map(app => (
                        <button 
                          key={app.id}
                          onClick={() => handleSelect(app)}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-os-primary/30 hover:bg-os-primary/5 transition-all group"
                        >
                           <app.icon size={18} className="text-white/40 group-hover:text-os-primary" />
                           <span className="text-xs font-bold text-white/60 group-hover:text-white">{app.name}</span>
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-black/20 flex justify-between items-center border-t border-white/5">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 border border-white/10 rounded px-1.5 py-0.5">
                     <div className="text-[8px] font-black text-white/40 uppercase">↑↓</div>
                     <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5 border border-white/10 rounded px-1.5 py-0.5">
                     <div className="text-[8px] font-black text-white/40 uppercase">↵</div>
                     <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Open</span>
                  </div>
               </div>
               <div className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">Lumina Spotlight v1.0</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Spotlight;
