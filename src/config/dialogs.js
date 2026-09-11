/**
 * Dialog specs that more than one surface raises.
 *
 * A dialog spec is plain data by design (see src/store/slices/dialogSlice.js), so a shared one is
 * just an object — no component, no hook, no bundle weight. Appearance is lazily loaded behind
 * Settings while the desktop context menu ships in the main chunk, so the shared copy cannot live
 * in either component without dragging the other's module along.
 */

/** Raised from both the Appearance pane's Reset card and the desktop context menu's Reset row. */
export const APPEARANCE_RESET_DIALOG = {
  kicker: 'Personalization',
  tone: 'danger',
  icon: 'reset',
  title: 'Reset appearance?',
  message:
    'Colorway, wallpaper, icon theme, density, motion, terminal theme, brightness and atmosphere '
    + 'all go back to factory defaults.',
  confirmLabel: 'Reset',
  cancelLabel: 'Keep my look',
};
