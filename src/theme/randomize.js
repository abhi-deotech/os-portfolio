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
 * ── Why that was not enough ────────────────────────────────────────────────────────────────────
 *
 * The measured contrast floor is a floor, not a taste. Three whole classes of bad roll cleared it:
 *
 *   1. The WALLPAPER was rolled with no reference to the colorway at all. It is the largest surface
 *      on screen and it was the one ingredient chosen blind. The five live gradients are all
 *      100%-saturation neon inherited from the pre-SDL shell, so they are a tonal mismatch for
 *      almost every SDL colorway: `cyber-grid` averages relative luminance 0.605 over the near-black
 *      0.004 plane of Steel and Jewel, and `linux-default` averages 0.109 under paper-white light
 *      colorways — a gap of up to 0.81. Rose Dusk's pink accent (hue 351) landing on `cyber-grid`'s
 *      green-into-cyan (159) put 132 degrees between the accent and the background.
 *   2. Lumina Neon icons passed the contrast filter on all five DARK colorways (0 of 19 glyphs
 *      below 3:1, worst 8.3:1) even though the theme's own description says it "will fight the
 *      others". Clearing a floor and belonging to a colorway are different claims.
 *   3. `iconAudit` already reports `flat` — the set has no colour left — and the Settings card
 *      already shows it. The randomizer ignored it, so a roll could land on Mono Soft with
 *      Harmonized icons and hand you nineteen indistinguishable greys.
 *
 * So the roll now goes through `wallpaperFit` (tone, hue and chroma, measured the same way
 * `iconAudit` measures contrast) and honours the `flat` and `offTheme` signals that already
 * existed. Nothing here is a hand-maintained blocklist of bad pairs: add a colorway or a wallpaper
 * and it is judged by the same three numbers, so a new ingredient cannot silently reintroduce a
 * combination this file was written to prevent.
 *
 * ── Signature looks ───────────────────────────────────────────────────────────────────────────
 *
 * Rules can only ever say what is not wrong. Most rolls come from a short hand-authored list of
 * complete looks that someone actually chose — which is also what lets the toast say "Midnight
 * Arcade" instead of reciting the ingredients. They are held to the same gates as the generated
 * path by `assertCuratedLooksAreClean()` in dev, so a preset cannot rot when a colorway changes.
 *
 * ── Never randomized ──────────────────────────────────────────────────────────────────────────
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
import { WALLPAPERS, isCustomWallpaper, wallpaperFit } from './wallpapers';
import { APPS } from '../config/apps';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const between = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

/**
 * Complete looks, each one chosen rather than computed.
 *
 * Every entry names its wallpaper explicitly, including `colorway` — the wallpaper that renders
 * nothing so the designed plane, wash and motif show through. That is the correct background for
 * an SDL colorway far more often than any photograph, and a generator left to its own devices
 * under-picks it because it is one option among ten rather than the default it deserves to be.
 */
export const CURATED_LOOKS = [
  {
    id: 'midnight-arcade',
    name: 'Midnight Arcade',
    note: 'The legacy neon, whole — its own colorway, its own icon set, its own wallpaper.',
    colorway: 'lumina-neon', iconTheme: 'lumina', wallpaper: 'linux-default',
    density: 'comfortable', transparencyEffects: true, accentIntensity: 100,
  },
  {
    id: 'after-hours',
    name: 'After Hours',
    note: 'Rose Dusk over a near-black mountain. Jewel grammar with the volume down.',
    colorway: 'rose-dusk', iconTheme: 'harmonized', wallpaper: 'dark-mountain',
    density: 'comfortable', transparencyEffects: true, accentIntensity: 85,
  },
  {
    id: 'drafting-table',
    name: 'Drafting Table',
    note: 'Carbon Dimmed on its own plane, compact, one accent voice. Nothing to look at but the work.',
    colorway: 'carbon-dimmed', iconTheme: 'mono', wallpaper: 'colorway',
    density: 'compact', transparencyEffects: false, accentIntensity: 65,
  },
  {
    id: 'conservatory',
    name: 'Conservatory',
    note: 'Garden Dawn with outline icons — chrome recedes and the plane does the talking.',
    colorway: 'garden-dawn', iconTheme: 'outline', wallpaper: 'colorway',
    density: 'comfortable', transparencyEffects: true, accentIntensity: 75,
  },
  {
    id: 'cold-open',
    name: 'Cold Open',
    note: 'Graphite Bold with solid tiles on a deep violet field.',
    colorway: 'graphite-bold', iconTheme: 'solid', wallpaper: 'tech-minimal',
    density: 'comfortable', transparencyEffects: true, accentIntensity: 90,
  },
  {
    id: 'darkroom',
    name: 'Darkroom',
    note: 'Cocoa Relit on the amber-into-plum gradient it was warmed for.',
    colorway: 'cocoa-relit', iconTheme: 'harmonized', wallpaper: 'linux-default',
    density: 'comfortable', transparencyEffects: true, accentIntensity: 95,
  },
  {
    id: 'gallery-light',
    name: 'Gallery Light',
    note: 'Mono Soft against a near-neutral photograph. The quietest thing this OS can be.',
    colorway: 'mono-soft', iconTheme: 'mono', wallpaper: 'cyber-vibes',
    density: 'comfortable', transparencyEffects: true, accentIntensity: 60,
  },
  {
    id: 'orangery',
    name: 'Orangery',
    note: 'Honey Vivid on its own cream plane. Warm paper, dark teal accent.',
    colorway: 'honey-vivid', iconTheme: 'harmonized', wallpaper: 'colorway',
    density: 'comfortable', transparencyEffects: true, accentIntensity: 80,
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    note: 'Periwinkle Vivid, compact, solid tiles. Dense and technical.',
    colorway: 'periwinkle-vivid', iconTheme: 'solid', wallpaper: 'colorway',
    density: 'compact', transparencyEffects: true, accentIntensity: 85,
  },
  {
    id: 'deep-field',
    name: 'Deep Field',
    note: 'Carbon Vivid over the violet abstract. Steel grammar, one cool story.',
    colorway: 'carbon-vivid', iconTheme: 'harmonized', wallpaper: 'abstract-blue',
    density: 'comfortable', transparencyEffects: true, accentIntensity: 80,
  },
  {
    id: 'hothouse',
    name: 'Hothouse',
    note: 'Emerald Bold under the green-into-cyan gradient it can actually carry.',
    colorway: 'emerald-bold', iconTheme: 'harmonized', wallpaper: 'cyber-grid',
    density: 'comfortable', transparencyEffects: true, accentIntensity: 90,
  },
  {
    id: 'nightshift',
    name: 'Nightshift',
    note: 'Fuchsia Bold on its own plane, atmosphere wide open.',
    colorway: 'fuchsia-bold', iconTheme: 'harmonized', wallpaper: 'colorway',
    density: 'comfortable', transparencyEffects: true, accentIntensity: 100,
  },
];

/**
 * Icon themes that are both legible AND in-register on this colorway.
 *
 * Three separate questions, and the old filter only asked the first:
 *   below === 0   every glyph clears its contrast floor         (measured, from iconAudit)
 *   !flat         the set still has colour left to tell apps apart (measured, from iconAudit)
 *   !offTheme     the palette belongs to this colorway            (declared, from ICON_THEMES)
 */
function legibleIconThemes(cw) {
  return ICON_THEMES.filter((t) => {
    if (t.offTheme && t.homeColorway !== cw.id) return false;
    const audit = iconAudit(t.id, cw, APPS);
    return audit.below === 0 && !audit.flat;
  });
}

/** Wallpapers that measure in-register with this colorway. Always non-empty: the plane always fits. */
function fittingWallpapers(cw) {
  return WALLPAPERS.filter((w) => wallpaperFit(w.id, cw).ok);
}

/**
 * @param {{colorway?: string, wallpaper?: string}} current  so the roll can avoid a no-op
 * @returns {{colorway: string, iconTheme: string, wallpaper?: string, density: string,
 *            transparencyEffects: boolean, accentIntensity: number, label: string}}
 */
export function randomAppearance(current = {}) {
  // An uploaded image is the user's own file and is held only in this one store field, so replacing
  // it would destroy it — they would have to go find it on disk again. A stock wallpaper is a
  // pointer and costs nothing to roll, so only those get randomized.
  const keepWallpaper = isCustomWallpaper(current.wallpaper);

  // Most rolls are a look someone chose. The generated path still runs often enough that the
  // button does not become a twelve-item carousel you can memorise.
  if (chance(0.6)) {
    const looks = CURATED_LOOKS.filter((l) => l.colorway !== current.colorway);
    const look = pick(looks.length ? looks : CURATED_LOOKS);
    const patch = {
      colorway: look.colorway,
      iconTheme: look.iconTheme,
      density: look.density,
      transparencyEffects: look.transparencyEffects,
      accentIntensity: look.accentIntensity,
      label: look.note,
      title: look.name,
    };
    // A curated look names its wallpaper as part of the composition, so an uploaded image is the
    // only reason not to apply it.
    if (!keepWallpaper) patch.wallpaper = look.wallpaper;
    return patch;
  }

  // Never roll the colorway you are already on: a randomizer that visibly does nothing reads as
  // broken, and the colorway is the change you actually notice.
  const candidates = COLORWAYS.filter((c) => c.id !== current.colorway);
  const cw = pick(candidates.length ? candidates : COLORWAYS);

  const safeIconThemes = legibleIconThemes(cw);
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

  if (!keepWallpaper) {
    const fitting = fittingWallpapers(cw).filter((w) => w.id !== current.wallpaper);
    // `fittingWallpapers` cannot return empty — the "Colorway" plane fits every colorway by
    // construction — but it CAN be reduced to empty by the no-repeat filter above, on a colorway
    // whose only fit is the plane it is already wearing. Keeping the wallpaper is the right answer
    // there; the colorway has already changed, so the roll is not a no-op.
    if (fitting.length) patch.wallpaper = pick(fitting).id;
  }

  patch.label = `${cw.name}${cw.suffix ? ` ${cw.suffix}` : ''} · ${
    ICON_THEMES.find((t) => t.id === iconTheme)?.name || iconTheme
  } icons`;

  return patch;
}

/**
 * Hold the hand-authored looks to the same gates the generated path uses.
 *
 * A curated look is a snapshot of a judgement made against the lineup as it stood. Retune a
 * colorway's accent or swap a photograph and a preset can quietly become one of the combinations
 * this file exists to prevent — silently, because a preset is prose until something measures it.
 *
 * Dev-only and non-throwing: a look that has drifted is a design bug to go and fix, not a reason
 * to break someone's desktop.
 *
 * @returns {Array<{id: string, problems: string[]}>} empty when every look is clean
 */
export function auditCuratedLooks() {
  const out = [];
  for (const look of CURATED_LOOKS) {
    const problems = [];
    const cw = COLORWAYS.find((c) => c.id === look.colorway);
    if (!cw) {
      out.push({ id: look.id, problems: [`unknown colorway "${look.colorway}"`] });
      continue;
    }
    if (!WALLPAPERS.some((w) => w.id === look.wallpaper)) problems.push(`unknown wallpaper "${look.wallpaper}"`);
    if (!ICON_THEMES.some((t) => t.id === look.iconTheme)) problems.push(`unknown icon theme "${look.iconTheme}"`);

    if (!legibleIconThemes(cw).some((t) => t.id === look.iconTheme)) {
      const a = iconAudit(look.iconTheme, cw, APPS);
      problems.push(
        `icons "${look.iconTheme}" are not eligible on ${cw.name} ` +
        `(${a.below}/${a.total} below floor, worst ${a.worst.toFixed(2)}:1${a.flat ? ', flat' : ''})`,
      );
    }
    const fit = wallpaperFit(look.wallpaper, cw);
    if (!fit.ok) {
      problems.push(
        `wallpaper "${look.wallpaper}" fails ${fit.reasons.join('+')} on ${cw.name} ` +
        `(tone ${fit.polarity.toFixed(2)}, hue ${Math.round(fit.hue)}deg, chroma ${fit.chroma.toFixed(1)}x)`,
      );
    }
    if (problems.length) out.push({ id: look.id, problems });
  }
  return out;
}

if (import.meta.env?.DEV) {
  const drifted = auditCuratedLooks();
  for (const { id, problems } of drifted) {
    console.warn(`[surprise-me] curated look "${id}" has drifted:\n  - ${problems.join('\n  - ')}`);
  }
}
