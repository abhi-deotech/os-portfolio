import { createContext, useContext } from 'react';

/**
 * The part of the screen windows may use, as px insets from each viewport edge plus the size left
 * between them: `{ top, right, bottom, left, width, height }`.
 *
 * `null` (the default) is the desktop's own area, the full width under the menu bar. Wallpaper mode
 * provides a smaller one, clear of the Mac's menu bar, Dock, Stage Manager strip and the widget
 * column, so a maximized or snapped window fills the empty middle rather than the whole screen.
 */
export const WorkAreaContext = createContext(null);

export const useWorkArea = () => useContext(WorkAreaContext);
