import React, { useEffect, useRef, useState } from 'react';
import { Menu, Separator, useContextMenu } from 'react-contexify';
import { Copy, Settings as SettingsIcon, LogOut } from 'lucide-react';
import LiveWallpaper from '../LiveWallpaper';
import MenuRow from '../common/MenuRow';
import useMinuteClock from '../../hooks/useMinuteClock';
import useOSStore from '../../store/osStore';
import { exitWallpaperMode } from '../../hooks/useWallpaperMode';
import { CORNERS, WIDGETS } from '../../wallpaper/config';
import {
  ClockWidget, WorldClockWidget, CalendarWidget, MusicWidget, WeatherWidget, ProgressWidget,
} from './widgets';

/**
 * Wallpaper mode: the desktop as a background dashboard for Plash.
 *
 * Everything that makes the OS an OS is absent — boot, login, dock, menu bar, icons, windows,
 * screensaver, toasts, sound. What is left is the wallpaper and widgets pinned to the four corners,
 * because the corners are what stays visible around normally sized windows on a Mac. The middle of
 * the screen is deliberately empty.
 *
 * Inside Plash the page receives no input (unless Plash's browsing mode is on), so nothing here
 * depends on a click. In a normal browser it is a preview: Esc, the right-click menu or the pill at
 * the top leave it.
 */

const MENU_ID = 'wallpaper-context-menu';

const WIDGET_COMPONENTS = {
  clock: ClockWidget,
  worldclock: WorldClockWidget,
  calendar: CalendarWidget,
  music: MusicWidget,
  weather: WeatherWidget,
  progress: ProgressWidget,
};
const GAP = 12;

/**
 * Safe areas for the parts of the screen macOS already owns: the menu bar (37pt on a notched
 * MacBook, so 40 clears it), and the Dock, unless the visitor keeps it hidden.
 */
const insets = (dock) => ({ top: 40, side: 20, bottom: dock === 'hidden' ? 20 : 92 });

/** Two voices (law 2), as one switch: see the variable list at the top of widgets.jsx. */
const STYLE_VARS = {
  tinted: {
    '--wp-label': 'var(--sdl-sec)',
    '--wp-mark': 'var(--sdl-aink)',
    '--wp-on-mark': 'var(--sdl-plane)',
    '--wp-track': 'rgb(var(--sdl-ink-rgb) / 0.12)',
  },
  color: {
    '--wp-label': 'var(--sdl-aink)',
    '--wp-mark': 'var(--sdl-accent)',
    '--wp-on-mark': 'var(--sdl-onAccent, var(--sdl-plane))',
    '--wp-track': 'var(--sdl-soft)',
  },
};

/**
 * A corner's widgets as rows, Apple-style: a medium widget fills a row, two smalls share one. The
 * first widget in the list sits nearest the corner, so bottom stacks build upward and right stacks
 * build leftward.
 */
function rowsOf(ids) {
  const rows = [];
  let pending = null;
  for (const id of ids) {
    if (WIDGETS[id].size === 'medium') {
      if (pending) { rows.push([pending]); pending = null; }
      rows.push([id]);
    } else if (pending) {
      rows.push([pending, id]);
      pending = null;
    } else {
      pending = id;
    }
  }
  if (pending) rows.push([pending]);
  return rows;
}

const Corner = ({ corner, ids, inset, now, prefs }) => {
  if (!ids.length) return null;
  const top = corner[0] === 't';
  const left = corner[1] === 'l';
  return (
    <div
      className="absolute flex overflow-hidden"
      style={{
        [top ? 'top' : 'bottom']: top ? inset.top : inset.bottom,
        [left ? 'left' : 'right']: inset.side,
        flexDirection: top ? 'column' : 'column-reverse',
        alignItems: left ? 'flex-start' : 'flex-end',
        gap: GAP,
        // Never past the middle of the screen, so a top and a bottom stack cannot collide.
        maxHeight: `calc(50vh - ${(top ? inset.top : inset.bottom) + GAP / 2}px)`,
      }}
    >
      {rowsOf(ids).map((row) => (
        <div key={row.join()} className="flex shrink-0" style={{ gap: GAP, flexDirection: left ? 'row' : 'row-reverse' }}>
          {row.map((id) => {
            const Widget = WIDGET_COMPONENTS[id];
            return <Widget key={id} now={now} prefs={prefs} />;
          })}
        </div>
      ))}
    </div>
  );
};

/**
 * The way out, for the browser preview only. Shown on arrival and on pointer movement, gone after
 * three seconds of stillness, so a screenshot of the preview matches what Plash shows.
 */
const ExitPill = ({ top, copied, onCopy }) => {
  const [visible, setVisible] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    let lastArm = 0;
    const arm = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), 3000);
    };
    // Re-armed at most once a second: pointermove fires at pointer rate.
    const onMove = () => {
      setVisible(true);
      const now = Date.now();
      if (now - lastArm < 1000) return;
      lastArm = now;
      arm();
    };
    arm();
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  const button = 'px-3 h-8 rounded-full text-[12px] focus-visible:outline-none focus-visible:ring-2 transition-colors duration-hover ease-sdl';
  return (
    <div
      className="glass-2 lift absolute left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-full transition-opacity duration-pane ease-sdl"
      style={{ top, opacity: visible || copied ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      onFocus={() => setVisible(true)}
    >
      <span className="px-3 text-[12px]" style={{ color: 'var(--sdl-sec)', fontWeight: 600 }} aria-live="polite">
        {copied === 'ok' ? 'Plash URL copied' : copied === 'failed' ? 'Couldn’t copy. Use the address bar.' : 'Wallpaper mode · Esc to exit'}
      </span>
      <button type="button" onClick={onCopy} className={button} style={{ color: 'var(--sdl-ink)', fontWeight: 600, background: 'var(--sdl-sunken)' }}>
        Copy Plash URL
      </button>
      <button type="button" onClick={exitWallpaperMode} className={button} style={{ color: 'var(--sdl-aink)', fontWeight: 650, background: 'var(--sdl-soft)' }}>
        Exit
      </button>
    </div>
  );
};

const WallpaperMode = ({ mode, fallbackWallpaper }) => {
  const { prefs, theme, plash } = mode;
  // One minute tick for every widget, rather than a timer per widget.
  const now = useMinuteClock();
  const inset = insets(prefs.dock);
  const { show } = useContextMenu({ id: MENU_ID });
  const [copied, setCopied] = useState(null); // null | 'ok' | 'failed' — announced by the pill

  // In the browser the address bar IS the Plash URL: entering the mode navigated to it.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
    setTimeout(() => setCopied(null), 2500);
  };

  // Plash reads no keys and shows no menu of ours; its browsing mode has its own right-click menu.
  const interactive = !plash;

  useEffect(() => {
    if (!interactive) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') exitWallpaperMode(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [interactive]);

  const openSettings = () => {
    exitWallpaperMode();
    useOSStore.getState().openSettingsTab('wallpaper');
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden relative select-none font-sans"
      style={STYLE_VARS[prefs.style]}
      onContextMenu={interactive ? (e) => { e.preventDefault(); show({ event: e }); } : undefined}
    >
      <h1 className="sr-only">Lumina wallpaper</h1>
      <LiveWallpaper override={theme.wallpaper ?? fallbackWallpaper} />

      {CORNERS.map((corner) => (
        <Corner key={corner} corner={corner} ids={prefs.layout[corner]} inset={inset} now={now} prefs={prefs} />
      ))}

      {interactive && (
        <>
          <ExitPill top={inset.top} copied={copied} onCopy={copy} />
          <Menu id={MENU_ID} animation="fade" className="os-context-menu">
            <MenuRow icon={Copy} label="Copy Plash URL" onClick={copy} />
            <MenuRow icon={SettingsIcon} label="Wallpaper Settings…" onClick={openSettings} />
            <Separator />
            <MenuRow icon={LogOut} label="Exit Wallpaper Mode" onClick={exitWallpaperMode} />
          </Menu>
        </>
      )}
    </div>
  );
};

export default WallpaperMode;
