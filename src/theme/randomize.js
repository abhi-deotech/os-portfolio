/**
 * "Surprise me" — a coherent random appearance.
 *
 * A randomizer over sixteen colorways, five icon themes and ten wallpapers can produce roughly
 * fifty thousand combinations, and some of them are *known bad*. This project already measured
 * which: Lumina Neon icons put all eighteen glyphs below 3:1 on every one of the ten light
 * colorways, bottoming out at 1.01:1. Shipping a button that can hand you that is worse than not
 * shipping the button, so the icon theme is drawn only from the themes that MEASURE clean against
 * the colorway that was just rolled — `iconAudit` is the same function the Settings card uses to
 * warn you, applied here as a filter instead of a warning.
 *
 * Three things are deliberately NOT randomized:
 *
 *   reducedMotion   an accessibility setting. Someone who set "Reduce" did so because motion makes
 *                   them ill. A novelty button must never touch it.
 *   brightness      rolling 4% would black the screen out, and the control to fix it is inside a
 *                   Settings pane you now cannot read.
 *   lowPerformance  a capability decision about the user's hardware, not a look.
 *
 * Returns a plain patch; it does not touch the store, so the caller decides when to apply it and
 * the same function can back a Settings button, a terminal command or a keyboard shortcut.
 */
import { COLORWAYS } from './registry';
import { ICON_THEMES, iconAudit, DEFAULT_ICON_THEME } from './icons';
import { WALLPAPERS, isCustomWallpaper } from './wallpapers';
import { APPS } from '../config/apps';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const between = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

/**
 * @param {{colorway?: string, wallpaper?: string}} current  so the roll can avoid a no-op
 * @returns {{colorway: string, iconTheme: string, wallpaper?: string, density: string,
 *            transparencyEffects: boolean, accentIntensity: number, label: string}}
 */
export function randomAppearance(current = {}) {
  // Never roll the colorway you are already on: a randomizer that visibly does nothing reads as
  // broken, and the colorway is the change you actually notice.
  const candidates = COLORWAYS.filter((c) => c.id !== current.colorway);
  const cw = pick(candidates.length ? candidates : COLORWAYS);

  const safeIconThemes = ICON_THEMES.filter((t) => iconAudit(t.id, cw, APPS).below === 0);
  const iconTheme = (safeIconThemes.length ? pick(safeIconThemes) : { id: DEFAULT_ICON_THEME }).id;

  const patch = {
    colorway: cw.id,
    iconTheme,
    density: chance(0.25) ? 'compact' : 'comfortable',
    // Weighted, not a coin flip. Glass is the shell's signature; landing on flat panels half the
    // time would make the button feel like it broke something rather than like it rolled a look.
    transparencyEffects: chance(0.8),
    // Banded away from zero. Atmosphere at 0 removes the wash, the motif and every glow at once —
    // technically a valid setting, but as a random outcome it just looks like the theme failed.
    accentIntensity: between(60, 100),
  };

  // An uploaded image is the user's own file and is held only in this one store field, so replacing
  // it would destroy it — they would have to go find it on disk again. A stock wallpaper is a
  // pointer and costs nothing to roll, so only those get randomized.
  if (!isCustomWallpaper(current.wallpaper)) {
    const options = WALLPAPERS.filter((w) => w.id !== current.wallpaper);
    patch.wallpaper = pick(options.length ? options : WALLPAPERS).id;
  }

  patch.label = `${cw.name}${cw.suffix ? ` ${cw.suffix}` : ''} · ${
    ICON_THEMES.find((t) => t.id === iconTheme)?.name || iconTheme
  } icons`;

  return patch;
}
