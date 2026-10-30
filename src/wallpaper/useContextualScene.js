import { useEffect, useMemo, useRef, useState } from 'react';
import useVisiblePoll from '../hooks/useVisiblePoll';
import { computeLightVector } from './solar';
import { fetchAgenda, localDay } from './agenda';

/**
 * What a relief wallpaper knows about the visitor's minute: where the light comes from, the weather
 * at the place they chose, how far through today's list they are, today's focus line and agenda.
 *
 * The place is only ever the one picked in Settings (prefs.place). With none, the sun follows the
 * local clock and there is no weather — nothing is guessed from the IP. The two network reads poll
 * every 15 minutes, only while the page is visible (useVisiblePoll), and only for the scene that
 * draws them: the weather for Topo, the agenda for Chrono. The light is every scene's.
 */

const POLL_MS = 15 * 60_000;
const TODO_KEY = 'lumina.wallpaper.todo';
const FOCUS_KEY = 'lumina.wallpaper.focus';

/** A JSON value from localStorage, or null when it is absent, unreadable or storage is off. */
function readStored(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Share of TodoWidget's tasks that are done, 0..1; null when there are none. */
export function todoRatioOf(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.filter((t) => t?.done).length / list.length;
}

/** FocusWidget's line, but only on the day it was written: yesterday's focus is not today's. */
export function focusTextOf(focus, day) {
  return focus && focus.day === day && typeof focus.text === 'string' ? focus.text : '';
}

/**
 * Keeps `value` in a ref the async poll tasks can check after their await: an answer for a place or
 * day that is no longer current is dropped rather than painted.
 */
function useLatest(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

/**
 * @param {{now: Date, scene: string, place: {name: string, lat: number, lon: number}|null, calKey: string}} args
 * @returns {{light: object, weather: object|null, todoRatio: number|null, focusText: string, agenda: object[]|null}}
 */
export default function useContextualScene({ now, scene, place, calKey }) {
  const minute = Math.floor(now.getTime() / 60_000);
  const lat = place?.lat;
  const lon = place?.lon;
  const hasPlace = Number.isFinite(lat) && Number.isFinite(lon);

  // Light: once per minute, and again only when the place moves.
  const light = useMemo(
    () => computeLightVector(new Date(minute * 60_000), hasPlace ? { lat, lon } : null),
    [minute, hasPlace, lat, lon],
  );

  // Weather at the chosen place. Two decimals (about 1 km) is plenty for a forecast and keeps the
  // request cacheable across a wobble in the stored coordinates.
  const wantsWeather = hasPlace && scene === 'topo';
  const wxKey = hasPlace ? `${lat.toFixed(2)},${lon.toFixed(2)}` : '';
  const wxKeyNow = useLatest(wxKey);
  const [wx, setWx] = useState({ key: '', weather: null, at: 0 });
  useVisiblePoll(async () => {
    const key = wxKey;
    try {
      const res = await fetch(`/api/wallpaper-context?${new URLSearchParams({ lat: lat.toFixed(2), lon: lon.toFixed(2) })}`);
      if (!res.ok) return; // keep the last good reading
      const body = await res.json();
      if (body?.weather && key === wxKeyNow.current) setWx({ key, weather: body.weather, at: Date.now() });
    } catch { /* offline: keep the last good reading */ }
  }, POLL_MS, wantsWeather, wxKey);
  // A failed poll keeps the last good reading, but only for two polls: after that it is no longer
  // the weather, and the terrain goes back to calm. Aged against the minute clock, so render is pure.
  const fresh = now.getTime() - wx.at < 2 * POLL_MS;
  const weather = wantsWeather && wx.key === wxKey && fresh ? wx.weather : null;

  // Today's agenda, through the same /api/calendar the Agenda widget reads.
  const day = localDay(now);
  const wantsAgenda = Boolean(calKey) && scene === 'chrono';
  const agKey = calKey ? `${calKey}|${day}` : '';
  const agKeyNow = useLatest(agKey);
  const [ag, setAg] = useState({ key: '', events: null });
  useVisiblePoll(async () => {
    const key = agKey;
    const next = await fetchAgenda(calKey, day);
    if (key !== agKeyNow.current) return;
    // A network blip keeps the last good list; a rejected key or an unconfigured server clears it.
    if (next.status === 'ok') setAg({ key, events: next.events });
    else if (next.status !== 'error') setAg({ key, events: null });
  }, POLL_MS, wantsAgenda, agKey);
  const agenda = wantsAgenda && ag.key === agKey ? ag.events : null;

  // The widgets' own storage, read on every render rather than subscribed to: the host renders on
  // the minute tick (and when a poll lands or the window resizes), so a tick picks up a ticked-off
  // task within the minute, and two small reads cost less than the bookkeeping to skip them.
  const todoRatio = todoRatioOf(readStored(TODO_KEY));
  const focusText = focusTextOf(readStored(FOCUS_KEY), day);

  return useMemo(
    () => ({ light, weather, todoRatio, focusText, agenda }),
    [light, weather, todoRatio, focusText, agenda],
  );
}
