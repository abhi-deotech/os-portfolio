import React, { Suspense, useEffect } from 'react';
import useOSStore from '../store/osStore';
import useMinuteClock from '../hooks/useMinuteClock';
import { resolveWallpaper, isCustomWallpaper, isLegacyDataUrlWallpaper } from '../theme/wallpapers';
import { skyBackground } from '../theme/sky';

// The relief wallpapers' SVG scenes are their own chunk: a desktop on a photo or the plane never
// downloads them.
const Faux3DStage = React.lazy(() => import('./wallpaper/Faux3DStage'));

/**
 * A relief is decoration: if its chunk fails to load (a tab older than the deploy) or a scene throws,
 * it gives way to body's colorway plane instead of taking the whole shell down with it. Keyed on the
 * scene by its host, so a later pick tries again (a missing chunk stays missing until a reload).
 */
class ReliefBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('[wallpaper] relief scene failed; showing the colorway plane', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** "Time of Day": repainted on the minute tick, so it costs one style change a minute and no animation. */
const SkyLayer = ({ children }) => {
  const now = useMinuteClock();
  return (
    <div className="absolute inset-0 -z-20" style={{ backgroundImage: skyBackground(now) }}>
      {children}
    </div>
  );
};

/**
 * The desktop plane's ingredient layer.
 *
 * Previously this file declared the wallpaper library twice — and the copy that produced the
 * className was missing all four image ids, so any photo wallpaper resolved to a hardcoded navy
 * fill instead of the intended fallback. Both copies now come from src/theme/wallpapers.js.
 *
 * An uploaded wallpaper is a Blob in its own idb key; the store holds a sentinel and, once
 * loaded, an object URL. The first render after boot has the sentinel and no URL, so this layer
 * asks the store to load it (which also migrates a legacy data-URL payload) and paints nothing
 * until it arrives. A legacy data URL still paints directly in the meantime.
 *
 * `override` paints a given id instead of the stored one — wallpaper mode takes its wallpaper from
 * the URL, since Plash has no saved one.
 *
 * A relief wallpaper (faux-3D, lit by the sun) is drawn by Faux3DStage, loaded on first use.
 * Wallpaper mode passes `interactive` (false in Plash's passive mode, which turns parallax off),
 * `area` (the work area, the scene's focal centre) and its `prefs` (the chosen place and calendar
 * key); on the desktop the stored wallpaper-mode prefs stand in. Performance mode drops the relief
 * for the colorway's plane, as Appearance promises.
 */
const Wallpaper = ({ override, interactive = true, area = null, prefs = null }) => {
  const stored = useOSStore((state) => state.wallpaper);
  const wallpaper = override ?? stored;
  const customUrl = useOSStore((state) => state.customWallpaperUrl);
  const loadCustomWallpaper = useOSStore((state) => state.loadCustomWallpaper);
  const lowPerformance = useOSStore((state) => state.lowPerformance);
  const storePrefs = useOSStore((state) => state.wallpaperPrefs);

  const custom = isCustomWallpaper(wallpaper);
  useEffect(() => {
    if (custom && !customUrl) loadCustomWallpaper();
  }, [custom, customUrl, loadCustomWallpaper]);

  let gradientClass = '';
  let backgroundStyle;
  let isColorwayPlane = false;
  let isSky = false;
  let reliefScene = null;

  if (custom) {
    const url = customUrl ?? (isLegacyDataUrlWallpaper(wallpaper) ? wallpaper : null);
    if (!url) return null;
    backgroundStyle = { backgroundImage: `url(${url})` };
  } else {
    const wp = resolveWallpaper(wallpaper);
    if (wp.type === 'none') isColorwayPlane = true;
    else if (wp.type === 'sky') isSky = true;
    else if (wp.type === 'relief') reliefScene = wp.scene;
    else if (wp.type === 'image') backgroundStyle = { backgroundImage: `url(${wp.url})` };
    else gradientClass = wp.gradient;
  }

  // "Colorway" renders nothing at all, so body's plane + wash (body::before in grammar.css) is what
  // the user sees. A readability scrim over an already-designed plane would only mute it.
  if (isColorwayPlane) return null;

  // Drawn from the colorway's tokens, so it needs no readability scrim. In performance mode the
  // plane shows instead.
  if (reliefScene) {
    if (lowPerformance) return null;
    return (
      <div className="absolute inset-0 -z-20">
        <ReliefBoundary key={reliefScene}>
          <Suspense fallback={null}>
            <Faux3DStage scene={reliefScene} interactive={interactive} area={area} prefs={prefs ?? storePrefs} />
          </Suspense>
        </ReliefBoundary>
      </div>
    );
  }

  // Its own component so the minute clock only runs while the sky is the wallpaper.
  if (isSky) {
    return (
      <SkyLayer>
        <div className="absolute inset-0" style={{ background: 'var(--sdl-scrim)', opacity: 0.35 }} />
      </SkyLayer>
    );
  }

  return (
    <div
      className={`absolute inset-0 -z-20 transition-opacity duration-1000 ${gradientClass}`}
      style={backgroundStyle ? { ...backgroundStyle, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {/* Readability scrim for user-supplied ingredients, tinted by mode rather than always black —
          over a light colorway a black scrim reads as grime. */}
      <div className="absolute inset-0" style={{ background: 'var(--sdl-scrim)', opacity: 0.35 }} />
    </div>
  );
};

export default Wallpaper;
