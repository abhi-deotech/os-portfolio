import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, History, Bookmark } from 'lucide-react';
import Favicon from './Favicon';
import { RECENT_LIMIT, relativeTime } from './browserCore';

/**
 * The start page — what `lumina://start` renders instead of an iframe. Bookmarks live HERE as a
 * tile grid rather than on a permanent bar under the toolbar: reclaiming that bar's vertical cost
 * from every real page is the revamp's win, and a grid can carry favicons and a remove control
 * that a cramped bar never could.
 *
 * SDL: the plane stays undertoned and the chrome quiet — the only accent voices are the focused
 * search field and hover reveals. Mounted only for the active tab (keyed by tab id in Browser.jsx)
 * so `autoFocus` lands on the visible field and per-tab draft queries don't bleed between tabs.
 */
const StartPage = ({ bookmarks, history, onNavigate, onRemoveBookmark, onClearHistory }) => {
  const [query, setQuery] = useState('');
  const recent = history.slice(0, RECENT_LIMIT);

  const submit = (e) => {
    e.preventDefault();
    if (query.trim()) onNavigate(query);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute inset-0 overflow-y-auto custom-scrollbar"
    >
      <div className="min-h-full flex flex-col items-center px-6 py-10 md:py-16">
        {/* Wordmark — a title may pop in solid accent (SDL law 9); everything else stays quiet. */}
        <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-sdl-ink mb-8 select-none">
          Flow<span className="text-os-primary">-</span>Net
        </h1>

        <form onSubmit={submit} className="w-full max-w-xl mb-12">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-4 text-sdl-sec pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search or enter URL"
              placeholder="Search or enter URL"
              className="w-full bg-sdl-surface border border-hairline/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-sdl-ink placeholder:text-sdl-sec font-medium outline-none transition-all focus:border-os-primary/60 focus:ring-2 focus:ring-os-primary/20"
            />
          </div>
        </form>

        <div className="w-full max-w-2xl space-y-10">
          <section aria-label="Bookmarks">
            <div className="flex items-center gap-2 mb-4">
              <Bookmark size={12} className="text-sdl-sec" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-sdl-sec">Bookmarks</h2>
            </div>
            {bookmarks.length === 0 ? (
              <p className="text-xs text-sdl-sec font-medium">
                Nothing saved yet — the star in the toolbar bookmarks the page you&apos;re on.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {bookmarks.map((bm) => (
                  <div key={bm.url} className="relative group">
                    <button
                      type="button"
                      onClick={() => onNavigate(bm.url)}
                      title={bm.url}
                      className="w-full flex flex-col items-center gap-2.5 px-3 py-4 rounded-2xl bg-sdl-surface border border-hairline/10 hover:border-os-primary/40 hover:bg-veil/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                    >
                      <span className="w-9 h-9 rounded-xl bg-veil/5 border border-hairline/5 flex items-center justify-center">
                        <Favicon url={bm.url} size={16} />
                      </span>
                      <span className="text-[11px] font-bold text-sdl-sec group-hover:text-sdl-ink truncate w-full text-center transition-colors">
                        {bm.title}
                      </span>
                    </button>
                    {/* Hover-revealed, but never hidden from keyboard users: focus reveals it too. */}
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(bm.url)}
                      aria-label={`Remove bookmark ${bm.title}`}
                      className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-sdl-sunken border border-hairline/10 text-sdl-sec opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-sdl-alert transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Recent history">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History size={12} className="text-sdl-sec" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-sdl-sec">Recent</h2>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="text-[10px] font-bold uppercase tracking-widest text-sdl-sec hover:text-sdl-alert transition-colors rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                >
                  Clear history
                </button>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-sdl-sec font-medium">Pages you visit will show up here.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {recent.map((entry) => (
                  <button
                    key={`${entry.url}-${entry.ts}`}
                    type="button"
                    onClick={() => onNavigate(entry.url)}
                    title={entry.url}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-veil/5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                  >
                    <Favicon url={entry.url} size={14} />
                    <span className="text-xs font-bold text-sdl-ink shrink-0">{entry.host}</span>
                    <span className="text-[11px] text-sdl-sec truncate flex-1 font-medium">{entry.url}</span>
                    <span className="text-[10px] text-sdl-sec font-medium shrink-0 tabular-nums">
                      {relativeTime(entry.ts)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </motion.div>
  );
};

export default StartPage;
