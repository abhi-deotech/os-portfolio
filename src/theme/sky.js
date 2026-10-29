/**
 * The "Time of Day" wallpaper: a sky that follows the clock — deep navy at night, warm at dawn and
 * dusk, a muted blue through the day. Every stop is dark enough for light glass widgets on top, so
 * it pairs with dark colorways; wallpapers.js measures these stops like any gradient's, and the
 * randomizer keeps it away from light ones.
 *
 * Static by design: LiveWallpaper repaints it once a minute from the shared minute clock, with no
 * animation, because wallpaper mode's budget is zero running animations on a laptop left on all day.
 */

/** [hour, sky top, sky bottom, glow 1, glow 2, glow 3]. The 24:00 stop repeats 0:00 so it wraps. */
export const SKY_STOPS = [
  [0, '#05070f', '#0d1226', '#1b2a6b', '#3a1d5c', '#0f3b4a'],
  [5, '#0b1030', '#2a2350', '#3b3f9e', '#8a4a8f', '#1f5a7a'],
  [7, '#1d2a5a', '#5a4a7a', '#ff9a76', '#c86b98', '#3f7fbf'],
  [10, '#123a6b', '#2c6a9a', '#4fb3d9', '#6a7fdb', '#2fa58f'],
  [14, '#10335f', '#245d8f', '#3fa7d6', '#5b6fd1', '#27a08a'],
  [17, '#2a2456', '#7a4466', '#ff8a5c', '#d35f7f', '#5a5fb0'],
  [19, '#141434', '#3a2450', '#b4527a', '#5e3a9a', '#2a4f8a'],
  [21, '#080b1c', '#151a36', '#2a3a8a', '#4a2a7a', '#163e55'],
  [24, '#05070f', '#0d1226', '#1b2a6b', '#3a1d5c', '#0f3b4a'],
];

const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** The five colours at `date`, blended between the two stops either side of it, as [r, g, b]. */
export function skyAt(date) {
  const hour = date.getHours() + date.getMinutes() / 60;
  const i = SKY_STOPS.findIndex((stop, k) => hour >= stop[0] && hour < SKY_STOPS[k + 1][0]);
  const [from, to] = [SKY_STOPS[i], SKY_STOPS[i + 1]];
  const t = (hour - from[0]) / (to[0] - from[0]);
  return from.slice(1).map((hex, k) => {
    const a = rgbOf(hex);
    const b = rgbOf(to[k + 1]);
    return a.map((c, n) => Math.round(c + (b[n] - c) * t));
  });
}

/**
 * A CSS `background-image` for `date`: three soft glows over a vertical sky. Sized in percentages of
 * the box, so the full-screen wallpaper and the Settings swatch show the same picture.
 */
export function skyBackground(date) {
  const [top, bottom, g1, g2, g3] = skyAt(date).map((c) => c.join(' '));
  return [
    `radial-gradient(ellipse 75% 85% at 90% 0%, rgb(${g1} / 0.5), transparent 70%)`,
    `radial-gradient(ellipse 70% 80% at 75% 110%, rgb(${g2} / 0.5), transparent 70%)`,
    `radial-gradient(ellipse 60% 70% at 0% 100%, rgb(${g3} / 0.35), transparent 70%)`,
    `linear-gradient(170deg, rgb(${top}), rgb(${bottom}))`,
  ].join(', ');
}
