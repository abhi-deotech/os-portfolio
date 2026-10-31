import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { Card, Segmented, Row, Slider, Switch } from './primitives';
import { enterWallpaperMode } from '../../hooks/useWallpaperMode';
import {
  WIDGETS, MAX_ZONES, MAX_LINKS, MAX_MAC_APPS, MAX_SHORTCUTS, MAX_PROJECTS, PROJECT_EDITORS, sanitizeWidgets, safeHttpUrl,
  sanitizeMacApp, sanitizeShortcut, sanitizeProject, projectName, sanitizeCalKey, buildWallpaperUrl, resolveUnit,
} from '../../wallpaper/config';
import { fetchAgenda, localDay } from '../../wallpaper/agenda';
import { fetchClickup } from '../../wallpaper/clickup';
import { fetchBattery, powerChecklist, minutesText, tempText, BATTERY_RELAY } from '../../wallpaper/battery';
import { MAC_APPS, WEB_LINKS, LUMINA_APPS, MAX_TILES, SEARCH_ENGINES, OPEN_SHORTCUT, PROJECT_EDITOR_NAMES } from '../../wallpaper/launchers';
import { APP_BY_ID } from '../../config/apps';
import { cityOf } from '../../wallpaper/time';
import { searchPlaces } from '../../wallpaper/weather';
import { isCustomWallpaper } from '../../theme/wallpapers';

/**
 * Settings → Wallpaper mode. Everything chosen here is written into the Plash URL; Plash keeps the
 * URL it was given, so a change only reaches it once the URL is copied across again. Opened over the
 * wallpaper itself, changes show at once (WallpaperMode writes them into the page's URL), and Plash's
 * "Update Website to Current" keeps them.
 */

const Btn = ({ children, onClick, primary = false, disabled = false, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className="px-4 rounded-full text-[12px] shrink-0 transition-colors duration-hover ease-sdl focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
    style={{
      height: 'var(--sdl-control-h, 36px)',
      background: primary ? 'var(--sdl-accent)' : 'var(--sdl-sunken)',
      color: primary ? 'var(--sdl-onAccent, var(--sdl-plane))' : 'var(--sdl-ink)',
      fontWeight: 650,
    }}
  >
    {children}
  </button>
);

const fieldStyle = {
  height: 'var(--sdl-control-h, 36px)',
  background: 'var(--sdl-sunken)',
  color: 'var(--sdl-ink)',
  border: '1px solid var(--sdl-glass-border)',
};

const ZONES = (() => {
  try { return Intl.supportedValuesOf('timeZone'); } catch { return []; }
})();

const WallpaperTab = () => {
  const prefs = useOSStore((s) => s.wallpaperPrefs);
  const setPrefs = useOSStore((s) => s.setWallpaperPrefs);
  const colorway = useOSStore((s) => s.colorway);
  const wallpaper = useOSStore((s) => s.wallpaper);

  const appearance = { colorway, wallpaper };
  const preview = () => {
    // Come back to this pane when the preview ends (see the tab request in Settings.jsx).
    useOSStore.setState({ settingsTab: { tab: 'wallpaper' } });
    enterWallpaperMode(prefs, appearance);
  };
  const url = buildWallpaperUrl(prefs, appearance);
  const widgets = sanitizeWidgets(prefs.widgets);

  const [copied, setCopied] = useState(null);
  // Any change makes a previously copied URL stale, so the "Copied" note goes with it.
  const set = (patch) => { setPrefs(patch); setCopied(null); };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied('Copied. Paste it into Plash.');
    } catch {
      setCopied('Couldn’t copy. Select the address and copy it yourself.');
    }
  };

  /* Layout: shown widgets in column order first, then the hidden ones in catalogue order. */
  const ordered = [...widgets, ...Object.keys(WIDGETS).filter((id) => !widgets.includes(id))];
  const toggleWidget = (id, on) => set({ widgets: on ? [...widgets, id] : widgets.filter((w) => w !== id) });
  const moveWidget = (id, delta) => {
    const i = widgets.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= widgets.length) return;
    const next = [...widgets];
    [next[i], next[j]] = [next[j], next[i]];
    set({ widgets: next });
  };

  /* Apps: one list of `kind:id` tiles, plus the visitor's own links, Mac apps, shortcuts and project
     folders, capped together. */
  const shortcuts = prefs.shortcuts ?? [];
  const projects = prefs.projects ?? [];
  const tileCount = prefs.tiles.length + prefs.links.length + prefs.macApps.length + shortcuts.length + projects.length;
  const toggleTile = (id) => {
    if (prefs.tiles.includes(id)) set({ tiles: prefs.tiles.filter((t) => t !== id) });
    else if (tileCount < MAX_TILES) set({ tiles: [...prefs.tiles, id] });
  };
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const linkHref = safeHttpUrl(linkUrl.trim()) ?? safeHttpUrl(`https://${linkUrl.trim()}`);
  const canAddLink = linkName.trim() && linkHref && prefs.links.length < MAX_LINKS && tileCount < MAX_TILES;
  const addLink = (e) => {
    e.preventDefault();
    if (!canAddLink) return;
    set({ links: [...prefs.links, { name: linkName.trim().slice(0, 24), href: linkHref }] });
    setLinkName('');
    setLinkUrl('');
  };

  const [macName, setMacName] = useState('');
  const macApp = sanitizeMacApp(macName);
  const canAddMac = macApp && !prefs.macApps.includes(macApp) && prefs.macApps.length < MAX_MAC_APPS && tileCount < MAX_TILES;
  const addMac = (e) => {
    e.preventDefault();
    if (!canAddMac) return;
    set({ macApps: [...prefs.macApps, macApp] });
    setMacName('');
  };

  const [scName, setScName] = useState('');
  const shortcut = sanitizeShortcut(scName);
  const canAddShortcut = shortcut && !shortcuts.includes(shortcut) && shortcuts.length < MAX_SHORTCUTS && tileCount < MAX_TILES;
  const addShortcut = (e) => {
    e.preventDefault();
    if (!canAddShortcut) return;
    set({ shortcuts: [...shortcuts, shortcut] });
    setScName('');
  };

  const [projPath, setProjPath] = useState('');
  const [projEditor, setProjEditor] = useState('cursor');
  const project = sanitizeProject({ editor: projEditor, path: projPath });
  const canAddProject = project && !projects.some((p) => p.path === project.path) && projects.length < MAX_PROJECTS && tileCount < MAX_TILES;
  const addProject = (e) => {
    e.preventDefault();
    if (!canAddProject) return;
    set({ projects: [...projects, project] });
    setProjPath('');
  };

  /* World clocks */
  const [zoneInput, setZoneInput] = useState('');
  const zoneValid = ZONES.includes(zoneInput) && !prefs.zones.includes(zoneInput);
  const addZone = (e) => {
    e.preventDefault();
    if (!zoneValid || prefs.zones.length >= MAX_ZONES) return;
    set({ zones: [...prefs.zones, zoneInput] });
    setZoneInput('');
  };

  /* Weather place */
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = not searched; [] = nothing found
  const [searchState, setSearchState] = useState('idle'); // 'idle' | 'busy' | 'failed'
  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchState('busy');
    try {
      setResults(await searchPlaces(query.trim()));
      setSearchState('idle');
    } catch {
      setSearchState('failed');
    }
  };
  const choosePlace = (p) => {
    set({ place: { name: p.name, lat: p.lat, lon: p.lon } });
    setResults(null);
    setQuery('');
  };

  /* Agenda: the key, and a real round trip to /api/calendar to say whether it works. */
  const [check, setCheck] = useState(null); // null | 'busy' | a result from fetchAgenda
  const checkCalendar = async () => {
    setCheck('busy');
    setCheck(await fetchAgenda(prefs.calKey, localDay(new Date())));
  };
  const checkText = (c) => {
    if (c === 'busy') return 'Checking…';
    if (c.status === 'ok') return `Connected. ${c.events.length === 1 ? '1 event' : `${c.events.length} events`} today.`;
    if (c.status === 'rejected') return 'The server rejected this key. It must match WALLPAPER_KEY in Vercel.';
    if (c.status === 'unconfigured') return 'Key accepted, but the server has no CALENDAR_ICS_URLS yet.';
    return 'Couldn’t load the calendar. Is the site deployed with both environment variables?';
  };

  /* ClickUp: the same key, and a real round trip to /api/clickup. */
  const [cuCheck, setCuCheck] = useState(null); // null | 'busy' | a result from fetchClickup
  const checkClickup = async () => {
    setCuCheck('busy');
    setCuCheck(await fetchClickup(prefs.calKey, localDay(new Date())));
  };
  const clickupText = (c) => {
    if (c === 'busy') return 'Checking…';
    if (c.status === 'ok') return `Connected. ${c.tasks.length === 1 ? '1 task' : `${c.tasks.length} tasks`} due this week${c.timer ? `, timer running on “${c.timer.name}”` : ''}.`;
    if (c.status === 'rejected') return 'The server rejected the key above. It must match WALLPAPER_KEY in Vercel.';
    if (c.status === 'unconfigured') return 'Key accepted, but the server has no CLICKUP_TOKEN yet.';
    if (c.status === 'limited') return 'ClickUp is rate-limiting this token. Try again in a minute.';
    return 'Couldn’t reach ClickUp. Check CLICKUP_TOKEN (and CLICKUP_TEAM_ID, if set) in Vercel.';
  };

  /* Battery: a real round trip to battery-guard's relay on this Mac, and its power-settings checklist. */
  const [batCheck, setBatCheck] = useState(null); // null | 'busy' | a result from fetchBattery
  const [copiedFix, setCopiedFix] = useState(null);
  const checkBattery = async () => {
    setBatCheck('busy');
    setBatCheck(await fetchBattery());
  };
  const batteryText = (c) => {
    if (c === 'busy') return 'Checking…';
    if (c.status === 'ok') {
      const r = c.reading;
      const time = r.minutes ? `, ${minutesText(r.minutes)} ${r.ac ? 'to go' : 'left'}` : '';
      const temp = r.tempC === null ? '' : `, ${tempText(r.tempC, resolveUnit(prefs.unit))}`;
      return `Connected. ${r.pct}% ${r.ac ? 'on the adapter' : 'on battery'}${time}${temp}.`;
    }
    if (c.status === 'unreachable') return 'Couldn’t reach battery-guard. Is it running, and is its certificate trusted? Opening the address in step 3 shows which.';
    return 'battery-guard answered, but not in a shape this page can read. Update both to the latest version.';
  };
  const copyFix = async (item) => {
    try {
      await navigator.clipboard.writeText(item.fix);
      setCopiedFix(item.id);
    } catch {
      setCopiedFix(`${item.id}:failed`);
    }
    setTimeout(() => setCopiedFix(null), 2500);
  };
  const checklist = batCheck?.status === 'ok' ? powerChecklist(batCheck.reading) : [];
  const code = 'font-mono text-[12px]';

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="mb-1" style={{ color: 'var(--sdl-ink)', fontSize: 34, fontWeight: 650, letterSpacing: '-0.02em', fontFamily: 'var(--sdl-font-title)' }}>
        Wallpaper mode
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--sdl-sec)' }}>
        A quiet dashboard for your Mac&apos;s desktop: one column of widgets beside your Dock, with search, your apps and a to-do list.
        Made for <a href="https://sindresorhus.com/plash" target="_blank" rel="noreferrer" style={{ color: 'var(--sdl-aink)', fontWeight: 600 }}>Plash</a>.
      </p>

      <Card title="Use it" sub="Preview it here, or copy the URL into Plash. Plash keeps the URL it was given, so copy it again after any change.">
        <div className="flex flex-wrap items-center gap-2">
          <Btn primary onClick={preview}>Preview here</Btn>
          <Btn onClick={copy}>Copy Plash URL</Btn>
          {copied && <span className="text-[12px]" role="status" style={{ color: 'var(--sdl-sec)' }}>{copied}</span>}
        </div>
        <input
          readOnly
          value={url}
          aria-label="Plash URL"
          onFocus={(e) => e.target.select()}
          className="mt-3 w-full px-3 rounded-sdl-sm text-[12px] font-mono focus-visible:outline-none focus-visible:ring-2"
          style={fieldStyle}
        />
        {isCustomWallpaper(wallpaper) && (
          <p className="text-[12px] mt-2" style={{ color: 'var(--sdl-sec)' }}>
            Your uploaded wallpaper stays in this browser, so Plash shows the colorway&apos;s own background instead.
          </p>
        )}
        {prefs.calKey && (
          <p className="text-[12px] mt-2" style={{ color: 'var(--sdl-sec)' }}>
            This URL contains your calendar key, so anyone who has it can read today&apos;s event titles. Keep it to yourself.
          </p>
        )}
      </Card>

      <Card
        title="Your Mac"
        sub="Tell it what macOS already puts on screen, so the widgets stay out of its way."
      >
        <Row title="Dock" sub="Where your Dock lives. Hidden leaves the edge free.">
          <Segmented label="Dock position" value={prefs.dock} options={[{ id: 'right', name: 'Right' }, { id: 'bottom', name: 'Bottom' }, { id: 'left', name: 'Left' }, { id: 'hidden', name: 'Hidden' }]} onChange={(v) => set({ dock: v })} />
        </Row>
        <Row title="Stage Manager" sub="Keeps the left edge free for its strip of running apps.">
          <Switch label="Stage Manager" checked={prefs.stage === 'on'} onChange={(on) => set({ stage: on ? 'on' : 'off' })} />
        </Row>
        <Row title="Widget column" sub="The edge the widgets hug. Extra widgets start a second column further in.">
          <Segmented label="Widget column side" value={prefs.side} options={[{ id: 'right', name: 'Right' }, { id: 'left', name: 'Left' }]} onChange={(v) => set({ side: v })} />
        </Row>
      </Card>

      <Card title="Widgets" sub="Switch widgets on, and order them top to bottom. Two small widgets share a row.">
        {ordered.map((id) => {
          const on = widgets.includes(id);
          const i = widgets.indexOf(id);
          const { name, size } = WIDGETS[id];
          const arrow = 'w-8 h-8 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 disabled:opacity-30';
          return (
            <Row key={id} title={name} sub={size[0].toUpperCase() + size.slice(1)}>
              <div className="flex items-center gap-1">
                {on && (
                  <>
                    <button type="button" aria-label={`Move ${name} up`} disabled={i === 0} onClick={() => moveWidget(id, -1)} className={arrow} style={{ color: 'var(--sdl-sec)', background: 'var(--sdl-sunken)' }}>
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" aria-label={`Move ${name} down`} disabled={i === widgets.length - 1} onClick={() => moveWidget(id, 1)} className={arrow} style={{ color: 'var(--sdl-sec)', background: 'var(--sdl-sunken)' }}>
                      <ArrowDown size={14} />
                    </button>
                  </>
                )}
                <span className="ml-2"><Switch label={`Show ${name}`} checked={on} onChange={(v) => toggleWidget(id, v)} /></span>
              </div>
            </Row>
          );
        })}
      </Card>

      <Card title="Apps" sub={`Up to ${MAX_TILES} tiles. In Plash, turn on Browsing Mode to click them.`} right={<span className="text-[12px] tabular-nums" style={{ color: 'var(--sdl-sec)' }}>{tileCount} / {MAX_TILES}</span>}>
        {[
          ['Mac apps', Object.entries(MAC_APPS).map(([k, a]) => [`mac:${k}`, a.name])],
          ['Websites', Object.entries(WEB_LINKS).map(([k, w]) => [`web:${k}`, w.name])],
          ['Lumina apps', LUMINA_APPS.map((k) => [`app:${k}`, APP_BY_ID[k]?.title ?? k])],
        ].map(([group, items]) => (
          <div key={group} className="mb-4">
            <h4 className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--sdl-sec)', fontWeight: 650 }}>{group}</h4>
            <div className="flex flex-wrap gap-2">
              {items.map(([id, name]) => {
                const on = prefs.tiles.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    disabled={!on && tileCount >= MAX_TILES}
                    onClick={() => toggleTile(id)}
                    className="h-8 px-3 rounded-full text-[12px] transition-colors duration-hover ease-sdl focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40"
                    style={{
                      background: on ? 'var(--sdl-soft)' : 'var(--sdl-sunken)',
                      color: on ? 'var(--sdl-aink)' : 'var(--sdl-sec)',
                      boxShadow: on ? 'var(--sdl-hairline)' : 'none',
                      fontWeight: 600,
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <h4 className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--sdl-sec)', fontWeight: 650 }}>Your links</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          {prefs.links.map((l) => (
            <span key={l.href} className="inline-flex items-center gap-1 pl-3 pr-1 h-8 rounded-full text-[12px]" style={{ background: 'var(--sdl-soft)', color: 'var(--sdl-aink)', fontWeight: 600 }}>
              {l.name}
              <button type="button" aria-label={`Remove ${l.name}`} onClick={() => set({ links: prefs.links.filter((x) => x.href !== l.href) })} className="w-6 h-6 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        {prefs.links.length < MAX_LINKS && (
          <form onSubmit={addLink} className="flex flex-wrap gap-2">
            <input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="Jira" aria-label="Link name" className="w-32 px-3 rounded-sdl-sm text-[13px] focus-visible:outline-none focus-visible:ring-2" style={fieldStyle} />
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="example.atlassian.net" aria-label="Link address" className="flex-1 min-w-[180px] px-3 rounded-sdl-sm text-[13px] focus-visible:outline-none focus-visible:ring-2" style={fieldStyle} />
            <Btn type="submit" disabled={!canAddLink}>Add link</Btn>
          </form>
        )}
        <h4 className="text-[11px] uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--sdl-sec)', fontWeight: 650 }}>Any Mac app</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          {prefs.macApps.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 pl-3 pr-1 h-8 rounded-full text-[12px]" style={{ background: 'var(--sdl-soft)', color: 'var(--sdl-aink)', fontWeight: 600 }}>
              {name}
              <button type="button" aria-label={`Remove ${name}`} onClick={() => set({ macApps: prefs.macApps.filter((x) => x !== name) })} className="w-6 h-6 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        {prefs.macApps.length < MAX_MAC_APPS && (
          <form onSubmit={addMac} className="flex flex-wrap gap-2">
            <input value={macName} onChange={(e) => setMacName(e.target.value)} placeholder="Finder" aria-label="Mac app name" className="flex-1 min-w-[180px] px-3 rounded-sdl-sm text-[13px] focus-visible:outline-none focus-visible:ring-2" style={fieldStyle} />
            <Btn type="submit" disabled={!canAddMac}>Add app</Btn>
          </form>
        )}
        <p className="text-[11px] mt-2" style={{ color: 'var(--sdl-sec)' }}>
          For apps with no link of their own, like Finder, Safari, Notes or Calendar. Type the name as it appears in your Applications folder, and set up the &ldquo;{OPEN_SHORTCUT}&rdquo; shortcut once (see Set up Plash below).
        </p>
        <h4 className="text-[11px] uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--sdl-sec)', fontWeight: 650 }}>Your shortcuts</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          {shortcuts.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 pl-3 pr-1 h-8 rounded-full text-[12px]" style={{ background: 'var(--sdl-soft)', color: 'var(--sdl-aink)', fontWeight: 600 }}>
              {name}
              <button type="button" aria-label={`Remove ${name}`} onClick={() => set({ shortcuts: shortcuts.filter((x) => x !== name) })} className="w-6 h-6 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        {shortcuts.length < MAX_SHORTCUTS && (
          <form onSubmit={addShortcut} className="flex flex-wrap gap-2">
            <input value={scName} onChange={(e) => setScName(e.target.value)} placeholder="Start focus block" aria-label="Shortcut name" className="flex-1 min-w-[180px] px-3 rounded-sdl-sm text-[13px] focus-visible:outline-none focus-visible:ring-2" style={fieldStyle} />
            <Btn type="submit" disabled={!canAddShortcut}>Add shortcut</Btn>
          </form>
        )}
        <p className="text-[11px] mt-2" style={{ color: 'var(--sdl-sec)' }}>
          Runs any shortcut from the Shortcuts app by its exact name, so one tile can set a Focus, open a note, start a timer or switch Plash to another layout.
        </p>

        <h4 className="text-[11px] uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--sdl-sec)', fontWeight: 650 }}>Projects</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          {projects.map((p) => (
            <span key={p.path} title={p.path} className="inline-flex items-center gap-1 pl-3 pr-1 h-8 rounded-full text-[12px]" style={{ background: 'var(--sdl-soft)', color: 'var(--sdl-aink)', fontWeight: 600 }}>
              {projectName(p.path)} · {PROJECT_EDITOR_NAMES[p.editor]}
              <button type="button" aria-label={`Remove ${projectName(p.path)}`} onClick={() => set({ projects: projects.filter((x) => x.path !== p.path) })} className="w-6 h-6 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        {projects.length < MAX_PROJECTS && (
          <form onSubmit={addProject} className="flex flex-wrap gap-2">
            <input value={projPath} onChange={(e) => setProjPath(e.target.value)} placeholder="/Users/you/Projects/site" aria-label="Project folder path" spellCheck={false} className="flex-1 min-w-[220px] px-3 rounded-sdl-sm text-[13px] font-mono focus-visible:outline-none focus-visible:ring-2" style={fieldStyle} />
            <Segmented label="Open projects in" value={projEditor} options={PROJECT_EDITORS.map((id) => ({ id, name: PROJECT_EDITOR_NAMES[id] }))} onChange={setProjEditor} />
            <Btn type="submit" disabled={!canAddProject}>Add project</Btn>
          </form>
        )}
        <p className="text-[11px] mt-2" style={{ color: 'var(--sdl-sec)' }}>
          Opens a folder straight in your editor. In Finder, select the folder and press Option-Command-C to copy its path. The path is part of the Plash URL, so keep that URL to yourself.
        </p>

        <p className="text-[11px] mt-3" style={{ color: 'var(--sdl-sec)' }}>
          Mac apps open through the link each app registers, so they need the app installed. Lumina apps open as windows over the wallpaper. The Apps button above the widgets lists every app.
        </p>
      </Card>

      <Card title="Look and format">
        <Row title="Search with">
          <Segmented label="Search engine" value={prefs.engine} options={Object.entries(SEARCH_ENGINES).map(([id, e]) => ({ id, name: e.name }))} onChange={(v) => set({ engine: v })} />
        </Row>
        <Row title="Clock">
          <Segmented label="Clock format" value={prefs.hour} options={[{ id: 'auto', name: 'Auto' }, { id: '12', name: '12-hour' }, { id: '24', name: '24-hour' }]} onChange={(v) => set({ hour: v })} />
        </Row>
        <Row title="Style" sub="Tinted keeps widgets monochrome with one accent, like macOS desktop widgets.">
          <Segmented label="Widget style" value={prefs.style} options={[{ id: 'tinted', name: 'Tinted' }, { id: 'color', name: 'Full colour' }]} onChange={(v) => set({ style: v })} />
        </Row>
        <Row title="Temperature">
          <Segmented label="Temperature unit" value={prefs.unit} options={[{ id: 'auto', name: 'Auto' }, { id: 'c', name: '°C' }, { id: 'f', name: '°F' }]} onChange={(v) => set({ unit: v })} />
        </Row>
        <div className="pt-2">
          <Slider label="Brightness" value={prefs.bright} onChange={(v) => set({ bright: Math.max(30, v) })} />
          <p className="text-[11px] mt-1" style={{ color: 'var(--sdl-sec)' }}>
            Starts dimmer than the desktop: a wallpaper is looked past all day. Lowest is 30%.
          </p>
        </div>
      </Card>

      <Card title="World clocks" sub={`Up to ${MAX_ZONES} cities.`}>
        <div className="flex flex-wrap gap-2 mb-3">
          {prefs.zones.length === 0 && <span className="text-[12px]" style={{ color: 'var(--sdl-sec)' }}>No cities yet.</span>}
          {prefs.zones.map((z) => (
            <span key={z} className="inline-flex items-center gap-1 pl-3 pr-1 h-8 rounded-full text-[12px]" style={{ background: 'var(--sdl-soft)', color: 'var(--sdl-aink)', fontWeight: 600 }}>
              {cityOf(z)}
              <button
                type="button"
                aria-label={`Remove ${cityOf(z)}`}
                onClick={() => set({ zones: prefs.zones.filter((x) => x !== z) })}
                className="w-6 h-6 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        {prefs.zones.length < MAX_ZONES && (
          <form onSubmit={addZone} className="flex gap-2">
            <input
              list="wp-zones"
              value={zoneInput}
              onChange={(e) => setZoneInput(e.target.value)}
              placeholder="Asia/Tokyo"
              aria-label="Time zone"
              className="flex-1 px-3 rounded-sdl-sm text-[13px] focus-visible:outline-none focus-visible:ring-2"
              style={fieldStyle}
            />
            <datalist id="wp-zones">
              {ZONES.map((z) => <option key={z} value={z} />)}
            </datalist>
            <Btn type="submit" disabled={!zoneValid}>Add</Btn>
          </form>
        )}
      </Card>

      <Card
        title="Weather"
        sub="Pick a place for the weather widget. Nothing is shown until you do."
        right={prefs.place && <Btn onClick={() => set({ place: null })}>Clear</Btn>}
      >
        {prefs.place && (
          <p className="text-[13px] mb-3" style={{ color: 'var(--sdl-ink)', fontWeight: 600 }}>
            {prefs.place.name} <span style={{ color: 'var(--sdl-sec)', fontWeight: 500 }}>· {prefs.place.lat.toFixed(2)}, {prefs.place.lon.toFixed(2)}</span>
          </p>
        )}
        <form onSubmit={search} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bengaluru"
            aria-label="Search for a place"
            className="flex-1 px-3 rounded-sdl-sm text-[13px] focus-visible:outline-none focus-visible:ring-2"
            style={fieldStyle}
          />
          <Btn type="submit" disabled={searchState === 'busy'}>{searchState === 'busy' ? 'Searching…' : 'Search'}</Btn>
        </form>
        <div role="status" className="text-[12px] mt-2" style={{ color: 'var(--sdl-sec)' }}>
          {searchState === 'failed' && 'Couldn’t reach Open-Meteo. Try again in a moment.'}
          {searchState === 'idle' && results?.length === 0 && 'No places found.'}
        </div>
        {results?.length > 0 && (
          <ul className="mt-1 space-y-1">
            {results.map((p) => (
              <li key={`${p.lat},${p.lon}`}>
                <button
                  type="button"
                  onClick={() => choosePlace(p)}
                  className="w-full text-left px-3 py-2 rounded-sdl-sm text-[13px] transition-colors duration-hover ease-sdl hover:bg-veil/5 focus-visible:outline-none focus-visible:ring-2"
                  style={{ color: 'var(--sdl-ink)', fontWeight: 600 }}
                >
                  {p.name} <span style={{ color: 'var(--sdl-sec)', fontWeight: 500 }}>{p.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] mt-3" style={{ color: 'var(--sdl-sec)' }}>
          Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--sdl-aink)' }}>Open-Meteo</a> (CC BY 4.0).
        </p>
      </Card>

      <Card
        title="Agenda"
        sub="Today's events from your own calendar, with countdowns. The site reads your calendar on its server, so the calendar's private link never reaches this page or Plash."
      >
        <ol className="list-decimal pl-5 space-y-1.5 text-[13px] mb-4" style={{ color: 'var(--sdl-ink)' }}>
          <li>
            Copy your calendar&apos;s private iCal link. Google Calendar: Settings → your calendar → &ldquo;Secret address in iCal format&rdquo;.
            Outlook: Settings → Calendar → Shared calendars → Publish a calendar → ICS.
          </li>
          <li>
            In Vercel, open the project → Settings → Environment Variables. Add <code className="font-mono text-[12px]">CALENDAR_ICS_URLS</code> (one
            link, or several separated by commas) and <code className="font-mono text-[12px]">WALLPAPER_KEY</code> (any long random text, e.g. from{' '}
            <code className="font-mono text-[12px]">openssl rand -hex 24</code>). Then redeploy.
          </li>
          <li>Paste the same key below, switch on the Agenda widget, and copy the Plash URL again.</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <input
            type="password"
            value={prefs.calKey}
            onChange={(e) => { set({ calKey: sanitizeCalKey(e.target.value) }); setCheck(null); }}
            placeholder="WALLPAPER_KEY"
            aria-label="Calendar key"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 min-w-[220px] px-3 rounded-sdl-sm text-[13px] font-mono focus-visible:outline-none focus-visible:ring-2"
            style={fieldStyle}
          />
          <Btn onClick={checkCalendar} disabled={!prefs.calKey || check === 'busy'}>Check connection</Btn>
        </div>
        <div role="status" className="text-[12px] mt-2" style={{ color: 'var(--sdl-sec)' }}>
          {check && checkText(check)}
        </div>
      </Card>

      <Card
        title="ClickUp"
        sub="Your ClickUp tasks due this week, overdue first: tick them off and start or stop ClickUp's timer from the wallpaper. The site talks to ClickUp on its server, so your ClickUp token never reaches this page or Plash."
      >
        <ol className="list-decimal pl-5 space-y-1.5 text-[13px] mb-4" style={{ color: 'var(--sdl-ink)' }}>
          <li>
            In ClickUp, open your avatar → Settings → Apps and generate a personal API token (it starts with <code className="font-mono text-[12px]">pk_</code>).
            It can do anything you can in ClickUp, so keep it only in Vercel.
          </li>
          <li>
            In Vercel, add <code className="font-mono text-[12px]">CLICKUP_TOKEN</code>. If you&apos;re in more than one Workspace, also add{' '}
            <code className="font-mono text-[12px]">CLICKUP_TEAM_ID</code> (the number after <code className="font-mono text-[12px]">app.clickup.com/</code> in
            your Workspace&apos;s address). Then redeploy. It uses the same <code className="font-mono text-[12px]">WALLPAPER_KEY</code> as the Agenda, set above.
          </li>
          <li>Switch on the ClickUp widget, and copy the Plash URL again.</li>
        </ol>
        <Row title="Show tasks due today on the Agenda" sub="Tasks with a due time join the timeline with a countdown; tasks due today with no time join the all-day line.">
          <Switch label="Show ClickUp tasks on the Agenda" checked={Boolean(prefs.clickup)} onChange={(on) => set({ clickup: on })} />
        </Row>
        <div className="flex flex-wrap gap-2 mt-3">
          <Btn onClick={checkClickup} disabled={!prefs.calKey || cuCheck === 'busy'}>Check connection</Btn>
        </div>
        <div role="status" className="text-[12px] mt-2" style={{ color: 'var(--sdl-sec)' }}>
          {!prefs.calKey ? 'Add the key in the Agenda card above first.' : cuCheck && clickupText(cuCheck)}
        </div>
      </Card>

      <Card
        title="Battery"
        sub="This Mac's battery against your charging rules: where it sits between 20% and 80%, heat, capacity and the routines that are due. It comes from battery-guard, a small background helper on your Mac that also sends the plug-in, Charge Limit and heat alerts."
      >
        <ol className="list-decimal pl-5 space-y-1.5 text-[13px] mb-4" style={{ color: 'var(--sdl-ink)' }}>
          <li>
            Install it: run <code className={code}>~/Projects/battery-optimization/bin/install.sh</code>. It builds the helper, makes its
            certificate and starts it at every login. No admin rights.
          </li>
          <li>
            Trust its certificate once, with the <code className={code}>security add-trusted-cert</code> command the installer prints (macOS asks
            for your password). This page is https, and Safari&apos;s engine only lets it read a helper on your Mac that has a trusted certificate.
          </li>
          <li>
            Check it: open{' '}
            <a href={BATTERY_RELAY.replace('/v1/battery', '/')} target="_blank" rel="noreferrer" style={{ color: 'var(--sdl-aink)', fontWeight: 600 }}>
              https://127.0.0.1:47380
            </a>
            . It should load with no certificate warning.
          </li>
          <li>Switch it on below, add the Battery widgets, and copy the Plash URL again.</li>
        </ol>
        <Row title="battery-guard runs on this Mac" sub="Only then does the page ask your Mac for its battery. Visitors' browsers never do.">
          <Switch label="battery-guard runs on this Mac" checked={prefs.battery} onChange={(on) => { set({ battery: on }); setBatCheck(null); }} />
        </Row>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Btn onClick={checkBattery} disabled={batCheck === 'busy'}>Check connection</Btn>
        </div>
        <div role="status" className="text-[12px] mt-2" style={{ color: 'var(--sdl-sec)' }}>
          {batCheck && batteryText(batCheck)}
        </div>
        {checklist.length > 0 && (
          <div className="mt-4">
            <h4 className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--sdl-sec)', fontWeight: 650 }}>Power settings</h4>
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2 text-[13px]" style={{ color: 'var(--sdl-ink)' }}>
                  <span style={{ color: item.ok ? 'var(--sdl-sec)' : 'var(--sdl-warn)', fontWeight: 650 }}>{item.ok ? 'Set' : 'Not set'}</span>
                  <span className="flex-1 min-w-[160px]">
                    {item.label}
                    <span className="block text-[12px]" style={{ color: 'var(--sdl-sec)' }}>{item.why}</span>
                  </span>
                  {!item.ok && (
                    <>
                      <code className={code} style={{ color: 'var(--sdl-sec)' }}>{item.fix}</code>
                      <Btn onClick={() => copyFix(item)}>
                        {copiedFix === item.id ? 'Copied' : copiedFix === `${item.id}:failed` ? 'Copy failed' : 'Copy'}
                      </Btn>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-[12px] mt-2" style={{ color: 'var(--sdl-sec)' }}>
              These need admin rights, so paste them into Terminal yourself. The Charge Limit and Optimized Battery Charging can&apos;t be read:
              check them in{' '}
              <a href="x-apple.systempreferences:com.apple.Battery-Settings.extension" style={{ color: 'var(--sdl-aink)', fontWeight: 600 }}>
                System Settings → Battery
              </a>
              .
            </p>
          </div>
        )}
      </Card>

      <Card title="Set up Plash">
        <ol className="list-decimal pl-5 space-y-1.5 text-[13px]" style={{ color: 'var(--sdl-ink)' }}>
          <li>Install <a href="https://sindresorhus.com/plash" target="_blank" rel="noreferrer" style={{ color: 'var(--sdl-aink)', fontWeight: 600 }}>Plash</a> from the Mac App Store.</li>
          <li>Copy the Plash URL above and add it as a website in Plash.</li>
          <li>Bind a shortcut to Plash&apos;s &ldquo;Toggle Browsing Mode&rdquo;. While it&apos;s on you can search, open apps, join calls, tick off tasks and get back to the desktop; while it&apos;s off, clicks go to your Mac. The Done button at the top of the widgets turns it off again.</li>
          <li>In Plash&apos;s settings, turn on &ldquo;Open external links in default browser&rdquo;. Without it, Mac app tiles can&apos;t open apps and websites open inside Plash.</li>
          <li>
            For &ldquo;Any Mac app&rdquo;: in the Shortcuts app, make a shortcut named &ldquo;{OPEN_SHORTCUT}&rdquo; with one &ldquo;Run Shell Script&rdquo; action,
            set to pass its input as arguments, containing <code className="font-mono text-[12px]">open -a &quot;$1&quot;</code>. Then allow it under Shortcuts → Settings → Advanced → Allow Running Scripts.
          </li>
          <li>Settings changed while the wallpaper shows apply at once. To keep them in Plash, right-click the wallpaper in Browsing Mode and choose &ldquo;Update Website to Current&rdquo;.</li>
          <li>Optional: reload every few hours. &ldquo;Deactivate while on battery&rdquo; saves a little power, but hides the Battery widgets exactly when they matter.</li>
          <li>Skip Plash&apos;s &ldquo;Invert colors&rdquo;. Pick a dark colorway in Appearance instead.</li>
        </ol>
        <p className="text-[12px] mt-3" style={{ color: 'var(--sdl-sec)' }}>
          The URL carries your colorway, wallpaper and everything on this page. Every widget works in Plash, which runs
          Safari&apos;s engine: none of them rely on Chrome-only features. The Battery widgets also need battery-guard running on this Mac. Plash marks the page it shows, so even the
          plain site address opens in wallpaper mode there, with the default layout.
        </p>
      </Card>
    </div>
  );
};

export default WallpaperTab;
