/**
 * The single wallpaper library.
 *
 * Previously declared three times: LiveWallpaper.jsx had TWO copies in one 53-line file (the second
 * shadowed the first and was missing all four image ids, so selecting a photo wallpaper fell through
 * to a hardcoded navy), and Settings.jsx held a third with different thumbnail URLs. Adding a
 * wallpaper meant editing three literals and any omission failed silently.
 *
 * P3 adds the `colorway` entry — a wallpaper that renders nothing, letting the colorway's own plane,
 * wash and motif show through. That becomes the default for SDL colorways, because SDL's atmosphere
 * grammar (law 8) assumes the designer owns the background while this OS hands it to the user.
 */

/** @typedef {{id: string, name: string, type: 'live'|'image', gradient?: string, url?: string, thumb?: string}} Wallpaper */

const UNSPLASH = (id, w, q) =>
  `https://images.unsplash.com/photo-${id}?q=${q}&w=${w}&auto=format&fit=crop`;

/** @type {Wallpaper[]} */
export const WALLPAPERS = [
  // Renders NOTHING, so the colorway's own plane + wash + motif show through. This is the
  // resolution to a real conflict: SDL's atmosphere grammar (law 8) assumes the designer owns the
  // background, while this OS hands it to the user. Default for SDL colorways.
  { id: 'colorway', name: 'Colorway', type: 'none' },
  { id: 'neon-nebula', name: 'Neon Nebula', type: 'live', gradient: 'bg-gradient-to-br from-[#cc97ff] to-[#00d2fd]' },
  { id: 'cyber-grid', name: 'Cyber Grid', type: 'live', gradient: 'bg-gradient-to-br from-[#00f5a0] to-[#00d2fd]' },
  { id: 'sunset-glow', name: 'Sunset Glow', type: 'live', gradient: 'bg-gradient-to-br from-[#ff4d4d] to-[#ffaf40]' },
  { id: 'quantum-flow', name: 'Quantum Flow', type: 'live', gradient: 'bg-gradient-to-br from-[#cc97ff] to-[#60a5fa]' },
  { id: 'linux-default', name: 'Linux Default', type: 'live', gradient: 'bg-gradient-to-br from-[#4e1a3d] via-[#772953] to-[#e95420]' },
  { id: 'abstract-blue', name: 'Abstract Blue', type: 'image', url: UNSPLASH('1618005182384-a83a8bd57fbe', 1200, 70), thumb: UNSPLASH('1618005182384-a83a8bd57fbe', 400, 40) },
  { id: 'dark-mountain', name: 'Dark Mountain', type: 'image', url: UNSPLASH('1477346611705-65d1883cee1e', 1200, 70), thumb: UNSPLASH('1477346611705-65d1883cee1e', 400, 40) },
  { id: 'cyber-vibes', name: 'Cyber Vibes', type: 'image', url: UNSPLASH('1614850523296-d8c1af93d400', 1200, 70), thumb: UNSPLASH('1614850523296-d8c1af93d400', 400, 40) },
  { id: 'tech-minimal', name: 'Minimal Tech', type: 'image', url: UNSPLASH('1550745165-9bc0b252726f', 1200, 70), thumb: UNSPLASH('1550745165-9bc0b252726f', 400, 40) },
];

export const DEFAULT_WALLPAPER = 'linux-default';

const BY_ID = new Map(WALLPAPERS.map((w) => [w.id, w]));

export const isCustomWallpaper = (value) => typeof value === 'string' && value.startsWith('data:image');

/** Resolve an id to its entry, falling back to the default rather than to a bare colour. */
export function resolveWallpaper(id) {
  return BY_ID.get(id) || BY_ID.get(DEFAULT_WALLPAPER);
}
