import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Globe, ArrowLeft, ArrowRight, RotateCw, ExternalLink, Star, Plus, X, Lock,
  Search, ShieldAlert, Compass,
} from 'lucide-react';
import useOSStore from '../store/osStore';
import {
  START_URL, MAX_TABS, TAB_HOARDER_AT, LOAD_TIMEOUT_MS,
  isBlockedUrl, resolveInput, hostOf, makeTab, navigateTabState, backTabState, forwardTabState,
  canGoBack, canGoForward, pushHistoryEntry, loadBookmarks, saveBookmarks, loadHistory, saveHistory,
} from './browser/browserCore';
import Favicon from './browser/Favicon';
import StartPage from './browser/StartPage';
import BlockedSplash from './browser/BlockedSplash';

/**
 * Flow-Net — the OS browser, now with real tabs.
 *
 * ── How external navigation arrives ──────────────────────────────────────────────────────────
 * `openBrowser(url)` (a project's "Live Demo" button) writes `browserUrl` and ticks the
 * `browserNav` counter. The old contract delivered that by REMOUNTING this component
 * (`WindowContentRenderer` keyed it on `browserNav`) — acceptable when the whole app was one
 * address bar, unacceptable now that a remount would wipe every open tab. Instead this component
 * subscribes to the counter itself and opens a NEW TAB per tick.
 *
 * The StrictMode guard: effects run twice in dev, so the effect compares `browserNav` against
 * `consumedNavRef` — initialised to the MOUNT-TIME counter value, because a launch that opened
 * the window is already consumed as the initial tab below. Without that initialisation the mount
 * effect would treat the launch as unconsumed and open the URL a second time; without the ref at
 * all, StrictMode's double-run would duplicate every subsequent launch.
 *
 * ── What Back/Forward can honestly track ─────────────────────────────────────────────────────
 * Link clicks INSIDE the cross-origin iframes are invisible to us (same-origin policy hides the
 * frame's location), so each tab's stack records chrome-initiated navigations only — same
 * limitation as the old single-frame version, now stated. See browserCore.js for the tab model.
 *
 * ── StrictMode discipline ────────────────────────────────────────────────────────────────────
 * Store effects (achievements, timers) are never called inside a setState updater — StrictMode
 * invokes updaters twice (tasks/lessons.md). Handlers compute next state or use PURE functional
 * updaters, and run effects in the handler body. Bookmarks/history live in state; two small
 * effects mirror them to localStorage, so no handler ever writes storage.
 */

const TOOL_BTN =
  'p-2 rounded-xl text-sdl-sec hover:bg-veil/5 hover:text-sdl-ink transition-colors ' +
  'disabled:opacity-40 disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50';

const tabLabel = (tab) => (tab.url === START_URL ? 'Start' : hostOf(tab.url) || tab.url);

const Browser = () => {
  // Selectors, not `useOSStore()` — a whole-store subscription re-renders on every OS tick.
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);
  const browserNav = useOSStore((s) => s.browserNav);
  const browserUrl = useOSStore((s) => s.browserUrl);

  // Mount-time snapshot, held as never-set state (a lazy ref init would trip the
  // react-hooks/refs rule): the pending launch URL becomes the first tab, and its counter value
  // is marked consumed — see header comment.
  const [boot] = useState(() => ({ nav: browserNav, tab: makeTab(browserUrl || START_URL) }));

  const [tabs, setTabs] = useState(() => [boot.tab]);
  const [activeId, setActiveId] = useState(boot.tab.id);
  const [bookmarks, setBookmarks] = useState(loadBookmarks);
  // The boot tab's visit is part of the INITIAL history rather than recorded by a mount effect —
  // a setState-in-effect there is a cascading render the hooks lint rightly rejects.
  const [history, setHistory] = useState(() => {
    const base = loadHistory();
    const { tab } = boot;
    return tab.url !== START_URL && !isBlockedUrl(tab.url)
      ? pushHistoryEntry(base, tab.url)
      : base;
  });

  const consumedNavRef = useRef(boot.nav);
  const addressRef = useRef(null);
  const loadTimersRef = useRef({});

  // Post-commit mirrors so the callbacks the `browserNav` effect depends on can stay
  // referentially stable instead of being rebuilt around closure state every render.
  const tabsRef = useRef(tabs);
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    tabsRef.current = tabs;
    activeIdRef.current = activeId;
  });

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  /* ── loading safety net ──
   * `loading` is cleared by the iframe's onLoad, but a page whose CSP kills the load never fires
   * it — the timer stops a spinner from running forever on a frame that will stay blank. */
  const disarmLoadTimer = useCallback((tabId) => {
    clearTimeout(loadTimersRef.current[tabId]);
    delete loadTimersRef.current[tabId];
  }, []);

  const stopLoading = useCallback((tabId) => {
    setTabs((prev) => {
      const t = prev.find((x) => x.id === tabId);
      if (!t || !t.loading) return prev;
      return prev.map((x) => (x.id === tabId ? { ...x, loading: false } : x));
    });
  }, []);

  const armLoadTimer = useCallback((tabId) => {
    clearTimeout(loadTimersRef.current[tabId]);
    loadTimersRef.current[tabId] = setTimeout(() => {
      delete loadTimersRef.current[tabId];
      stopLoading(tabId);
    }, LOAD_TIMEOUT_MS);
  }, [stopLoading]);

  useEffect(() => {
    const timers = loadTimersRef.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  // Persistence is a state→localStorage sync, so it lives in effects — the one shape where
  // writing an external system from an effect is the point. Handlers never touch storage.
  useEffect(() => { saveHistory(history); }, [history]);
  useEffect(() => { saveBookmarks(bookmarks); }, [bookmarks]);

  /** Record a visit. The timestamp is taken HERE so the functional updater stays pure —
   *  StrictMode replays updaters twice (tasks/lessons.md), and pushHistoryEntry's
   *  consecutive-duplicate skip makes the replay converge. */
  const recordHistory = useCallback((url) => {
    const ts = Date.now();
    setHistory((prev) => pushHistoryEntry(prev, url, ts));
  }, []);

  /**
   * Commit a navigation on a tab. `user: true` marks a navigation the visitor committed from
   * chrome (address bar, start-page search, bookmark, history row) — the 'netizen' achievement
   * fires there and nowhere else. Blocked URLs still commit (the splash renders per-tab from the
   * committed URL) but are not recorded as visits.
   */
  const navigateTo = useCallback((tabId, url, { user = false } = {}) => {
    if (!url) return;
    if (user && url !== START_URL) unlockAchievement('netizen');
    if (url !== START_URL && !isBlockedUrl(url)) recordHistory(url);
    const next = tabsRef.current.map((t) => (t.id === tabId ? navigateTabState(t, url) : t));
    setTabs(next);
    const target = next.find((t) => t.id === tabId);
    if (target?.loading) armLoadTimer(tabId);
    else disarmLoadTimer(tabId);
  }, [unlockAchievement, recordHistory, armLoadTimer, disarmLoadTimer]);

  /** New tab, focused. At the cap the "+" button is disabled, but a Live-Demo launch must not be
   *  silently dropped — it reuses the active tab instead. */
  const openNewTab = useCallback((url = START_URL) => {
    const current = tabsRef.current;
    if (current.length >= MAX_TABS) {
      if (url !== START_URL) navigateTo(activeIdRef.current, url);
      return;
    }
    const tab = makeTab(url);
    const next = [...current, tab];
    if (next.length >= TAB_HOARDER_AT) unlockAchievement('tab_hoarder');
    if (url !== START_URL && !isBlockedUrl(url)) recordHistory(url);
    setTabs(next);
    setActiveId(tab.id);
    if (tab.loading) armLoadTimer(tab.id);
  }, [navigateTo, unlockAchievement, recordHistory, armLoadTimer]);

  // Arm the safety timer for the mount-consumed launch tab. Unguarded on purpose: StrictMode's
  // simulated unmount clears the timer between its two runs, so the second run must re-arm it.
  // `boot` is never-set state, so these deps keep this a mount effect.
  useEffect(() => {
    const { tab } = boot;
    if (tab.loading) armLoadTimer(tab.id);
  }, [boot, armLoadTimer]);

  // External navigation delivery — see header comment for the consumed-counter contract.
  useEffect(() => {
    if (browserNav === consumedNavRef.current) return;
    consumedNavRef.current = browserNav;
    if (browserUrl) openNewTab(browserUrl);
  }, [browserNav, browserUrl, openNewTab]);

  /* ── plain handlers (compute next → set → effects in body; see header) ── */

  const goBack = () => {
    if (!canGoBack(activeTab)) return;
    const next = backTabState(activeTab);
    setTabs(tabs.map((t) => (t.id === activeTab.id ? next : t)));
    if (next.loading) armLoadTimer(activeTab.id);
    else disarmLoadTimer(activeTab.id);
  };

  const goForward = () => {
    if (!canGoForward(activeTab)) return;
    const next = forwardTabState(activeTab);
    setTabs(tabs.map((t) => (t.id === activeTab.id ? next : t)));
    if (next.loading) armLoadTimer(activeTab.id);
    else disarmLoadTimer(activeTab.id);
  };

  const reload = () => {
    if (activeTab.url === START_URL || isBlockedUrl(activeTab.url)) return;
    // The bump changes the iframe's React key — an identical `src` assignment is a DOM no-op,
    // so a remount is the only reliable reload for a cross-origin frame.
    setTabs(tabs.map((t) =>
      t.id === activeTab.id ? { ...t, loading: true, reloadKey: t.reloadKey + 1 } : t
    ));
    armLoadTimer(activeTab.id);
  };

  const closeTab = (tabId) => {
    const idx = tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    disarmLoadTimer(tabId);
    // Closing the last tab yields a fresh start tab — closing the WINDOW is the OS chrome's job,
    // and a browser with zero tabs has nothing to render.
    let next = tabs.filter((t) => t.id !== tabId);
    if (next.length === 0) next = [makeTab(START_URL)];
    setTabs(next);
    if (activeId === tabId) setActiveId(next[Math.min(idx, next.length - 1)].id);
  };

  const handleAddressChange = (value) => {
    setTabs((prev) => prev.map((t) => (t.id === activeId ? { ...t, input: value } : t)));
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    const resolved = resolveInput(activeTab.input);
    if (resolved) navigateTo(activeTab.id, resolved, { user: true });
  };

  const handleStartNavigate = (raw) => {
    const resolved = resolveInput(raw);
    if (resolved) navigateTo(activeTab.id, resolved, { user: true });
  };

  const openExternal = () => {
    if (activeTab.url !== START_URL) window.open(activeTab.url, '_blank');
  };

  const activeIsBookmarked = bookmarks.some((b) => b.url === activeTab.url);

  const toggleBookmark = () => {
    const url = activeTab.url;
    if (url === START_URL) return;
    const title = hostOf(url) || url;
    setBookmarks((prev) => (
      prev.some((b) => b.url === url)
        ? prev.filter((b) => b.url !== url)
        : [...prev, { title, url }]
    ));
  };

  const removeBookmark = (url) => {
    setBookmarks((prev) => prev.filter((b) => b.url !== url));
  };

  const clearHistory = () => setHistory([]);

  const handleIframeLoad = (tabId) => {
    disarmLoadTimer(tabId);
    stopLoading(tabId);
  };

  const handleRootKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      addressRef.current?.focus();
      addressRef.current?.select();
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      goBack();
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      goForward();
    }
  };

  const activeBlocked = isBlockedUrl(activeTab.url);
  const activeIsStart = activeTab.url === START_URL;
  const atCap = tabs.length >= MAX_TABS;

  const AddressGlyph = activeBlocked
    ? ShieldAlert
    : activeIsStart
      ? Search
      : activeTab.url.startsWith('https://')
        ? Lock
        : Globe;

  return (
    // tabIndex -1 so a click on empty chrome parks focus here and the shortcuts keep working;
    // keys pressed while focus is INSIDE a cross-origin iframe never reach us — known limit.
    <div
      tabIndex={-1}
      onKeyDown={handleRootKeyDown}
      className="flex flex-col h-full w-full bg-sdl-plane text-sdl-ink rounded-2xl overflow-hidden font-sans relative outline-none"
    >
      {/* Indeterminate-loader keyframes, co-located because index.css is not this app's file. */}
      <style>{'@keyframes flownet-progress { from { transform: translateX(-100%); } to { transform: translateX(350%); } }'}</style>

      {/* Tab strip — sunken tone, quiet inactive tabs; the active tab lifts to surface with an
          accent hairline (chrome speaks quietly, SDL law 2). */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-1.5 bg-sdl-sunken/60 border-b border-hairline/5">
        <div role="tablist" aria-label="Browser tabs" className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0">
          {tabs.map((tab) => {
            const active = tab.id === activeId;
            return (
              <div
                key={tab.id}
                className={`group flex items-center shrink-0 rounded-xl border transition-colors ${
                  active
                    ? 'bg-sdl-surface border-os-primary/30 shadow-hairline'
                    : 'border-transparent hover:bg-veil/5'
                }`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveId(tab.id)}
                  title={tab.url === START_URL ? 'Start page' : tab.url}
                  className={`flex items-center gap-2 pl-2.5 pr-1 py-1.5 text-[11px] font-bold min-w-0 rounded-l-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-os-primary/50 ${
                    active ? 'text-sdl-ink' : 'text-sdl-sec hover:text-sdl-ink'
                  }`}
                >
                  {tab.url === START_URL
                    ? <Compass size={13} className="text-sdl-sec shrink-0" aria-hidden="true" />
                    : <Favicon url={tab.url} size={13} />}
                  <span className="truncate max-w-[110px]">{tabLabel(tab)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => closeTab(tab.id)}
                  aria-label={`Close tab ${tabLabel(tab)}`}
                  className="p-1 mr-1 rounded-lg text-sdl-sec/70 hover:text-sdl-ink hover:bg-veil/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => openNewTab()}
          disabled={atCap}
          aria-label="New tab"
          title={atCap ? `Tab limit reached (${MAX_TABS}) — close a tab to open another` : 'New tab'}
          className={`${TOOL_BTN} shrink-0`}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-sdl-surface border-b border-hairline/10 relative z-20">
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack(activeTab)}
            aria-disabled={!canGoBack(activeTab)}
            aria-label="Go back"
            title="Back (Alt+←)"
            className={TOOL_BTN}
          >
            <ArrowLeft size={15} />
          </button>
          <button
            type="button"
            onClick={goForward}
            disabled={!canGoForward(activeTab)}
            aria-disabled={!canGoForward(activeTab)}
            aria-label="Go forward"
            title="Forward (Alt+→)"
            className={TOOL_BTN}
          >
            <ArrowRight size={15} />
          </button>
          <button
            type="button"
            onClick={reload}
            disabled={activeIsStart || activeBlocked}
            aria-label="Reload page"
            title="Reload"
            className={`${TOOL_BTN} ${activeTab.loading ? 'text-os-primary animate-spin' : ''}`}
          >
            <RotateCw size={15} />
          </button>
        </div>

        <form onSubmit={handleAddressSubmit} className="flex-grow min-w-0">
          <div className="relative flex items-center">
            <AddressGlyph
              size={13}
              aria-hidden="true"
              className={`absolute left-3 pointer-events-none ${activeBlocked ? 'text-sdl-warn' : 'text-os-primary'}`}
            />
            <input
              ref={addressRef}
              type="text"
              aria-label="Address bar"
              value={activeTab.input}
              onChange={(e) => handleAddressChange(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="Search or enter URL"
              className="w-full bg-sdl-sunken border border-hairline/10 rounded-xl py-2 pl-9 pr-3 text-xs text-sdl-ink placeholder:text-sdl-sunkSec font-medium outline-none transition-all focus:border-os-primary/60 focus:ring-2 focus:ring-os-primary/20"
            />
          </div>
        </form>

        <button
          type="button"
          onClick={toggleBookmark}
          disabled={activeIsStart}
          aria-label={activeIsBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
          aria-pressed={activeIsBookmarked}
          title={activeIsBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
          className={`${TOOL_BTN} ${activeIsBookmarked ? 'text-os-primary hover:text-os-primary' : ''}`}
        >
          <Star size={15} fill={activeIsBookmarked ? 'currentColor' : 'none'} />
        </button>
        <button
          type="button"
          onClick={openExternal}
          disabled={activeIsStart}
          aria-label="Open in new tab"
          title="Open in new tab"
          className="p-2 bg-os-primary/10 text-os-primary rounded-xl hover:bg-os-primary/20 transition-all active:scale-90 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
        >
          <ExternalLink size={15} />
        </button>
      </div>

      {/* 2px indeterminate progress slot — always reserved so loading never shifts layout. */}
      <div className="h-0.5 relative overflow-hidden shrink-0" aria-hidden="true">
        {activeTab.loading && (
          <span
            className="absolute inset-y-0 left-0 w-1/3 rounded-full"
            style={{ background: 'var(--sdl-accent)', animation: 'flownet-progress 1.1s linear infinite' }}
          />
        )}
      </div>

      {/* Content. Every real-URL tab keeps its iframe mounted (hidden, not unmounted) so tab
          switches don't reload; the start page and the blocked splash render only for the active
          tab, since they are cheap React trees. */}
      <div className="flex-grow relative overflow-hidden bg-sdl-sunken">
        {tabs.map((tab) => {
          if (tab.url === START_URL || isBlockedUrl(tab.url)) return null;
          return (
            <iframe
              key={`${tab.id}:${tab.reloadKey}`}
              title={`${tabLabel(tab)} — Flow-Net tab`}
              src={tab.url}
              onLoad={() => handleIframeLoad(tab.id)}
              className={tab.id === activeId ? 'absolute inset-0 w-full h-full border-none bg-sdl-surface' : 'hidden'}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              credentialless="true"
            />
          );
        })}

        {activeIsStart && (
          <StartPage
            key={activeTab.id}
            bookmarks={bookmarks}
            history={history}
            onNavigate={handleStartNavigate}
            onRemoveBookmark={removeBookmark}
            onClearHistory={clearHistory}
          />
        )}

        {activeBlocked && (
          <BlockedSplash
            url={activeTab.url}
            onOpenExternal={() => window.open(activeTab.url, '_blank')}
            onBackToStart={() => navigateTo(activeTab.id, START_URL)}
          />
        )}
      </div>
    </div>
  );
};

export default Browser;
