import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import useOSStore from '../../store/osStore';
import { Card, Segmented, Row, Slider } from './primitives';
import { enterWallpaperMode } from '../../hooks/useWallpaperMode';
import {
  CORNERS, CORNER_NAMES, WIDGETS, MAX_PER_CORNER, MAX_ZONES, fitsCorner, sanitizeLayout, buildWallpaperUrl,
} from '../../wallpaper/config';
import { cityOf } from '../../wallpaper/time';
import { searchPlaces } from '../../wallpaper/weather';
import { isCustomWallpaper } from '../../theme/wallpapers';

/**
 * Settings → Wallpaper mode. Everything chosen here is written into the Plash URL; Plash keeps the
 * URL it was given, so a change only reaches it once the URL is copied across again.
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
  const layout = useMemo(() => sanitizeLayout(prefs.layout), [prefs.layout]);

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

  /* Layout: each widget lives in at most one corner; moving it appends it to the new one. */
  const cornerOf = (id) => CORNERS.find((c) => layout[c].includes(id)) ?? 'off';
  const placeWidget = (id, target) => {
    const next = Object.fromEntries(CORNERS.map((c) => [c, layout[c].filter((w) => w !== id)]));
    if (target !== 'off') next[target] = [...next[target], id];
    set({ layout: next });
  };
  const cornerOptions = (id) => [
    { id: 'off', name: 'Off' },
    ...CORNERS
      .filter((c) => fitsCorner(id, c) && (layout[c].length < MAX_PER_CORNER || layout[c].includes(id)))
      .map((c) => ({ id: c, name: CORNER_NAMES[c] })),
  ];

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

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="mb-1" style={{ color: 'var(--sdl-ink)', fontSize: 34, fontWeight: 650, letterSpacing: '-0.02em', fontFamily: 'var(--sdl-font-title)' }}>
        Wallpaper mode
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--sdl-sec)' }}>
        A quiet dashboard for your Mac&apos;s desktop. No dock, menu bar or icons, just widgets in the corners.
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
      </Card>

      <Card
        title="Layout"
        sub={`Corners stay visible around your windows. Up to ${MAX_PER_CORNER} widgets per corner; the top right takes small widgets only, to leave room for desktop icons.`}
      >
        <div>
          {Object.entries(WIDGETS).map(([id, w]) => (
            <Row key={id} title={w.name} sub={w.size === 'medium' ? 'Medium' : 'Small'}>
              <Segmented label={`${w.name} corner`} value={cornerOf(id)} options={cornerOptions(id)} onChange={(c) => placeWidget(id, c)} />
            </Row>
          ))}
        </div>
      </Card>

      <Card title="Your Mac" sub="Match these to your screen so nothing sits under the menu bar or the Dock.">
        <Row title="Dock" sub="Hidden leaves less room at the bottom.">
          <Segmented label="Dock" value={prefs.dock} options={[{ id: 'shown', name: 'Shown' }, { id: 'hidden', name: 'Hidden' }]} onChange={(v) => set({ dock: v })} />
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

      <Card title="Set up Plash">
        <ol className="list-decimal pl-5 space-y-1.5 text-[13px]" style={{ color: 'var(--sdl-ink)' }}>
          <li>Install <a href="https://sindresorhus.com/plash" target="_blank" rel="noreferrer" style={{ color: 'var(--sdl-aink)', fontWeight: 600 }}>Plash</a> from the Mac App Store.</li>
          <li>Copy the Plash URL above and add it as a website in Plash.</li>
          <li>Leave Browsing Mode off, so clicks go to your desktop.</li>
          <li>Optional: turn on &ldquo;Deactivate while on battery&rdquo;, and reload every few hours.</li>
          <li>Skip Plash&apos;s &ldquo;Invert colors&rdquo;. Pick a dark colorway in Appearance instead.</li>
        </ol>
        <p className="text-[12px] mt-3" style={{ color: 'var(--sdl-sec)' }}>
          The URL carries your colorway, wallpaper and everything on this page. Every widget works in Plash, which runs
          Safari&apos;s engine: none of them rely on Chrome-only features. Plash marks the page it shows, so even the
          plain site address opens in wallpaper mode there, with the default layout.
        </p>
      </Card>
    </div>
  );
};

export default WallpaperTab;
