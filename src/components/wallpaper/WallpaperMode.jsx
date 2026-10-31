import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Menu, Separator, useContextMenu } from 'react-contexify';
import { AnimatePresence } from 'framer-motion';
import { Copy, Settings as SettingsIcon, Monitor, LayoutGrid, X, Check } from 'lucide-react';
import LiveWallpaper from '../LiveWallpaper';
import WindowSlot from '../WindowSlot';
import { WorkAreaContext } from '../workArea';
import MenuRow from '../common/MenuRow';
import AppLauncher from './AppLauncher';
import useMinuteClock from '../../hooks/useMinuteClock';
import useOSStore from '../../store/osStore';
import { exitWallpaperMode, openWallpaperSettings, replaceWallpaperSearch } from '../../hooks/useWallpaperMode';
import { screenInsets, buildWallpaperSearch, SIZE_PX } from '../../wallpaper/config';
import { packColumns, GAP } from '../../wallpaper/pack';
import { MAC_LINK_ATTR } from '../../wallpaper/launchers';
import {
  ClockWidget, WorldClockWidget, CalendarWidget, MusicWidget, WeatherWidget, ProgressWidget,
  SearchWidget, AppsWidget, TodoWidget, NotesWidget, AgendaWidget, FocusWidget, BatteryWidget, BatteryHealthWidget, ClickUpWidget,
} from './widgets';

/**
 * Wallpaper mode: the desktop as a background dashboard for Plash.
 *
 * The OS chrome is absent — boot, login, dock, menu bar, icons, screensaver, toasts, sound. What is
 * left is the wallpaper and one column of widgets hugging the edge the visitor picked (by default the
 * right, beside a right-hand Dock), clear of the menu bar, the Dock and Stage Manager's strip of
 * running apps on the left. The empty middle is the work area: Lumina's apps open there as windows,
 * so using one never means leaving the wallpaper.
 *
 * Inside Plash the page only receives clicks while Plash's Browsing Mode is on (`interactive`). Then,
 * and always in a normal browser, controls at the head of the column open any app, Settings, or lead
 * back to the desktop.
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
  agenda: AgendaWidget,
  clickup: ClickUpWidget,
  focus: FocusWidget,
  battery: BatteryWidget,
  batteryHealth: BatteryHealthWidget,
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

/** Room left between the widget column and the work area. */
const WORK_GAP = 24;

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

/**
 * Plash's own command for leaving Browsing Mode. It has to be a plain link: tested in Plash 2.17.4, the
 * same href aimed at a hidden iframe does nothing, while a top-level click
 * turns the mode off at once with no alert and no navigation away. The control row only renders while
 * the page is interactive, which inside Plash means Browsing Mode is on, so this only ever turns it off.
 */
const PLASH_DONE_HREF = 'plash:toggle-browsing-mode';

const Controls = ({ plash, copied, onCopy, launcherOpen, onLauncher, alignEnd }) => {
  const button = 'glass-2 h-8 px-3 rounded-full text-[12px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2';
  return (
    <div className={`flex items-center gap-1.5 ${alignEnd ? 'justify-end' : ''}`} style={{ height: CONTROL_H }}>
      <button type="button" onClick={exitWallpaperMode} className={button} style={{ color: 'var(--sdl-ink)', fontWeight: 650 }}>
        <Monitor size={14} aria-hidden="true" /> Desktop
      </button>
      <button
        type="button"
        data-launcher-toggle
        onClick={onLauncher}
        aria-expanded={launcherOpen}
        aria-controls="wallpaper-launcher"
        className={button}
        style={{ color: 'var(--sdl-ink)', fontWeight: 650, ...(launcherOpen ? { background: 'var(--wp-mark)', color: 'var(--wp-on-mark)' } : {}) }}
      >
        <LayoutGrid size={14} aria-hidden="true" /> Apps
      </button>
      <button type="button" onClick={openWallpaperSettings} className={button} style={{ color: 'var(--sdl-ink)' }} aria-label="Wallpaper settings">
        <SettingsIcon size={14} aria-hidden="true" />
      </button>
      {/* The address bar is the Plash URL only in a browser; inside Plash there is nothing to copy. */}
      {!plash && (
        <button type="button" onClick={onCopy} className={button} style={{ color: 'var(--sdl-ink)', fontWeight: 600 }}>
          <Copy size={14} aria-hidden="true" /> {copied === 'ok' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Plash URL'}
        </button>
      )}
      {plash && (
        <a
          href={PLASH_DONE_HREF}
          className={button}
          title="Turn off Browsing Mode"
          style={{ background: 'var(--wp-mark)', color: 'var(--wp-on-mark)', fontWeight: 650 }}
        >
          <Check size={14} aria-hidden="true" /> Done
        </a>
      )}
      <span className="sr-only" aria-live="polite">
        {copied === 'ok' ? 'Plash URL copied' : copied === 'failed' ? 'Couldn’t copy the Plash URL' : ''}
      </span>
    </div>
  );
};

const MAC_HINT_OFF = 'lumina.wallpaper.macHintOff';
const MAC_HINT_MS = 10000;

/**
 * Inside Plash a Mac app link only reaches macOS with "Open external links in default browser" on
 * (see MAC_LINK_ATTR in launchers.js), and the page cannot tell whether the app opened. So after a
 * Mac app click this says what to check, until the visitor turns the note off.
 */
function useMacLinkHint(plash) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!plash) return undefined;
    let timer;
    const onClick = (e) => {
      if (!e.target.closest?.(`a[${MAC_LINK_ATTR}]`)) return;
      try { if (localStorage.getItem(MAC_HINT_OFF)) return; } catch { /* no storage: show it */ }
      setShown(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShown(false), MAC_HINT_MS);
    };
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('click', onClick, true);
      clearTimeout(timer);
    };
  }, [plash]);
  const dismiss = (forGood) => {
    if (forGood) {
      try { localStorage.setItem(MAC_HINT_OFF, '1'); } catch { /* hides for this session only */ }
    }
    setShown(false);
  };
  return [shown, dismiss];
}

const MacLinkHint = ({ onDismiss }) => (
  <div
    role="status"
    className="glass-2 lift flex items-start gap-2"
    style={{ width: SIZE_PX.medium.width, borderRadius: 18, padding: '10px 10px 10px 14px', color: 'var(--sdl-ink)' }}
  >
    <div className="flex-1 min-w-0" style={{ fontSize: 12, fontWeight: 550, lineHeight: 1.4 }}>
      <p>
        Nothing opened? In Plash&apos;s settings, turn on &ldquo;Open external links in default browser&rdquo;.
        If it&apos;s on, check the app is installed.
      </p>
      <button
        type="button"
        onClick={() => onDismiss(true)}
        className="mt-1 rounded focus-visible:outline-none focus-visible:ring-2"
        style={{ color: 'var(--wp-label)', fontWeight: 650 }}
      >
        Don&apos;t show again
      </button>
    </div>
    <button
      type="button"
      onClick={() => onDismiss(false)}
      aria-label="Close"
      className="rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2"
      style={{ color: 'var(--sdl-sec)' }}
    >
      <X size={14} aria-hidden="true" />
    </button>
  </div>
);

/**
 * Keeps the store's `wallpaperPrefs` and the URL in step while the wallpaper shows, so Settings opened
 * over it edits what is on screen. URL → store when the page loads or the URL changes (in Plash the
 * store starts out with its own, unrelated values); store → URL when Settings changes something.
 *
 * Appearance too: a colorway or wallpaper named in the URL wins over the store's (App.jsx), so a pick in
 * Settings → Appearance would otherwise show as selected and change nothing on screen. A pick goes into
 * the URL like every other wallpaper setting; only the half that changed is written, so a URL without
 * `wp` keeps following the store's wallpaper. Inside Plash the URL's theme is also copied into the store
 * on load, so the picker starts on what the wallpaper shows. Plash's store belongs to the wallpaper; in
 * a browser the store is the visitor's own desktop look, so it is left alone there.
 */
function usePrefsSync(prefs, theme, plash) {
  const search = buildWallpaperSearch(prefs, theme);
  const latest = useRef({ prefs, theme });
  // Declared first, so it runs before the effects below read it.
  useEffect(() => { latest.current = { prefs, theme }; });

  useEffect(() => {
    const s = useOSStore.getState();
    if (buildWallpaperSearch(s.wallpaperPrefs, latest.current.theme) !== search) s.setWallpaperPrefs(latest.current.prefs);
  }, [search]);

  useEffect(() => {
    if (!plash) return;
    const s = useOSStore.getState();
    const patch = {};
    if (theme.colorway && theme.colorway !== s.colorway) patch.colorway = theme.colorway;
    if (theme.wallpaper && theme.wallpaper !== s.wallpaper) patch.wallpaper = theme.wallpaper;
    // setState rather than the setters: their Puter sync would push the wallpaper's look to the account.
    if (Object.keys(patch).length) useOSStore.setState(patch);
  }, [plash, theme.colorway, theme.wallpaper]);

  useEffect(() => useOSStore.subscribe((state, prev) => {
    const colorwayPicked = state.colorway !== prev.colorway;
    const wallpaperPicked = state.wallpaper !== prev.wallpaper;
    if (state.wallpaperPrefs === prev.wallpaperPrefs && !colorwayPicked && !wallpaperPicked) return;
    const url = latest.current.theme;
    const next = {
      colorway: colorwayPicked ? state.colorway : url.colorway,
      wallpaper: wallpaperPicked ? state.wallpaper : url.wallpaper,
    };
    if (next.colorway === url.colorway && next.wallpaper === url.wallpaper && state.wallpaperPrefs === prev.wallpaperPrefs) return;
    replaceWallpaperSearch(buildWallpaperSearch(state.wallpaperPrefs, next));
  }), []);
}

const WallpaperMode = ({ mode, fallbackWallpaper }) => {
  const { prefs, theme, plash, interactive } = mode;
  // One minute tick for every widget, rather than a timer per widget.
  const now = useMinuteClock();
  const { w: vw, h: vh } = useViewport();
  const inset = screenInsets(prefs);
  const { show } = useContextMenu({ id: MENU_ID });
  const [copied, setCopied] = useState(null); // null | 'ok' | 'failed'
  const [launcherOpen, setLauncherOpen] = useState(false);
  const closeLauncher = useCallback(() => setLauncherOpen(false), []);
  const openWindows = useOSStore((s) => s.openWindows);
  const minimizedWindows = useOSStore((s) => s.minimizedWindows);
  const windowsRef = useRef(null);
  const [macHint, dismissMacHint] = useMacLinkHint(plash);
  usePrefsSync(prefs, theme, plash);

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
  // Esc leaves, in a browser, when nothing else could want it: no window showing and nothing focused.
  // Inside Plash the Desktop control does it, so a stray Esc in Browsing Mode cannot throw the
  // wallpaper away.
  const windowShowing = openWindows.some((id) => !minimizedWindows.includes(id));
  useEffect(() => {
    if (plash || windowShowing) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented && document.activeElement === document.body) exitWallpaperMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [plash, windowShowing]);

  const right = prefs.side === 'right';
  const edge = right ? 'right' : 'left';
  const top = inset.top + (interactive ? CONTROL_H + GAP : 0);
  const columns = packColumns(prefs.widgets, vh - top - inset.bottom);

  // The work area: everything between the Mac's own chrome and the widget columns.
  const columnsWidth = columns.length * SIZE_PX.medium.width + (columns.length - 1) * GAP;
  const reserved = inset[edge] + columnsWidth + WORK_GAP;
  const area = {
    top: inset.top,
    bottom: inset.bottom,
    left: right ? inset.left : reserved,
    right: right ? reserved : inset.right,
  };
  area.width = Math.max(0, vw - area.left - area.right);
  area.height = Math.max(0, vh - area.top - area.bottom);

  // Right-click is ours only in a browser, and only on the wallpaper itself. Inside a window the app's
  // own menu (or the native one) applies; inside Plash its native menu stays, since that is where
  // "Update Website to Current" saves settings changed here.
  const onContextMenu = interactive && !plash ? (e) => {
    if (windowsRef.current?.contains(e.target) || e.target.closest?.('#wallpaper-launcher')) return;
    e.preventDefault();
    show({ event: e });
  } : undefined;

  return (
    <div
      className="h-screen w-screen overflow-hidden relative select-none font-sans"
      style={STYLE_VARS[prefs.style]}
      onContextMenu={onContextMenu}
    >
      <h1 className="sr-only">Lumina wallpaper</h1>
      <LiveWallpaper override={theme.wallpaper ?? fallbackWallpaper} interactive={interactive} area={area} prefs={prefs} />

      {interactive && (
        <div className="absolute" style={{ top: inset.top, [edge]: inset[edge] }}>
          <Controls
            plash={plash}
            copied={copied}
            onCopy={copy}
            launcherOpen={launcherOpen}
            onLauncher={() => setLauncherOpen((o) => !o)}
            alignEnd={right}
          />
        </div>
      )}

      {interactive && launcherOpen && (
        <div className="absolute z-20" style={{ top, [edge]: inset[edge] }}>
          <AppLauncher prefs={prefs} openWindows={openWindows} maxHeight={vh - top - inset.bottom} onClose={closeLauncher} />
        </div>
      )}

      {interactive && macHint && (
        <div className="absolute z-20" style={{ top, [edge]: inset[edge] }}>
          <MacLinkHint onDismiss={dismissMacHint} />
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
                  return <Widget key={id} now={now} prefs={prefs} interactive={interactive} plash={plash} />;
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Windows: Lumina's apps, centred in the work area and maximizing or snapping within it. */}
      <WorkAreaContext.Provider value={area}>
        <div
          ref={windowsRef}
          className="absolute z-10 pointer-events-none"
          style={{ top: area.top, bottom: area.bottom, left: area.left, right: area.right }}
        >
          <div className="relative w-full h-full pointer-events-none">
            <Suspense fallback={null}>
              <AnimatePresence>
                {openWindows.map((id) => (
                  <WindowSlot key={id} id={id} isMinimized={minimizedWindows.includes(id)} />
                ))}
              </AnimatePresence>
            </Suspense>
          </div>
        </div>
      </WorkAreaContext.Provider>

      {interactive && !plash && (
        <Menu id={MENU_ID} animation="fade" className="os-context-menu">
          <MenuRow icon={LayoutGrid} label="All Apps…" onClick={() => setLauncherOpen(true)} />
          <MenuRow icon={SettingsIcon} label="Wallpaper Settings…" onClick={openWallpaperSettings} />
          <Separator />
          <MenuRow icon={Monitor} label="Back to Desktop" onClick={exitWallpaperMode} />
          <MenuRow icon={Copy} label="Copy Plash URL" onClick={copy} />
        </Menu>
      )}
    </div>
  );
};

export default WallpaperMode;
