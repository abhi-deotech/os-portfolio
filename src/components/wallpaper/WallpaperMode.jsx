import React, { useEffect, useState } from 'react';
import { Menu, Separator, useContextMenu } from 'react-contexify';
import { Copy, Settings as SettingsIcon, Monitor } from 'lucide-react';
import LiveWallpaper from '../LiveWallpaper';
import MenuRow from '../common/MenuRow';
import useMinuteClock from '../../hooks/useMinuteClock';
import useOSStore from '../../store/osStore';
import { exitWallpaperMode } from '../../hooks/useWallpaperMode';
import { screenInsets } from '../../wallpaper/config';
import { packColumns, GAP } from '../../wallpaper/pack';
import {
  ClockWidget, WorldClockWidget, CalendarWidget, MusicWidget, WeatherWidget, ProgressWidget,
  SearchWidget, AppsWidget, TodoWidget, NotesWidget,
} from './widgets';

/**
 * Wallpaper mode: the desktop as a background dashboard for Plash.
 *
 * Everything that makes the OS an OS is absent — boot, login, dock, menu bar, icons, windows,
 * screensaver, toasts, sound. What is left is the wallpaper and one column of widgets hugging the edge
 * the visitor picked (by default the right, beside a right-hand Dock), clear of the menu bar, the
 * Dock and Stage Manager's strip of running apps on the left. The rest of the screen stays empty.
 *
 * Inside Plash the page only receives clicks while Plash's Browsing Mode is on (`interactive`). Then,
 * and always in a normal browser, a control at the head of the column leads back to the desktop.
 */

const MENU_ID = 'wallpaper-context-menu';

const WIDGET_COMPONENTS = {
  search: SearchWidget,
  clock: ClockWidget,
  apps: AppsWidget,
  todo: TodoWidget,
  notes: NotesWidget,
  calendar: CalendarWidget,
  weather: WeatherWidget,
  worldclock: WorldClockWidget,
  progress: ProgressWidget,
  music: MusicWidget,
};

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

/** Height of the control row above the column, when it shows. */
const CONTROL_H = 32;

function useViewportHeight() {
  const [h, setH] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => setH(window.innerHeight);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return h;
}

const Controls = ({ plash, copied, onCopy, onSettings, alignEnd }) => {
  const button = 'glass-2 h-8 px-3 rounded-full text-[12px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2';
  return (
    <div className={`flex items-center gap-1.5 ${alignEnd ? 'justify-end' : ''}`} style={{ height: CONTROL_H }}>
      <button type="button" onClick={exitWallpaperMode} className={button} style={{ color: 'var(--sdl-ink)', fontWeight: 650 }}>
        <Monitor size={14} aria-hidden="true" /> Desktop
      </button>
      <button type="button" onClick={onSettings} className={button} style={{ color: 'var(--sdl-ink)' }} aria-label="Wallpaper settings">
        <SettingsIcon size={14} aria-hidden="true" />
      </button>
      {/* The address bar is the Plash URL only in a browser; inside Plash there is nothing to copy. */}
      {!plash && (
        <button type="button" onClick={onCopy} className={button} style={{ color: 'var(--sdl-ink)', fontWeight: 600 }}>
          <Copy size={14} aria-hidden="true" /> {copied === 'ok' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Plash URL'}
        </button>
      )}
      <span className="sr-only" aria-live="polite">
        {copied === 'ok' ? 'Plash URL copied' : copied === 'failed' ? 'Couldn’t copy the Plash URL' : ''}
      </span>
    </div>
  );
};

const WallpaperMode = ({ mode, fallbackWallpaper }) => {
  const { prefs, theme, plash, interactive } = mode;
  // One minute tick for every widget, rather than a timer per widget.
  const now = useMinuteClock();
  const vh = useViewportHeight();
  const inset = screenInsets(prefs);
  const { show } = useContextMenu({ id: MENU_ID });
  const [copied, setCopied] = useState(null); // null | 'ok' | 'failed'

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
  const openSettings = () => {
    exitWallpaperMode();
    useOSStore.getState().openSettingsTab('wallpaper');
  };

  // Esc leaves, in a browser. Inside Plash the Desktop control does it, so a stray Esc while typing a
  // task in Browsing Mode cannot throw the wallpaper away.
  useEffect(() => {
    if (plash) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') exitWallpaperMode(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [plash]);

  const right = prefs.side === 'right';
  const edge = right ? 'right' : 'left';
  const top = inset.top + (interactive ? CONTROL_H + GAP : 0);
  const columns = packColumns(prefs.widgets, vh - top - inset.bottom);

  return (
    <div
      className="h-screen w-screen overflow-hidden relative select-none font-sans"
      style={STYLE_VARS[prefs.style]}
      onContextMenu={interactive ? (e) => { e.preventDefault(); show({ event: e }); } : undefined}
    >
      <h1 className="sr-only">Lumina wallpaper</h1>
      <LiveWallpaper override={theme.wallpaper ?? fallbackWallpaper} />

      {interactive && (
        <div className="absolute" style={{ top: inset.top, [edge]: inset[edge] }}>
          <Controls plash={plash} copied={copied} onCopy={copy} onSettings={openSettings} alignEnd={right} />
        </div>
      )}

      {/* Columns run from the edge inward: row-reverse on the right puts the first one nearest it. */}
      <div
        className="absolute flex items-start"
        style={{ top, [edge]: inset[edge], flexDirection: right ? 'row-reverse' : 'row', gap: GAP }}
      >
        {columns.map((rows, ci) => (
          <div key={ci} className="flex flex-col" style={{ gap: GAP, alignItems: right ? 'flex-end' : 'flex-start' }}>
            {rows.map((row) => (
              <div key={row.join()} className="flex" style={{ gap: GAP }}>
                {row.map((id) => {
                  const Widget = WIDGET_COMPONENTS[id];
                  return <Widget key={id} now={now} prefs={prefs} interactive={interactive} />;
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {interactive && (
        <Menu id={MENU_ID} animation="fade" className="os-context-menu">
          <MenuRow icon={Monitor} label="Back to Desktop" onClick={exitWallpaperMode} />
          <MenuRow icon={SettingsIcon} label="Wallpaper Settings…" onClick={openSettings} />
          {!plash && (
            <>
              <Separator />
              <MenuRow icon={Copy} label="Copy Plash URL" onClick={copy} />
            </>
          )}
        </Menu>
      )}
    </div>
  );
};

export default WallpaperMode;
