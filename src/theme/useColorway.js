/**
 * React surface for the theme engine.
 *
 * RULE: components must NOT call these to get colours. Colours come from Tailwind classes and CSS
 * variables, which is what makes the whole system switchable without re-rendering. These hooks exist
 * for exactly three kinds of consumer:
 *
 *   1. the Settings pickers and the Design Language showcase
 *   2. canvas / WebGL / three.js code that genuinely cannot read CSS (Visualizer, Screensaver)
 *   3. chart series in the metric components, which need the viz palette as data
 *
 * If the consumer count creeps past a dozen, colour is leaking back into JS and the engine is being
 * misused.
 */
import { useCallback, useMemo } from 'react';
import useOSStore from '../store/osStore';
import { resolveColorway, colorwaysByTheme, accentBand } from './registry';
import { iconStyle, DEFAULT_ICON_THEME, isKnownIconTheme } from './icons';

/** The active colorway record: id, name, theme, mode, radius, tempo, titleFace, roles, viz. */
export function useColorway() {
  const id = useOSStore((s) => s.colorway);
  return useMemo(() => resolveColorway(id), [id]);
}

/** `[density, setDensity]` — comfortable | compact. */
export function useDensity() {
  const density = useOSStore((s) => s.density);
  const setDensity = useOSStore((s) => s.setDensity);
  return [density, setDensity];
}

/** Categorical / sequential / diverging series for the active colorway. */
export function useVizPalette() {
  const cw = useColorway();
  return cw.viz || { cat: [], seq: [], div: [] };
}

/**
 * One hook per component, returning a resolver applied per app inside a map.
 *
 * Deliberately not `useAppIconStyle(app)`: that shape would have to be called inside `.map()`,
 * which breaks the rules of hooks the moment the list changes length — and it does, since the dock
 * shows pinned apps plus whatever is currently open.
 *
 * The dock's running-app indicator is the caller. It used to read a per-app `shadow` hex that no
 * theme touched; Terminal's was `#ffffff`, invisible on every light colorway.
 */
export function useIconResolver() {
  const cw = useColorway();
  const stored = useOSStore((s) => s.iconTheme);
  const themeId = isKnownIconTheme(stored) ? stored : DEFAULT_ICON_THEME;
  return useCallback((app) => iconStyle(themeId, cw, app), [themeId, cw]);
}

/** Theme-grouped lineup for the Settings picker. Stable across renders. */
export function useColorwayList() {
  return useMemo(() => colorwaysByTheme(), []);
}

export { accentBand };
