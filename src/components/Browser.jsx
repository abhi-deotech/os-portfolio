import React, { useState, useEffect } from 'react';
import { Globe, ArrowLeft, ArrowRight, RotateCw, ExternalLink, Bookmark, ShieldAlert, Lock, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Browser = () => {
  const [url, setUrl] = useState('https://github.com/abhi-deotech');
  const [iframeUrl, setIframeUrl] = useState('https://github.com/abhi-deotech');
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const blockedDomains = [
    'github.com', 
    'linkedin.com', 
    'twitter.com', 
    'x.com', 
    'facebook.com', 
    'instagram.com', 
    'netflix.com', 
    'google.com/search'
  ];

  const bookmarks = [
    { title: 'GitHub Portfolio', url: 'https://github.com/abhi-deotech' },
    { title: 'LinkedIn', url: 'https://linkedin.com/in/abhimanyu-saxena-b656a4183' },
    { title: 'Personal Website', url: 'https://abhimanyu.dev' },
  ];

  const checkBlocked = (targetUrl) => {
    return blockedDomains.some(domain => targetUrl.toLowerCase().includes(domain.toLowerCase()));
  };

  useEffect(() => {
    setIsBlocked(checkBlocked(iframeUrl));
  }, [iframeUrl]);

  const handleGo = (e) => {
    if (e) e.preventDefault();
    let targetUrl = url.trim();
    if (!targetUrl) return;
    
    if (!targetUrl.startsWith('http')) {
      if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
        targetUrl = 'https://' + targetUrl;
      } else {
        targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(targetUrl) + '&igu=1';
      }
    }
    
    setIframeUrl(targetUrl);
    setUrl(targetUrl);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const openExternal = () => {
    window.open(iframeUrl, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* Browser Ribbon */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#121212] border-b border-white/5 relative z-20">
        <div className="flex gap-1.5">
           <button className="p-2 hover:bg-white/5 rounded-xl text-white/40 transition-colors"><ArrowLeft size={16} /></button>
           <button className="p-2 hover:bg-white/5 rounded-xl text-white/40 transition-colors"><ArrowRight size={16} /></button>
           <button 
             onClick={() => {
               const current = iframeUrl;
               setIframeUrl('');
               setTimeout(() => setIframeUrl(current), 10);
               setIsLoading(true);
               setTimeout(() => setIsLoading(false), 1000);
             }} 
             className={`p-2 hover:bg-white/5 rounded-xl transition-all ${isLoading ? 'text-os-primary animate-spin' : 'text-white/60'}`}
           >
             <RotateCw size={16} />
           </button>
        </div>

        <form onSubmit={handleGo} className="flex-grow">
          <div className="relative flex items-center group">
            <div className={`absolute left-3 transition-colors ${isBlocked ? 'text-yellow-500' : 'text-os-primary'}`}>
              {isBlocked ? <Lock size={14} /> : <Globe size={14} />}
            </div>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={(e) => e.target.select()}
              className={`w-full bg-black/40 border ${isBlocked ? 'border-yellow-500/30' : 'border-white/10'} rounded-xl py-2 pl-10 pr-4 text-xs text-white/80 focus:border-os-primary transition-all outline-none focus:bg-black/60 font-medium`}
              placeholder="Search or enter URL"
            />
            {isLoading && (
              <div className="absolute right-3 w-1 h-1 bg-os-primary rounded-full animate-ping" />
            )}
          </div>
        </form>

        <button 
          onClick={openExternal}
          title="Open in new tab"
          className="p-2 bg-os-primary/10 text-os-primary rounded-xl hover:bg-os-primary/20 transition-all active:scale-90"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      {/* Bookmarks Bar */}
      <div className="flex gap-3 px-4 py-2 bg-[#0c0c0c] border-b border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
        {bookmarks.map((bm, i) => (
          <button 
            key={i}
            onClick={() => { setUrl(bm.url); setIframeUrl(bm.url); }}
            className={`flex items-center gap-2 text-[10px] font-bold transition-all whitespace-nowrap px-3 py-1.5 rounded-lg border border-transparent ${iframeUrl === bm.url ? 'bg-os-primary/10 text-os-primary border-os-primary/20' : 'text-white/30 hover:text-white/80 bg-white/5 hover:bg-white/10'}`}
          >
            <Bookmark size={10} className={iframeUrl === bm.url ? 'text-os-primary' : 'text-os-secondary'} />
            {bm.title}
          </button>
        ))}
      </div>

      {/* Main Framework */}
      <div className="flex-grow bg-[#050505] relative overflow-hidden">
        <AnimatePresence mode="wait">
          {isBlocked ? (
            <motion.div 
              key="blocked"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-[#0a0a0a]"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
                <div className="relative w-24 h-24 bg-yellow-500/10 border border-yellow-500/20 rounded-[2rem] flex items-center justify-center shadow-2xl">
                  <ShieldAlert size={48} className="text-yellow-500" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black border border-white/10 rounded-full flex items-center justify-center shadow-lg">
                  <Lock size={14} className="text-yellow-500" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-white mb-4 tracking-tight uppercase">Embedding Restricted</h2>
              <p className="text-white/40 text-sm max-w-md leading-relaxed mb-10 font-medium">
                For security reasons, <span className="text-white/70 italic">{new URL(iframeUrl).hostname}</span> does not allow itself to be displayed inside other applications.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={openExternal}
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-yellow-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl shadow-yellow-500/20 active:scale-95 transition-all hover:bg-yellow-400"
                >
                  <ExternalLink size={16} /> Open externally
                </button>
                <button 
                  onClick={() => { setUrl('https://google.com'); setIframeUrl('https://google.com?igu=1'); }}
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white/60 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 active:scale-95 transition-all"
                >
                   Go Home
                </button>
              </div>

              <div className="mt-12 flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <Info size={14} className="text-os-primary" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Note: This is a browser security policy (X-Frame-Options)</span>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="iframe"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full"
            >
              <iframe 
                title="Browser View"
                src={iframeUrl}
                className="w-full h-full border-none bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Loading Overlay */}
        {isLoading && !isBlocked && (
          <div className="absolute inset-0 bg-[#0a0a0a]/50 backdrop-blur-sm flex items-center justify-center z-0 pointer-events-none">
             <div className="w-10 h-10 border-4 border-os-primary/20 border-t-os-primary rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Browser;
