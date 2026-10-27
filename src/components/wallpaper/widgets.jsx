import React, { useState, useMemo } from 'react';
import { Music, MapPin } from 'lucide-react';
import useVisiblePoll from '../../hooks/useVisiblePoll';
import { getNowPlaying } from '../../utils/musicApi';
import { fetchWeather, describeCode } from '../../wallpaper/weather';
import { resolveUnit } from '../../wallpaper/config';
import {
  formatter, timeParts, zoneRelation, cityOf, isoWeek, dayOfYear, daysInYear, dayFraction,
  firstDayOfWeek, monthGrid, weekdayInitials,
} from '../../wallpaper/time';

/**
 * Wallpaper widgets, after Apple's desktop widgets: two sizes, one glance each, no chrome, no
 * controls. They never take a click — inside Plash the page does not receive one.
 *
 * Colour goes through four variables set by the dashboard root (see WallpaperMode.jsx), so the
 * tinted and full-colour styles are one switch rather than a branch in every widget:
 *   --wp-label    quiet chrome voice (law 2): the small headings
 *   --wp-mark     the single accent touch: today, the progress arc
 *   --wp-on-mark  text sitting on --wp-mark
 *   --wp-track    the empty part of a ring
 */

const SIZES = { small: { width: 164, height: 164 }, medium: { width: 340, height: 164 } };

/** SF Rounded where it exists (macOS, i.e. Plash), the colorway's own face elsewhere. */
const ROUNDED = 'ui-rounded, var(--sdl-font-title), system-ui, sans-serif';

const Shell = ({ size, label, children }) => (
  <section
    aria-label={label}
    // glass-2 rather than glass: over a photo wallpaper the 5% glass fill disappears, and these
    // cards have nothing behind them but the wallpaper.
    className="glass-2 lift flex flex-col overflow-hidden"
    style={{ ...SIZES[size], borderRadius: 22, padding: 16, color: 'var(--sdl-ink)' }}
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
  return (
    <Shell size="medium" label="Clock">
      <Label>{weekday}</Label>
      <div className="flex items-baseline gap-2 flex-1 min-h-0" style={{ fontFamily: ROUNDED }}>
        <span className="tabular-nums" style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
          {digits}
        </span>
        {period && <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--sdl-sec)' }}>{period}</span>}
      </div>
      <Sub>{date} · Week {isoWeek(now)}</Sub>
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
