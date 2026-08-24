import React, { useState } from 'react';
import { Gamepad2, Home, Trophy, Ghost, ChevronRight, Play, LayoutGrid, ChevronLeft, Lock, Plus, Trash2 } from 'lucide-react';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useColorway } from '../theme/useColorway';
import { iconStyle } from '../theme/icons';
import { GAMES, FEATURED_GAME, userGameEntry } from '../config/games';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../config/achievements';
import AddGameDialog from './games/AddGameDialog';

const Badge = ({ children }) => (
  <span className="px-2 py-1 rounded-lg bg-sdl-sunken border border-hairline/10 text-[9px] font-black uppercase tracking-widest text-sdl-sec whitespace-nowrap">
    {children}
  </span>
);

const Games = () => {
  const isMobile = useIsMobile();
  const { openWindow, unlockAchievement, achievements } = useOSStore();
  const userGames = useOSStore((s) => s.userGames);
  const removeUserGame = useOSStore((s) => s.removeUserGame);
  const recordGamePlayed = useOSStore((s) => s.recordGamePlayed);
  const [activeTab, setActiveTab] = useState('home');
  const [showSidebar, setShowSidebar] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const cw = useColorway();
  const faceOf = (hue) => iconStyle('harmonized', cw, { hue });

  const sideloaded = (userGames ?? []).map(userGameEntry);
  const allGames = [...GAMES, ...sideloaded];

  const launchGame = (gameId) => {
    openWindow(gameId);
    unlockAchievement('gamer');
    recordGamePlayed?.(gameId);
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (isMobile) setShowSidebar(false);
  };

  // Every launcher tile is a <div>, so the button contract has to be wired by hand. Without it a
  // keyboard user cannot reach — let alone start — a single game in this app.
  const tileProps = (gameId, label) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': `Launch ${label}`,
    onClick: () => launchGame(gameId),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        launchGame(gameId);
      }
    },
  });

  // Only the game achievements belong in the launcher's trophy room; the rest are OS-wide and
  // live in the Honors app. This used to be four invented objects with hardcoded progress bars
  // (80% / 100% / 35% / 60%) and no ids — numbers that moved for nobody and contradicted the
  // real, store-wired Honors panel two clicks away. One of them, "Quick Witt", was a typo for an
  // achievement that did not exist in any registry.
  const gameAchievementIds = GAMES.flatMap((g) => g.achievements ?? []);
  const trophies = gameAchievementIds
    .map((id) => ACHIEVEMENT_BY_ID[id])
    .filter(Boolean)
    .map((a) => ({ ...a, unlocked: achievements.includes(a.id) }));

  const unlockedCount = ACHIEVEMENTS.filter((a) => achievements.includes(a.id)).length;

  const GameTile = ({ game }) => {
    const face = faceOf(game.hue);
    const Glyph = game.icon;
    return (
      <div
        {...tileProps(game.id, game.title)}
        className="min-w-[260px] md:min-w-[300px] h-40 md:h-48 rounded-3xl bg-sdl-surface border border-hairline/10 hover:border-os-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdl-ink/70 transition-all p-5 md:p-6 relative overflow-hidden cursor-pointer group shadow-xl flex flex-col justify-between"
      >
        <div
          className="absolute -right-10 -top-10 w-32 h-32 blur-2xl rounded-full opacity-40 group-hover:opacity-70 transition-opacity"
          style={{ backgroundColor: face.tile }}
        />
        <div className="flex items-start justify-between relative z-10">
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: face.tile, borderColor: face.tileBorder }}
          >
            <Glyph size={isMobile ? 20 : 24} style={{ color: face.glyph }} />
          </div>
          <div className="flex items-center gap-1.5">
            {game.novelty && <Badge>Emulated</Badge>}
            {game.source === 'folder' && <Badge>{game.credit?.license}</Badge>}
            {/* A sideloaded game is arbitrary code the visitor supplied. It runs in an opaque-origin
                sandbox, but the tile still says plainly where it came from rather than presenting
                it as though it shipped with the OS. */}
            {game.unverified && <Badge>Unverified</Badge>}
            {game.unverified && (
              <button
                onClick={(e) => { e.stopPropagation(); removeUserGame(game.id); }}
                onKeyDown={(e) => e.stopPropagation()}
                aria-label={`Remove ${game.title}`}
                className="p-1.5 rounded-lg bg-sdl-sunken border border-hairline/10 text-sdl-sec hover:text-sdl-alert transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="relative z-10">
          <h3 className="font-display font-bold text-lg md:text-xl mb-1 text-sdl-ink group-hover:text-os-primary transition-colors">
            {game.title}
          </h3>
          <p className="text-xs md:text-sm text-sdl-sec font-medium line-clamp-2">{game.tagline}</p>
          {game.credit?.author && (
            <p className="text-[10px] text-sdl-sec/70 mt-1 truncate">by {game.credit.author}</p>
          )}
        </div>
      </div>
    );
  };

  const featuredFace = faceOf(FEATURED_GAME.hue);

  return (
    <div className="flex h-full w-full bg-sdl-plane text-os-onSurface overflow-hidden rounded-2xl font-sans relative">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-os-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-os-secondary/20 blur-[100px] rounded-full pointer-events-none" />

      {/* Sidebar Navigation */}
      <div className={`${isMobile ? (showSidebar ? 'w-full absolute inset-0' : 'hidden') : 'w-64 border-r'} bg-sdl-surface/80 backdrop-blur-3xl border-os-outline/10 flex flex-col z-20 transition-all`}>
        <div className="p-6 flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-os-primary to-os-primary/80 flex items-center justify-center shadow-[0_0_20px_rgb(var(--sdl-accent-rgb)/0.4)]">
            <Gamepad2 size={24} className="text-sdl-onAccent" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Nexus<span className="text-os-primary">X</span></span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {/* The "Settings" tab rendered a Ghost illustration and a "System Config" button with no
              onClick — a dead end presented as a destination. Appearance and sound already live in
              the real Settings app, so the tab is gone rather than faked. */}
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'all', icon: LayoutGrid, label: 'All Games' },
            { id: 'achievements', icon: Trophy, label: 'Achievements' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center justify-between px-4 py-4 md:py-3 rounded-xl transition-all relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdl-ink/70 ${
                activeTab === item.id && !isMobile
                  ? 'bg-os-surfaceContainerHighest/50 text-os-primary'
                  : 'text-os-onSurfaceVariant hover:bg-os-surfaceContainerHigh/30 hover:text-os-onSurface'
              }`}
            >
              <div className="flex items-center space-x-3">
                {activeTab === item.id && !isMobile && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-os-tertiary rounded-r-full shadow-[0_0_10px_var(--sdl-glow)]" />
                )}
                <item.icon size={20} className={activeTab === item.id ? 'text-os-primary' : ''} />
                <span className="font-semibold text-base md:text-sm">{item.label}</span>
              </div>
              <ChevronRight size={16} className="opacity-50" />
            </button>
          ))}
        </nav>

        {/* Player summary. Was "LVL 42" beside a 75%-filled XP bar — both literals, with no level
            system anywhere in the codebase to back them. This counts real unlocked achievements. */}
        <div className="p-4 mx-4 mb-6 mt-auto bg-os-surfaceContainerHigh/40 backdrop-blur-xl rounded-2xl border border-os-outline/10 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-os-secondary/20 blur-xl rounded-full" />
          <p className="text-[10px] text-os-onSurfaceVariant uppercase tracking-widest font-bold mb-1">Honors</p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-display font-black text-sdl-ink tabular-nums">{unlockedCount}</span>
            <span className="text-sm font-bold text-sdl-sec tabular-nums">/ {ACHIEVEMENTS.length}</span>
          </div>
          <div className="mt-3 h-1 w-full bg-os-surfaceContainerHighest rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-os-secondary to-os-primary shadow-[0_0_10px_var(--sdl-glow)] transition-[width] duration-700"
              style={{ width: `${Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Dashboard */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 relative z-10 scrollbar-hide ${isMobile && showSidebar ? 'hidden' : ''}`}>

        {/* Mobile Back Button */}
        {isMobile && (
          <button
            onClick={() => setShowSidebar(true)}
            className="flex items-center space-x-2 text-os-primary font-bold mb-6 active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdl-ink/70 rounded-xl"
          >
            <ChevronLeft size={20} />
            <span>Games</span>
          </button>
        )}

        {activeTab === 'home' ? (
          <>
            {/* Hero */}
            <div className="mb-8 md:mb-12">
              <div className="flex items-center space-x-2 text-os-tertiary mb-4 text-[10px] md:text-sm font-bold tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-os-tertiary animate-pulse shadow-[0_0_8px_var(--sdl-glow)]" />
                <span>Featured</span>
              </div>

              <div
                {...tileProps(FEATURED_GAME.id, FEATURED_GAME.title)}
                className="group relative w-full h-60 md:h-80 rounded-[2rem] overflow-hidden cursor-pointer border border-os-outline/10 hover:border-os-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdl-ink/70 transition-all duration-500 shadow-2xl"
              >
                <div
                  className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${featuredFace.tile}, var(--sdl-surface2), var(--sdl-plane))` }}
                />
                <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end bg-gradient-to-t from-sdl-plane via-sdl-plane/50 to-transparent">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <h1 className="font-display text-3xl md:text-5xl font-black text-sdl-ink mb-1 md:mb-2 drop-shadow-lg group-hover:text-os-primary transition-colors">
                        {FEATURED_GAME.title}
                      </h1>
                      <p className="text-os-onSurfaceVariant font-medium text-sm md:text-lg max-w-md">{FEATURED_GAME.tagline}</p>
                      <p className="text-sdl-sec font-medium text-xs mt-2">{FEATURED_GAME.controls.desc}</p>
                    </div>

                    {/* Decorative twin of the card itself — the whole tile is already the button, so
                        this must stay out of the tab order rather than become a second stop to the
                        same action. */}
                    <span aria-hidden="true" className="flex items-center justify-center space-x-2 px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-os-primary to-os-primary/80 text-sdl-onAccent font-bold rounded-2xl shadow-[0_0_20px_rgb(var(--sdl-accent-rgb)/0.4)] group-hover:scale-105 group-active:scale-95 transition-all w-full md:w-auto">
                      <Play fill="currentColor" size={18} />
                      <span>Launch</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Library strip. Was five hand-copied ~1,270-character <div>s that had already drifted
                apart from each other; adding a sixth game meant copying a sixth. */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl md:text-2xl font-bold">Library</h2>
                {/* "See All" used to have no onClick at all. It goes to the tab that shows all. */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAddOpen(true)}
                    className="text-xs md:text-sm font-bold text-os-primary hover:text-sdl-ink flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdl-ink/70 rounded-lg px-2 py-1 border border-os-primary/30 bg-os-primary/10 transition-colors"
                  >
                    <Plus size={14} />
                    <span>Add a game</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className="text-xs md:text-sm font-bold text-os-onSurfaceVariant hover:text-sdl-ink flex items-center space-x-1 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdl-ink/70 rounded-lg px-1"
                  >
                    <span>See All</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              <div className="flex space-x-4 md:space-x-6 overflow-x-auto pb-6 scrollbar-hide">
                {allGames.map((game) => <GameTile key={game.id} game={game} />)}
              </div>
            </div>
          </>
        ) : activeTab === 'all' ? (
          <>
            <div className="mb-6">
              <h2 className="font-display text-2xl md:text-3xl font-black mb-1">All Games</h2>
              {/* 'home' and 'all' used to render byte-identical content, so the two tabs were
                  indistinguishable once clicked. This one is a real grid of everything. */}
              <p className="text-os-onSurfaceVariant text-sm">
                {allGames.length} games installed{sideloaded.length ? `, ${sideloaded.length} added by you` : ''}.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {allGames.map((game) => <GameTile key={game.id} game={game} />)}
            </div>
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="font-display text-3xl font-black mb-2">Trophy Room</h2>
              <p className="text-os-onSurfaceVariant">
                {trophies.filter((t) => t.unlocked).length} of {trophies.length} game honors earned.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trophies.map((ach) => {
                const face = faceOf(ach.hue);
                const Glyph = ach.icon;
                return (
                  <div
                    key={ach.id}
                    className={`p-6 rounded-3xl bg-sdl-surface relative overflow-hidden border ${ach.unlocked ? 'border-sdl-accent/40' : 'border-os-outline/10'}`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Locked stays legible rather than greyed to the point of reading disabled —
                          an unearned trophy is a goal, not an inactive control. */}
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0"
                        style={{
                          backgroundColor: ach.unlocked ? face.tile : 'var(--sdl-sunken)',
                          borderColor: ach.unlocked ? face.tileBorder : 'rgb(var(--sdl-hairline-rgb) / .1)',
                        }}
                      >
                        {ach.unlocked
                          ? <Glyph size={24} style={{ color: face.glyph }} />
                          : <Lock size={20} className="text-sdl-sec" />}
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg ${ach.unlocked ? 'text-sdl-ink' : 'text-sdl-sec'}`}>{ach.title}</h3>
                        <p className="text-xs text-os-onSurfaceVariant">{ach.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {trophies.length === 0 && (
                <div className="col-span-full h-48 flex flex-col items-center justify-center text-center">
                  <Ghost size={48} className="text-os-onSurfaceVariant/20 mb-4" />
                  <p className="text-os-onSurfaceVariant">No game honors registered yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <AddGameDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
};

export default Games;
