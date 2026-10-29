import React, { useState, useMemo } from 'react';
import { Music, MapPin, Search, Plus, X, Globe, Check, CalendarDays } from 'lucide-react';
import AppIcon from '../common/AppIcon';
import { APP_BY_ID } from '../../config/apps';
import { openLuminaApp } from '../../hooks/useWallpaperMode';
import { MAC_APPS, WEB_LINKS, MAX_TILES, SEARCH_ENGINES, MAC_LINK_TARGET, isKnownTile, macAppHref } from '../../wallpaper/launchers';
import { SIZE_PX } from '../../wallpaper/config';
import useVisiblePoll from '../../hooks/useVisiblePoll';
import { getNowPlaying } from '../../utils/musicApi';
import { fetchWeather, describeCode } from '../../wallpaper/weather';
import { fetchAgenda, agendaView, untilText, localDay } from '../../wallpaper/agenda';
import { resolveUnit } from '../../wallpaper/config';
import {
  formatter, timeParts, zoneRelation, cityOf, isoWeek, dayOfYear, daysInYear, dayFraction,
  firstDayOfWeek, monthGrid, weekdayInitials,
} from '../../wallpaper/time';

/**
 * Wallpaper widgets, after Apple's desktop widgets: Apple's three sizes plus a slim search bar, one
 * job each, no chrome. The glance widgets never need a click. The working ones (search, apps, to-do,
 * notes) take clicks in a browser, and in Plash while its Browsing Mode is on; `interactive` says
 * which, so they never show an input that cannot be reached.
 *
 * Colour goes through four variables set by the dashboard root (see WallpaperMode.jsx), so the
 * tinted and full-colour styles are one switch rather than a branch in every widget:
 *   --wp-label    quiet chrome voice (law 2): the small headings
 *   --wp-mark     the single accent touch: today, the progress arc
 *   --wp-on-mark  text sitting on --wp-mark
 *   --wp-track    the empty part of a ring
 */

const SIZES = SIZE_PX;

/** SF Rounded where it exists (macOS, i.e. Plash), the colorway's own face elsewhere. */
const ROUNDED = 'ui-rounded, var(--sdl-font-title), system-ui, sans-serif';

const Shell = ({ size, label, children, pad = 16 }) => (
  <section
    aria-label={label}
    // glass-2 rather than glass: over a photo wallpaper the 5% glass fill disappears, and these
    // cards have nothing behind them but the wallpaper.
    className="glass-2 lift flex flex-col overflow-hidden"
    style={{ ...SIZES[size], borderRadius: size === 'bar' ? 18 : 22, padding: pad, color: 'var(--sdl-ink)' }}
  >
    {children}
  </section>
);

const Label = ({ children, style }) => (
  <span className="block truncate" style={{ fontSize: 13, fontWeight: 650, color: 'var(--wp-label)', ...style }}>
    {children}
  </span>
);

const Sub = ({ children, style }) => (
  <span className="block truncate" style={{ fontSize: 12, fontWeight: 550, color: 'var(--sdl-sec)', ...style }}>
    {children}
  </span>
);

/* ── Clock ─────────────────────────────────────────────────────────────────── */

export const ClockWidget = ({ now, prefs }) => {
  const { digits, period } = timeParts(now, prefs.hour);
  const weekday = formatter('wday', { weekday: 'long' }).format(now);
  const date = formatter('mdl', { month: 'long', day: 'numeric' }).format(now);
  // Small, beside the weather: the menu bar already carries the time, so this one is for reading
  // across the room, not for being the biggest thing on the desktop.
  return (
    <Shell size="small" label="Clock">
      <Label>{weekday}</Label>
      <div className="flex items-baseline gap-1 flex-1 min-h-0 mt-1" style={{ fontFamily: ROUNDED }}>
        <span className="tabular-nums" style={{ fontSize: period ? 38 : 46, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          {digits}
        </span>
        {period && <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--sdl-sec)' }}>{period}</span>}
      </div>
      <Sub>{date}</Sub>
      <Sub style={{ fontSize: 11 }}>Week {isoWeek(now)}</Sub>
    </Shell>
  );
};

/* ── World clocks ──────────────────────────────────────────────────────────── */

const relationText = ({ hours, dayDiff }) => {
  const day = dayDiff > 0 ? 'Tomorrow' : dayDiff < 0 ? 'Yesterday' : 'Today';
  if (hours === 0) return day;
  return `${day}, ${hours > 0 ? '+' : '−'}${Math.abs(hours)}h`;
};

export const WorldClockWidget = ({ now, prefs }) => (
  <Shell size="small" label="World clocks">
    {prefs.zones.length === 0 ? (
      <Sub style={{ whiteSpace: 'normal' }}>Add cities in Settings → Wallpaper mode.</Sub>
    ) : (
      // Evenly spaced, not justified to the edges: two cities pinned to the top and bottom read as
      // two unrelated lists.
      <div className="flex flex-col justify-evenly h-full">
        {prefs.zones.map((zone) => {
          const { digits, period } = timeParts(now, prefs.hour, zone);
          return (
            <div key={zone} className="flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <span className="block truncate" style={{ fontSize: 13, fontWeight: 650 }}>{cityOf(zone)}</span>
                <Sub style={{ fontSize: 11 }}>{relationText(zoneRelation(now, zone))}</Sub>
              </div>
              <span className="tabular-nums shrink-0" style={{ fontFamily: ROUNDED, fontSize: 18, fontWeight: 600 }}>
                {digits}
                {period && <span style={{ fontSize: 11, color: 'var(--sdl-sec)', marginLeft: 2 }}>{period}</span>}
              </span>
            </div>
          );
        })}
      </div>
    )}
  </Shell>
);

/* ── Calendar ──────────────────────────────────────────────────────────────── */

export const CalendarWidget = ({ now }) => {
  const firstDay = useMemo(() => firstDayOfWeek(), []);
  const initials = useMemo(() => weekdayInitials(firstDay), [firstDay]);
  // Re-derived only when the date changes, not on every minute tick.
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `dayKey` is the date `now` carries
  const rows = useMemo(() => monthGrid(now, firstDay), [dayKey, firstDay]);
  const today = now.getDate();
  const month = formatter('mon', { month: 'long' }).format(now);

  return (
    <Shell size="small" label="Calendar">
      <Label style={{ color: 'var(--wp-mark)', textTransform: 'uppercase', fontSize: 11, lineHeight: '16px', letterSpacing: '0.04em' }}>
        {month}
      </Label>
      <div
        className="grid flex-1 tabular-nums text-center mt-0.5"
        style={{ gridTemplateColumns: 'repeat(7, 1fr)', alignContent: 'space-between', fontSize: 11 }}
      >
        {initials.map((d, i) => (
          <span key={`h${i}`} style={{ fontWeight: 650, color: 'var(--sdl-sec)' }}>{d}</span>
        ))}
        {rows.flat().map((d, i) => (
          <span
            key={i}
            aria-current={d === today ? 'date' : undefined}
            className="mx-auto flex items-center justify-center rounded-full"
            style={{
              // 16px cells: seven rows (initials + up to six weeks) have to fit the small widget's 132px.
              width: 16, height: 16, lineHeight: '16px', fontWeight: d === today ? 700 : 550,
              background: d === today ? 'var(--wp-mark)' : 'transparent',
              color: d === today ? 'var(--wp-on-mark)' : 'var(--sdl-ink)',
            }}
          >
            {d ?? ''}
          </span>
        ))}
      </div>
    </Shell>
  );
};

/* ── Now playing ───────────────────────────────────────────────────────────── */

/** `getNowPlaying` answers "Offline" when there is no key or no scrobble; that is "nothing", not a track. */
const isRealTrack = (t) => t && !(t.title === 'Offline' && !t.isNowPlaying && !t.cover);

export const MusicWidget = () => {
  const [track, setTrack] = useState(undefined); // undefined = not asked yet; null = nothing playing
  useVisiblePoll(async () => {
    const t = await getNowPlaying();
    setTrack(isRealTrack(t) ? t : null);
  }, 60_000);

  return (
    <Shell size="medium" label="Now playing">
      <div className="flex gap-4 h-full items-center min-w-0">
        <div
          className="shrink-0 flex items-center justify-center overflow-hidden"
          style={{ width: 112, height: 112, borderRadius: 14, background: 'var(--wp-track)' }}
        >
          {track?.cover
            ? <img src={track.cover} alt="" className="w-full h-full object-cover" />
            : <Music size={32} style={{ color: 'var(--sdl-sec)' }} aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <Label>{track?.isNowPlaying ? 'Now playing' : track ? 'Last played' : 'Now playing'}</Label>
          {track ? (
            <>
              <span className="line-clamp-2" style={{ fontSize: 16, fontWeight: 650, lineHeight: 1.25 }}>{track.title}</span>
              <Sub>{track.artist}</Sub>
              <Sub style={{ fontSize: 11, marginTop: 4 }}>via Last.fm</Sub>
            </>
          ) : (
            <Sub>{track === null ? 'Nothing playing right now' : ' '}</Sub>
          )}
        </div>
      </div>
    </Shell>
  );
};

/* ── Weather ───────────────────────────────────────────────────────────────── */

export const WeatherWidget = ({ prefs }) => {
  const { place } = prefs;
  const unit = resolveUnit(prefs.unit);
  const [state, setState] = useState({ data: null, error: false });
  const placeKey = place ? `${place.lat},${place.lon},${unit}` : '';

  useVisiblePoll(async () => {
    try {
      setState({ data: await fetchWeather(place, unit), error: false });
    } catch {
      setState((s) => ({ data: s.data, error: true }));
    }
  }, 30 * 60_000, Boolean(place), placeKey);

  if (!place) {
    return (
      <Shell size="small" label="Weather">
        <Label>Weather</Label>
        <div className="flex-1 flex flex-col justify-end gap-2">
          <MapPin size={22} style={{ color: 'var(--sdl-sec)' }} aria-hidden="true" />
          <Sub style={{ whiteSpace: 'normal' }}>Choose a place in Settings → Wallpaper mode.</Sub>
        </div>
      </Shell>
    );
  }

  const { data, error } = state;
  const { label, Icon } = data ? describeCode(data.code, data.isDay) : { label: '', Icon: null };
  return (
    <Shell size="small" label={`Weather in ${place.name}`}>
      <div className="flex items-start justify-between gap-2">
        <Label>{place.name}</Label>
        {Icon && <Icon size={22} style={{ color: 'var(--wp-mark)', flexShrink: 0 }} aria-hidden="true" />}
      </div>
      {data ? (
        <>
          <span className="tabular-nums flex-1" style={{ fontFamily: ROUNDED, fontSize: 44, fontWeight: 600, lineHeight: 1.1 }}>
            {data.temp}°
          </span>
          <span className="block truncate" style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
          <Sub>H:{data.high}° L:{data.low}°</Sub>
        </>
      ) : (
        <Sub style={{ marginTop: 'auto' }}>{error ? 'Weather unavailable' : ' '}</Sub>
      )}
    </Shell>
  );
};

/* ── Day and year ──────────────────────────────────────────────────────────── */

const Ring = ({ value, caption }) => {
  const r = 24;
  const c = 2 * Math.PI * r;
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="60" height="60" viewBox="0 0 60 60" role="img" aria-label={`${caption} ${pct}% done`}>
        <circle cx="30" cy="30" r={r} fill="none" strokeWidth="6" style={{ stroke: 'var(--wp-track)' }} />
        <circle
          cx="30" cy="30" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${c * value} ${c}`} transform="rotate(-90 30 30)"
          style={{ stroke: 'var(--wp-mark)' }}
        />
        <text x="30" y="34.5" textAnchor="middle" style={{ fill: 'var(--sdl-ink)', fontSize: 13, fontWeight: 650, fontFamily: ROUNDED }}>
          {pct}%
        </text>
      </svg>
      <Sub style={{ fontSize: 11 }}>{caption}</Sub>
    </div>
  );
};

export const ProgressWidget = ({ now }) => {
  const doy = dayOfYear(now);
  const total = daysInYear(now.getFullYear());
  return (
    <Shell size="small" label="Day and year progress">
      <Label>Day {doy} of {total}</Label>
      <div className="flex-1 flex items-center justify-around">
        <Ring value={dayFraction(now)} caption="Today" />
        <Ring value={(doy - 1 + dayFraction(now)) / total} caption={String(now.getFullYear())} />
      </div>
    </Shell>
  );
};

/* ── Agenda ────────────────────────────────────────────────────────────────── */

const AGENDA_NOTES = {
  nokey: 'Connect your calendar in Settings → Wallpaper mode.',
  rejected: 'The calendar key was rejected. Check it in Settings → Wallpaper mode.',
  unconfigured: 'No calendar on the server yet. See Settings → Wallpaper mode.',
  error: 'Calendar unavailable right now.',
};

const eventTime = (date, hour) => {
  const { digits, period } = timeParts(date, hour);
  return period ? `${digits} ${period}` : digits;
};

/**
 * Today's next events from the visitor's own calendar, read through /api/calendar so the calendar's
 * secret feed link never reaches the page. Countdowns come from the shared minute tick; the feed is
 * asked again every 5 minutes while the page is visible, and at once when the date changes.
 */
export const AgendaWidget = ({ now, prefs }) => {
  const { calKey, hour } = prefs;
  const day = localDay(now);
  const [state, setState] = useState({ status: 'loading' });

  useVisiblePoll(async () => {
    const next = await fetchAgenda(calKey, day);
    // A network blip keeps the last good list up rather than blanking the card.
    setState((prev) => (next.status === 'error' && prev.status === 'ok' && prev.day === day ? prev : { ...next, day }));
  }, 5 * 60_000, Boolean(calKey), `${calKey}|${day}`);

  const status = calKey ? state.status : 'nokey';
  const { allDay, rows } = status === 'ok' ? agendaView(state.events, now) : { allDay: [], rows: [] };

  return (
    <Shell size="medium" label="Agenda" pad={14}>
      <div className="flex items-baseline justify-between gap-3 min-w-0">
        <Label style={{ flexShrink: 0 }}>Today</Label>
        {allDay.length > 0 && (
          <Sub style={{ fontSize: 11 }}>{allDay.length > 1 ? `${allDay[0]} +${allDay.length - 1}` : allDay[0]}</Sub>
        )}
      </div>
      {AGENDA_NOTES[status] ? (
        <div className="flex-1 flex flex-col justify-end gap-2">
          <CalendarDays size={22} style={{ color: 'var(--sdl-sec)' }} aria-hidden="true" />
          <Sub style={{ whiteSpace: 'normal' }}>{AGENDA_NOTES[status]}</Sub>
        </div>
      ) : (
        <ul className="mt-1.5 flex-1 min-h-0 flex flex-col gap-0.5">
          {status === 'ok' && rows.length === 0 && <li><Sub>Nothing else today.</Sub></li>}
          {rows.map((e) => (
            <li
              key={`${e.title}|${e.start.toISOString()}`}
              className="grid items-center gap-2 rounded-lg min-w-0"
              style={{
                gridTemplateColumns: '64px minmax(0, 1fr) auto',
                height: 30,
                padding: '0 8px',
                margin: '0 -8px',
                background: e.kind === 'now' ? 'var(--wp-track)' : 'transparent',
                boxShadow: e.kind === 'now' ? 'inset 3px 0 0 var(--wp-mark)' : 'none',
              }}
            >
              <span className="tabular-nums truncate" style={{ fontSize: 12, fontWeight: 600, color: 'var(--sdl-sec)' }}>
                {eventTime(e.start, hour)}
              </span>
              <span className="truncate" style={{ fontSize: 13, fontWeight: e.kind === 'later' ? 550 : 650 }}>{e.title}</span>
              <span
                className="tabular-nums whitespace-nowrap"
                style={{ fontSize: 11, fontWeight: 650, color: e.kind === 'later' ? 'var(--sdl-sec)' : 'var(--wp-mark)' }}
              >
                {e.kind === 'now' ? `until ${eventTime(e.end, hour)}` : e.kind === 'next' ? `in ${untilText(e.minutes)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
};

/* ── Local state for the working widgets ───────────────────────────────────── */

/**
 * localStorage, not the OS store: inside Plash this is Plash's own storage, so a list kept on the
 * wallpaper stays on the wallpaper, and nothing here leaks into the visitor's desktop settings.
 * Reads and writes are guarded — storage can be absent or full, and the widget must still render.
 */
function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });
  const set = (next) => {
    setValue(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* still works for this session */ }
  };
  return [value, set];
}

const field = {
  background: 'var(--sdl-sunken)',
  color: 'var(--sdl-ink)',
  border: '1px solid var(--sdl-glass-border)',
};
const ring = 'focus-visible:outline-none focus-visible:ring-2';

/* ── Search ────────────────────────────────────────────────────────────────── */

/**
 * The search goes out as a clicked link, not a form submission. Plash hands clicked links to another
 * host to the default browser (with "Open external links in default browser" on), but opens a form
 * submission in a window of its own.
 */
function openSearch(e, engine) {
  e.preventDefault();
  const q = new FormData(e.currentTarget).get(engine.param)?.toString().trim();
  if (!q) return;
  const a = document.createElement('a');
  a.href = `${engine.action}?${new URLSearchParams({ [engine.param]: q })}`;
  a.target = '_blank';
  a.rel = 'noreferrer';
  a.click();
  e.currentTarget.reset();
}

export const SearchWidget = ({ prefs, interactive }) => {
  const engine = SEARCH_ENGINES[prefs.engine] ?? SEARCH_ENGINES.google;
  return (
    <Shell size="bar" label="Search" pad={8}>
      <form onSubmit={(e) => openSearch(e, engine)} className="flex items-center gap-2 h-full px-2">
        <Search size={18} style={{ color: 'var(--wp-label)', flexShrink: 0 }} aria-hidden="true" />
        <input
          name={engine.param}
          type="search"
          required
          disabled={!interactive}
          placeholder={`Search ${engine.name}`}
          aria-label={`Search ${engine.name}`}
          autoComplete="off"
          className={`flex-1 min-w-0 bg-transparent text-[15px] ${ring} rounded-md px-1 disabled:cursor-default`}
          style={{ color: 'var(--sdl-ink)', fontWeight: 550 }}
        />
      </form>
    </Shell>
  );
};

/* ── Apps ──────────────────────────────────────────────────────────────────── */

const favicon = (host) => `https://icons.duckduckgo.com/ip3/${host}.ico`;

/** A favicon, or the fallback glyph once it fails to load. */
export const SiteIcon = ({ host, Fallback = Globe }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !host) return <Fallback size={24} style={{ color: 'var(--wp-label)' }} aria-hidden="true" />;
  return <img src={favicon(host)} alt="" width={28} height={28} className="rounded-md" onError={() => setFailed(true)} />;
};

/** A Mac app known only by name has no icon a page can fetch; its initial stands in. */
export const Monogram = ({ name }) => (
  <span
    aria-hidden="true"
    className="w-7 h-7 rounded-md flex items-center justify-center"
    style={{ background: 'var(--wp-track)', color: 'var(--sdl-ink)', fontSize: 14, fontWeight: 700 }}
  >
    {name.slice(0, 1).toUpperCase()}
  </span>
);

function resolveTiles(prefs) {
  const tiles = prefs.tiles.filter(isKnownTile).map((id) => {
    const [kind, key] = id.split(':');
    if (kind === 'mac') {
      const a = MAC_APPS[key];
      return { id, name: a.name, href: a.href, icon: <SiteIcon host={a.site} Fallback={a.Icon} /> };
    }
    if (kind === 'web') {
      const w = WEB_LINKS[key];
      return { id, name: w.name, href: w.href, external: true, icon: <SiteIcon host={new URL(w.href).host} /> };
    }
    const app = APP_BY_ID[key];
    return app && { id, name: app.title, lumina: key, icon: <AppIcon app={app} size={20} pad={5} tile animate={false} /> };
  });
  const links = prefs.links.map((l) => ({
    id: `link:${l.href}`, name: l.name, href: l.href, external: true, icon: <SiteIcon host={new URL(l.href).host} />,
  }));
  const macApps = prefs.macApps.map((name) => ({
    id: `mac-any:${name}`, name, href: macAppHref(name), icon: <Monogram name={name} />,
  }));
  return [...tiles, ...macApps, ...links].filter(Boolean).slice(0, MAX_TILES);
}

export const AppsWidget = ({ prefs, interactive, plash }) => {
  const tiles = useMemo(() => resolveTiles(prefs), [prefs]);
  const tile = `flex flex-col items-center justify-center gap-1 rounded-xl min-w-0 transition-colors duration-hover ease-sdl ${interactive ? 'hover:bg-veil/10' : ''} ${ring}`;
  const label = (name) => (
    <span className="block w-full truncate text-center" style={{ fontSize: 11, fontWeight: 600, color: 'var(--sdl-ink)' }}>{name}</span>
  );
  return (
    <Shell size="medium" label="Apps" pad={10}>
      {tiles.length === 0 ? (
        <Sub style={{ whiteSpace: 'normal', padding: 6 }}>Pick apps and links in Settings → Wallpaper mode.</Sub>
      ) : (
        <div className="grid h-full" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, 1fr)', gap: 4 }}>
          {tiles.map((t) => (t.lumina ? (
            <button key={t.id} type="button" tabIndex={interactive ? 0 : -1} title={`Open ${t.name}`} onClick={() => openLuminaApp(t.lumina)} className={tile}>
              {t.icon}{label(t.name)}
            </button>
          ) : (
            <a
              key={t.id}
              href={t.href}
              tabIndex={interactive ? 0 : -1}
              title={t.name}
              {...(t.external ? { target: '_blank', rel: 'noreferrer' } : plash ? { target: MAC_LINK_TARGET } : {})}
              className={tile}
            >
              {t.icon}{label(t.name)}
            </a>
          )))}
        </div>
      )}
    </Shell>
  );
};

/* ── To-do ─────────────────────────────────────────────────────────────────── */

export const TodoWidget = ({ interactive }) => {
  const [items, setItems] = useLocalState('lumina.wallpaper.todo', []);
  const [draft, setDraft] = useState('');
  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  const add = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setItems([...items, { id: Date.now(), text: text.slice(0, 140), done: false }]);
    setDraft('');
  };
  const toggle = (id) => setItems(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const remove = (id) => setItems(items.filter((i) => i.id !== id));

  return (
    <Shell size="large" label="To-do">
      <div className="flex items-baseline justify-between gap-2">
        <Label>To-do</Label>
        <Sub style={{ fontSize: 11 }}>{open.length ? `${open.length} left` : items.length ? 'All done' : ''}</Sub>
      </div>
      {interactive && (
        <form onSubmit={add} className="flex gap-2 mt-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a task"
            aria-label="New task"
            className={`flex-1 min-w-0 h-8 px-3 rounded-full text-[13px] ${ring}`}
            style={field}
          />
          <button type="submit" aria-label="Add task" className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${ring}`} style={{ background: 'var(--wp-mark)', color: 'var(--wp-on-mark)' }}>
            <Plus size={16} />
          </button>
        </form>
      )}
      <ul className="mt-2 flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-0.5">
        {items.length === 0 && (
          <li><Sub style={{ whiteSpace: 'normal' }}>{interactive ? 'Nothing yet.' : 'Nothing yet. Turn on Browsing Mode in Plash to add tasks.'}</Sub></li>
        )}
        {[...open, ...done].map((i) => (
          <li key={i.id} className="group flex items-center gap-2 min-h-[28px]">
            <button
              type="button"
              role="checkbox"
              aria-checked={i.done}
              aria-label={i.text}
              tabIndex={interactive ? 0 : -1}
              onClick={() => toggle(i.id)}
              className={`w-[18px] h-[18px] rounded-full shrink-0 flex items-center justify-center ${ring}`}
              style={{
                border: `2px solid ${i.done ? 'var(--wp-mark)' : 'var(--sdl-sec)'}`,
                background: i.done ? 'var(--wp-mark)' : 'transparent',
              }}
            >
              {i.done && <Check size={11} strokeWidth={3} style={{ color: 'var(--wp-on-mark)' }} aria-hidden="true" />}
            </button>
            <span
              className="flex-1 min-w-0 truncate text-[13px]"
              style={{ color: i.done ? 'var(--sdl-sec)' : 'var(--sdl-ink)', fontWeight: 550, textDecoration: i.done ? 'line-through' : 'none' }}
            >
              {i.text}
            </span>
            {interactive && (
              <button
                type="button"
                aria-label={`Delete ${i.text}`}
                onClick={() => remove(i.id)}
                className={`w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 ${ring}`}
                style={{ color: 'var(--sdl-sec)' }}
              >
                <X size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Shell>
  );
};

/* ── Today's one thing ─────────────────────────────────────────────────────── */

/**
 * One line, set in the morning and read all day. It belongs to the day it was written: once that has
 * passed it dims and says which day it was from, rather than pretending to still be today's.
 */
export const FocusWidget = ({ now, interactive }) => {
  const [focus, setFocus] = useLocalState('lumina.wallpaper.focus', { text: '', day: '' });
  const today = localDay(now);
  const stale = Boolean(focus.text) && focus.day !== today;
  const from = stale ? formatter('fday', { weekday: 'long' }).format(new Date(`${focus.day}T12:00`)) : '';
  const line = { fontFamily: 'var(--sdl-font-title)', fontSize: 22, fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.01em' };

  return (
    <Shell size="medium" label="Today’s one thing">
      <div className="flex items-baseline justify-between gap-2">
        <Label>Today’s one thing</Label>
        {stale && <Sub style={{ fontSize: 11 }}>From {from}</Sub>}
      </div>
      {interactive ? (
        <textarea
          value={focus.text}
          onChange={(e) => setFocus({ text: e.target.value.replace(/\n/g, ' ').slice(0, 120), day: localDay(new Date()) })}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
          placeholder="What matters most today?"
          aria-label="Today’s one thing"
          rows={3}
          className={`flex-1 mt-1 resize-none bg-transparent rounded-md ${ring}`}
          style={{ ...line, color: stale ? 'var(--sdl-sec)' : 'var(--sdl-ink)' }}
        />
      ) : (
        <p className="flex-1 mt-1 line-clamp-3" style={{ ...line, color: focus.text && !stale ? 'var(--sdl-ink)' : 'var(--sdl-sec)' }}>
          {focus.text || 'Turn on Browsing Mode in Plash to set it.'}
        </p>
      )}
    </Shell>
  );
};

/* ── Notes ─────────────────────────────────────────────────────────────────── */

export const NotesWidget = ({ interactive }) => {
  const [text, setText] = useLocalState('lumina.wallpaper.notes', '');
  return (
    <Shell size="medium" label="Notes">
      <Label>Notes</Label>
      {interactive ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          placeholder="Jot something down"
          aria-label="Notes"
          className={`flex-1 mt-1 resize-none bg-transparent text-[13px] leading-snug rounded-md ${ring}`}
          style={{ color: 'var(--sdl-ink)', fontWeight: 500 }}
        />
      ) : (
        <p className="flex-1 mt-1 text-[13px] leading-snug overflow-hidden whitespace-pre-wrap" style={{ color: text ? 'var(--sdl-ink)' : 'var(--sdl-sec)', fontWeight: 500 }}>
          {text || 'Nothing yet. Turn on Browsing Mode in Plash to write here.'}
        </p>
      )}
    </Shell>
  );
};
