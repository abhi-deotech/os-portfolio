import React, { useState } from 'react';
import { Gamepad2, Home, Trophy, Ghost, ChevronRight, Play, LayoutGrid, ChevronLeft, Lock, Plus, Trash2 } from 'lucide-react';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useColorway } from '../theme/useColorway';
import { iconStyle } from '../theme/icons';
import { GAMES, FEATURED_GAME, userGameEntry } from '../config/games';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../config/achievements';
import { readAllGameStats } from '../hooks/useHighScore';
import AddGameDialog from './games/AddGameDialog';
import { osConfirm } from '../utils/dialog';

const Badge = ({ children }) => (
  <span className="px-2 py-1 rounded-lg bg-sdl-sunken border border-hairline/10 text-[9px] font-black uppercase tracking-widest text-sdl-sec whitespace-nowrap">
    {children}
  </span>
);

/**
 * Two builtins store their best in units that are not points: Minesweeper keeps SECONDS (fastest
 * clear, lower is better) and Memory keeps MOVES (fewest). A bare number would present a
 * 96-second clear as "Best 96", which reads as a worse score than "Best 78" — exactly backwards.
 * Ids not named here (folder and sideloaded games included) are plain higher-is-better numbers.
 */
const BEST_TEXT = {
  minesweeper: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`,
  memory: (v) => `${v} moves`,
};
const bestText = (id, v) => (BEST_TEXT[id] ? BEST_TEXT[id](v) : String(v));

/** Quiet stat chip: sunken fill, hairline, secondary ink — data on the card without a shout. */
const StatChip = ({ icon: Icon, label, children }) => (
  <span
    aria-label={label}
    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sdl-sunken/80 border border-hairline/10 text-[9px] font-black uppercase tracking-wider text-sdl-sec tabular-nums whitespace-nowrap"
  >
    <Icon size={10} className="shrink-0" />
    {children}
  </span>
);

const Games = () => {
  const isMobile = useIsMobile();
  // Selectors, not `useOSStore()`. A whole-store subscription re-renders this component on
  // every state change anywhere in the OS, not just the fields it reads.
  const openWindow = useOSStore((s) => s.openWindow);
  const unlockAchievement = useOSStore((s) => s.unlockAchievement);
  const achievements = useOSStore((s) => s.achievements);
  const userGames = useOSStore((s) => s.userGames);
  const removeUserGame = useOSStore((s) => s.removeUserGame);
  const recordGamePlayed = useOSStore((s) => s.recordGamePlayed);
  const gameStats = useOSStore((s) => s.gameStats);
  const [activeTab, setActiveTab] = useState('home');
  const [showSidebar, setShowSidebar] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [genreFilter, setGenreFilter] = useState('all');
  const cw = useColorway();
  const faceOf = (hue) => iconStyle('harmonized', cw, { hue });

  const sideloaded = (userGames ?? []).map(userGameEntry);
  const allGames = [...GAMES, ...sideloaded];

  // Personal bests live in localStorage, not the store, so nothing pushes an update into this
  // component when one changes mid-session. Reading the map during render keeps every chip honest
  // on every re-render (a launch, an unlock and a tab switch each cause one); the read is a
  // JSON.parse of a tiny map, and useHighScore already reads the same key in the render phase
  // (its useState initializer), so this adds no new class of side effect.
  const bests = readAllGameStats();

  // Sorted by lastPlayed desc. Records persisted before lastPlayed existed ({ plays } only — see
  // the shape migration note in gamesSlice) sort to the end rather than vanishing: they were
  // played, we just don't know when.
  const recentGames = allGames
    .filter((g) => (gameStats?.[g.id]?.plays ?? 0) > 0)
    .sort((a, b) => (gameStats?.[b.id]?.lastPlayed ?? 0) - (gameStats?.[a.id]?.lastPlayed ?? 0))
    .slice(0, 4);

  // Genres derive from the registry, so a chip can only exist for a genre some game actually
  // declares. The guard covers a filter outliving its last game (a removable sideload could in
  // principle be a genre's only member): the chip disappears, and the stranded selection must
  // fall back to 'all' instead of filtering the grid down to nothing with no way out.
  const genres = ['all', ...new Set(allGames.map((g) => g.genre).filter(Boolean))];
  const activeGenre = genres.includes(genreFilter) ? genreFilter : 'all';
  const visibleGames = activeGenre === 'all' ? allGames : allGames.filter((g) => g.genre === activeGenre);

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
  // and no ids — numbers that moved for nobody and contradicted the real, store-wired Honors
  // panel two clicks away. Now it groups BY GAME from each registry entry's `achievements` field,
  // so a game with nothing to earn simply has no section, and one can never show a trophy its own
  // registry entry does not declare.
  const trophyGroups = allGames
    .filter((g) => (g.achievements ?? []).length > 0)
    .map((g) => ({
      game: g,
      rows: (g.achievements ?? [])
        .map((id) => ACHIEVEMENT_BY_ID[id])
        .filter(Boolean)
        .map((a) => ({ ...a, unlocked: achievements.includes(a.id) })),
    }))
    .filter((grp) => grp.rows.length > 0);
  const trophyRows = trophyGroups.flatMap((grp) => grp.rows);
  const earnedCount = trophyRows.filter((r) => r.unlocked).length;

  const unlockedCount = ACHIEVEMENTS.filter((a) => achievements.includes(a.id)).length;

  // The chips only render when there is a number to show — a card reading "0 plays, no best"
  // is noise pretending to be data.
  const statChips = (gameId) => {
    const best = bests[gameId];
    const plays = gameStats?.[gameId]?.plays ?? 0;
    if (!Number.isFinite(best) && plays < 1) return null;
    return (
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        {Number.isFinite(best) && (
          <StatChip icon={Trophy} label={`Personal best ${bestText(gameId, best)}`}>
            Best {bestText(gameId, best)}
          </StatChip>
        )}
        {plays > 0 && (
          <StatChip icon={Play} label={`Played ${plays} ${plays === 1 ? 'time' : 'times'}`}>
            {plays} {plays === 1 ? 'play' : 'plays'}
          </StatChip>
        )}
      </div>
    );
  };

  const GameTile = ({ game }) => {
    const face = faceOf(game.hue);
    const Glyph = game.icon;
    const chips = statChips(game.id);
    return (
      // Hover is the interaction grammar's "pronounced" card verb: the border tint + glow orb are
      // this launcher's established halo, and the -1px rise pairs with lift-hover — both shadow
      // roles resolve to `none` under a light colorway, so the flat grammar enforces itself.
      <div
        {...tileProps(game.id, game.title)}
        className="min-w-[260px] md:min-w-[300px] h-44 md:h-52 rounded-3xl bg-sdl-surface border border-hairline/10 hover:border-os-primary/60 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdl-ink/70 transition-all duration-hover ease-sdl p-5 md:p-6 relative overflow-hidden cursor-pointer group shadow-lift hover:shadow-lift-hover flex flex-col justify-between"
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
                onClick={async (e) => {
                  e.stopPropagation();
                  // The HTML lives only in this browser — there is no copy to restore it from,
                  // which is exactly why a one-click delete was the wrong affordance.
                  const ok = await osConfirm({
                    kicker: 'Game Center',
                    tone: 'danger',
                    icon: 'trash',
                    title: `Remove “${game.title}”?`,
                    message: 'Lumina holds the only copy of this file. You would have to add it again from your own disk.',
                    confirmLabel: 'Remove',
                  });
                  if (ok) removeUserGame(game.id);
                }}
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
          {/* One tagline line once stats arrive: the card's height is fixed, and a number the
              player earned outranks the second half of a sentence they have already read. */}
          <p className={`text-xs md:text-sm text-sdl-sec font-medium ${chips ? 'line-clamp-1' : 'line-clamp-2'}`}>{game.tagline}</p>
          {game.credit?.author && (
            <p className="text-[10px] text-sdl-sec/70 mt-1 truncate">by {game.credit.author}</p>
          )}
          {chips}
        </div>
      </div>
    );
  };

  // The compact "Jump back in" card: same launch contract and hover grammar as GameTile, sized
  // for a row of four.
  const RecentCard = ({ game }) => {
    const face = faceOf(game.hue);
    const Glyph = game.icon;
    return (
      <div
        {...tileProps(game.id, game.title)}
        className="group flex items-center gap-3 p-3.5 rounded-2xl bg-sdl-surface border border-hairline/10 hover:border-os-primary/60 hover:-translate-y-px shadow-lift hover:shadow-lift-hover transition-all duration-hover ease-sdl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdl-ink/70"
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center border shrink-0"
          style={{ backgroundColor: face.tile, borderColor: face.tileBorder }}
        >
          <Glyph size={22} style={{ color: face.glyph }} />
        </div>
        <div className="min-w-0">
          <h3 className="font-display font-bold text-sm text-sdl-ink truncate group-hover:text-os-primary transition-colors">
            {game.title}
          </h3>
          {statChips(game.id)}
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

            {/* Only renders once something has actually been played — an empty "Jump back in" is
                a reproach, not a feature. */}
            {recentGames.length > 0 && (
              <div className="mb-8 md:mb-10">
                <h2 className="font-display text-xl md:text-2xl font-bold mb-4">Jump back in</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {recentGames.map((game) => <RecentCard key={game.id} game={game} />)}
                </div>
              </div>
            )}

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
            <div className="mb-5">
              <h2 className="font-display text-2xl md:text-3xl font-black mb-1">All Games</h2>
              {/* 'home' and 'all' used to render byte-identical content, so the two tabs were
                  indistinguishable once clicked. This one is a real grid of everything. */}
              <p className="text-os-onSurfaceVariant text-sm">
                {allGames.length} games installed{sideloaded.length ? `, ${sideloaded.length} added by you` : ''}
                {activeGenre !== 'all' ? ` · showing ${visibleGames.length} ${activeGenre}` : ''}.
              </p>
            </div>

            {/* Law-5 chips, matching the Specimens model: active = accent-soft fill + aInk text +
                aInk dot (the soft role itself is what adapts between light and dark); inactive =
                quiet sunken + hairline. Hover is the grammar's chip verb — solid accent, contrast
                ink, slight scale. Real <button>s, so the keyboard gets them for free. */}
            <div className="flex items-center gap-2 flex-wrap mb-6" role="group" aria-label="Filter by genre">
              {genres.map((g) => {
                const active = activeGenre === g;
                return (
                  <button
                    key={g}
                    onClick={() => setGenreFilter(g)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-hover ease-sdl hover:bg-sdl-accent hover:text-sdl-onAccent hover:border-transparent hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdl-ink/70 ${
                      active
                        ? 'bg-sdl-soft text-sdl-aInk border-transparent'
                        : 'bg-sdl-sunken text-sdl-sec border-hairline/10'
                    }`}
                  >
                    {active && <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-sdl-aInk" />}
                    <span>{g === 'all' ? 'All' : g}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {visibleGames.map((game) => <GameTile key={game.id} game={game} />)}
            </div>
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="font-display text-3xl font-black mb-2">Trophy Room</h2>
              <p className="text-os-onSurfaceVariant">
                {earnedCount} of {trophyRows.length} game honors earned.
              </p>
            </div>

            {/* Earned rows speak in the accent voice — soft fill, aInk ink. The 2026-08 audit
                recorded that sdl-done's neutral grey on an earned badge reads as *disabled*, the
                exact opposite of a trophy. Locked rows take a quiet veil and stay legible: an
                unearned trophy is a goal, not an inactive control. Rows carry no action, so none
                of them belongs in the tab order. */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {trophyGroups.map(({ game, rows }) => {
                const face = faceOf(game.hue);
                const Glyph = game.icon;
                const earned = rows.filter((r) => r.unlocked).length;
                return (
                  <div key={game.id} className="p-5 rounded-3xl bg-sdl-surface border border-hairline/10">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
                        style={{ backgroundColor: face.tile, borderColor: face.tileBorder }}
                      >
                        <Glyph size={20} style={{ color: face.glyph }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-bold text-base text-sdl-ink truncate">{game.title}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-sdl-sec tabular-nums">
                          {earned} of {rows.length} earned
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {rows.map((ach) => {
                        const AchGlyph = ach.icon;
                        return (
                          <div
                            key={ach.id}
                            className={`flex items-center gap-3 p-3 rounded-2xl ${
                              ach.unlocked ? 'bg-sdl-soft' : 'bg-veil/[0.04] border border-hairline/10'
                            }`}
                          >
                            {ach.unlocked
                              ? <AchGlyph size={18} className="text-sdl-aInk shrink-0" />
                              : <Lock size={16} className="text-sdl-sec shrink-0" />}
                            <div className="min-w-0">
                              <p className={`font-bold text-sm leading-tight ${ach.unlocked ? 'text-sdl-aInk' : 'text-sdl-sec'}`}>
                                {ach.title}
                              </p>
                              <p className={`text-xs mt-0.5 ${ach.unlocked ? 'text-sdl-aInk/75' : 'text-os-onSurfaceVariant'}`}>
                                {ach.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {trophyGroups.length === 0 && (
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
