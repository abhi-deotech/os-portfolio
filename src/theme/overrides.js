/**
 * Deliberate deviations from vendored SDL, each with a reason.
 *
 * Anything here is a decision this project made that upstream did not. Per the skill's EVOLUTION.md,
 * proposals accumulate in THIS repo's sdl-notes.md and only reach SDL during a consolidation pass —
 * never by editing src/theme/sdl/*.json, which are byte-identical vendored copies.
 */

/**
 * Title faces, resolved per THEME.
 *
 * design-tokens.json carries a per-colorway `font` field, but typography/SKILL.md v1.1.0 was locked
 * LATER (2026-08-12, after two shopping rounds across 11 faces) and assigns faces per theme. It also
 * records Gill Sans as REJECTED for titles — which is exactly what the JSON still lists for Rose Dusk
 * and Garden Dawn. Typography owns typography, so the JSON field is dropped and this table wins.
 *
 * SCOPE, stated plainly because the paragraph above reads narrower than the behaviour: `normalize()`
 * never reads `cw.font` for ANY colorway, so this table overrides all 15, not just the two named.
 * Rose Dusk and Garden Dawn are simply the cases where the JSON's answer was actively rejected
 * upstream; Tangerine Vivid, Fuchsia Bold and Emerald Bold list "Avenir Next", which the same
 * typography lock also rejects, and the remaining eight list "system" and are unaffected either way.
 *
 * These are SYSTEM STACKS by design. Do not webfont them: SDL wrote them as stacks precisely so that
 * most users land on a declared fallback, and adding ~40KB per theme for a face the system already
 * has is exactly the kind of loudness the design language argues against.
 */
export const FONT_STACKS = {
  palatino: "'Palatino', 'Palatino Linotype', 'Book Antiqua', Georgia, serif",
  seravek: "'Seravek', 'Gill Sans Nova', Candara, Corbel, 'Segoe UI', system-ui, sans-serif",
  system: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  manrope: "'Manrope', ui-sans-serif, system-ui, sans-serif",
};

/** Per-theme default title face (typography/SKILL.md v1.1.0). */
export const THEME_TITLE_FACE = {
  'steel-night': 'system', // "plain on purpose"
  'carbon-day': 'system',
  'hearth-light': 'seravek',
  'botanical-day': 'seravek',
  'jewel-night': 'system', // Jewel non-washed is left open upstream; washed pair overridden below
  'lumina-neon': 'manrope', // documented house deviation — see below
};

/**
 * Per-COLORWAY title face, which beats the theme default.
 * The "washed pair" rule names Rose Dusk and Garden Dawn explicitly, and Garden Dawn needs this
 * because it sits in Botanical (Seravek) while belonging to the washed pair (Palatino).
 */
export const COLORWAY_TITLE_FACE = {
  'rose-dusk': 'palatino',
  'garden-dawn': 'palatino',
};

/**
 * Deviations recorded for the next SDL consolidation. Surfaced in Settings → Design Language →
 * Rejections so they are visible rather than buried.
 */
export const DEVIATIONS = [
  {
    id: 'panel-radius',
    title: 'Panel radius scales with the theme rather than tracking it',
    detail:
      'SDL radii run 12-22px. This shell\'s signature is a coherent ~40px family across five surfaces, ' +
      'and radius is not one of the ten laws. Panel radius is derived as radius x 1.8 so Steel and ' +
      'Carbon stay disciplined while Hearth and Botanical keep the signature.',
  },
  {
    id: 'focus-ring-alpha',
    title: 'Focus rings hold ~45-50% alpha instead of SDL\'s 30%',
    detail:
      'SDL\'s 30% assumes a plane the designer controls. These rings are the shell\'s only keyboard ' +
      'affordance and sit on glass over USER-CHOSEN photo wallpapers, where 30% can fall under WCAG ' +
      '1.4.11\'s 3:1 floor. SDL has no rule yet for a product where the user owns the plane.',
  },
  {
    id: 'manrope-house-face',
    title: 'Manrope retained as the Lumina Neon (Legacy) title face',
    detail:
      'Steel Night mandates system-stack titles, but Manrope is a written contract in STYLING.md and ' +
      'is the product\'s one non-system voice. Rather than silently violating the grammar, it is scoped ' +
      'to the non-SDL legacy colorway where it belongs.',
  },
  {
    id: 'wash-under-wallpaper',
    title: 'Colorway wash and motif sit BELOW the user\'s wallpaper',
    detail:
      'SDL\'s plane grammar assumes the designer owns the background; this OS hands it to the user. ' +
      'The wash/motif layers render beneath the wallpaper, so a photo hides them. A "Colorway" ' +
      'wallpaper entry renders nothing so the plane shows through, and is the default for SDL colorways.',
  },
];
