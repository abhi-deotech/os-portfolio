import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Settings as SettingsIcon, Trophy, LogOut, RotateCcw, Palette } from 'lucide-react';
import useOSStore from '../store/osStore';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useColorway } from '../theme/useColorway';
import useSoundEffects from '../hooks/useSoundEffects';
import { APP_BY_ID } from '../config/apps';
import { GAME_BY_ID } from '../config/games';

/**
 * The system menu bar — top chrome, the counterpart to the dock.
 *
 * Deliberately NOT a macOS File/Edit/View clone. Those menus only mean something when the focused
 * app actually implements them; cloned wholesale into an app that doesn't, every row is a stub that
 * makes the desktop feel less real, not more. This bar shows what this OS genuinely knows: which
 * window has focus, which colorway is live, and the time.
 *
 * Mounted as the FIRST flex child of the App shell rather than as a fixed overlay. `Desktop` is
 * `flex-grow`, so the icon coordinate space starts below this bar automatically — desktop icons
 * default to y=40 and would otherwise sit underneath it. No magic offset to keep in sync.
 */
/**
 * Bar height, in px. Exported because it is a layout contract, not a private detail: a maximized or
 * edge-snapped window has to start *below* the bar, and the drag-to-snap preview has to agree with
 * where that window will land. Hard-coding 28 in those places is how the two silently drift.
 * Windows pass 0 on mobile, where this component does not render at all.
 */
export const MENU_BAR_H = 28;

const MENU_ITEMS = [
  { id: 'about', label: 'About This Lumina', icon: Info, app: 'about' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, app: 'settings' },
  { id: 'achievements', label: 'Achievements', icon: Trophy, app: 'achievements' },
];

const MenuBar = () => {
  const isMobile = useIsMobile();
  const { playSound } = useSoundEffects();
  const colorway = useColorway();

  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(() => new Date());
  const menuRef = useRef(null);

  const activeWindow = useOSStore((s) => s.activeWindow);
  const openWindows = useOSStore((s) => s.openWindows);
  const minimizedWindows = useOSStore((s) => s.minimizedWindows || []);
  const openWindow = useOSStore((s) => s.openWindow);
  const logout = useOSStore((s) => s.logout);

  /**
   * Minute-aligned clock: one timeout to phase-align to the next minute boundary, then a 60s
   * interval. This displays HH:MM, so a per-second tick would re-render 60x for the same string.
   */
  useEffect(() => {
    let intervalId;
    const timeoutId = setTimeout(() => {
      setTime(new Date());
      intervalId = setInterval(() => setTime(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => { clearTimeout(timeoutId); clearInterval(intervalId); };
  }, []);

  // Escape closes the menu wherever focus is.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); menuRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (isMobile) return null;

  // A minimized window keeps focus in the store but is not on screen, so the bar should not claim
  // it is what you are looking at.
  const focused = activeWindow && !minimizedWindows.includes(activeWindow) ? activeWindow : null;
  const focusedTitle = focused
    ? (APP_BY_ID[focused]?.title
      ?? GAME_BY_ID[focused]?.title
      ?? focused.charAt(0).toUpperCase() + focused.slice(1))
    : 'Desktop';

  const run = (fn) => { playSound('click'); setOpen(false); fn(); };

  // `glass` is the mode-aware surface role, not a hand-rolled bg/blur/border triple — it inverts
  // correctly in light mode and already collapses to an opaque fill when the user turns
  // transparency off (grammar.css keys that off [data-glass]). Borders trimmed to the bottom edge.
  return (
    <div
      style={{ height: MENU_BAR_H }}
      className="relative z-[80] shrink-0 flex items-center gap-1 px-2 text-[11px] select-none
        glass border-x-0 border-t-0"
    >
      <button
        ref={menuRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Lumina menu"
        onClick={() => { playSound('click'); setOpen((v) => !v); }}
        className={`flex items-center gap-1.5 h-5 px-2 rounded-md font-bold tracking-wide transition-colors
          cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50
          ${open ? 'bg-os-primary/20 text-os-primary' : 'text-os-onSurface hover:bg-veil/10'}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-os-primary shadow-[0_0_6px_var(--os-primary)]" />
        Lumina
      </button>

      <span className="h-3 w-px bg-os-outline/20 mx-1" />

      <span className="font-semibold text-os-onSurface/90 truncate max-w-[40vw]" title={focusedTitle}>
        {focusedTitle}
      </span>

      <div className="flex-grow" />

      {/* Right cluster reports only things that are actually true: the live colorway, how many
          windows are open, and the time. No simulated CPU/RAM readout lives in permanent chrome —
          those are modelled numbers, and the System Dashboard is where they are labelled as such. */}
      <span
        className="hidden lg:flex items-center gap-1.5 h-5 px-2 rounded-md text-os-onSurfaceVariant"
        title={`Colorway: ${colorway.name} · ${colorway.mode} mode`}
      >
        <Palette size={11} className="opacity-70" />
        <span className="font-medium">{colorway.name}</span>
      </span>

      {openWindows.length > 0 && (
        <span className="hidden md:inline text-os-onSurfaceVariant tabular-nums px-2">
          {openWindows.length} open
        </span>
      )}

      <span className="font-bold tabular-nums text-os-onSurface px-2">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
            <motion.div
              role="menu"
              aria-label="Lumina menu"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              style={{ top: MENU_BAR_H }}
              className="absolute left-1 w-60 z-[100] p-1.5 rounded-2xl overflow-hidden
                glass-2 lift"
            >
              <div className="absolute -top-16 -left-16 w-40 h-40 bg-os-primary/10 blur-[60px] rounded-full -z-10" />

              {MENU_ITEMS.map(({ id, label, icon: Icon, app }) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  onClick={() => run(() => openWindow(app))}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-os-onSurface
                    hover:bg-veil/10 transition-colors cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
                >
                  <Icon size={13} className="opacity-70" />
                  {label}
                </button>
              ))}

              <div className="h-px bg-os-outline/15 my-1.5 mx-1" />

              <button
                type="button"
                role="menuitem"
                onClick={() => run(() => window.location.reload())}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-os-onSurface
                  hover:bg-veil/10 transition-colors cursor-pointer
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-primary/50"
              >
                <RotateCcw size={13} className="opacity-70" />
                Restart
              </button>

              {/* Named for what the store actually does: `logout` clears every open window and
                  returns to the login screen. Calling it "Lock" would imply the session survives. */}
              <button
                type="button"
                role="menuitem"
                onClick={() => run(logout)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-sdl-alert
                  hover:bg-sdl-alert/10 transition-colors cursor-pointer
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sdl-alert/50"
              >
                <LogOut size={13} className="opacity-70" />
                Log Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuBar;
