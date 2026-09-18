import { closePopout } from '../../utils/popout.js';

/**
 * The per-session reset: state that belongs to one session and is never persisted. Every sign-out
 * path spreads this (authSlice.logout, puterSlice.signOutPuter), so a later session-only field, from
 * any slice, joins the reset by being added here.
 *   windowOpenedAt  { [id]: epoch ms } — Task Manager's "Opened"; a window restored after a reload has
 *                   no entry and reads "restored".
 *   poppedOut       { [id]: { mode } } — windows living in a separate browser window.
 *   isImmersive     fullscreen + keyboard lock is on.
 *   focusMode       Focus (systemSlice) holds non-urgent toasts; the next person to sign in starts
 *                   without it.
 */
export const WINDOW_SESSION_RESET = { windowOpenedAt: {}, poppedOut: {}, isImmersive: false, focusMode: false };

export const createWindowSlice = (set, get) => ({
  openWindows: [],
  windowOpenedAt: {},
  poppedOut: {},
  isImmersive: false,
  // Written only by useImmersiveSync on `fullscreenchange`, so the tile never claims a fullscreen
  // the browser refused.
  setIsImmersive: (on) => set({ isImmersive: !!on }),
  minimizedWindows: [],
  maximizedWindows: [],
  snappedWindows: {},
  activeWindow: null,
  isControlCenterOpen: false,
  isAppLauncherOpen: false,
  isSpotlightOpen: false,

  toggleSpotlight: (isOpen) =>
    set((state) => ({
      isSpotlightOpen: isOpen !== undefined ? isOpen : !state.isSpotlightOpen,
    })),

  openWindow: (id, fileId = null) => {
    // Read the clock before `set`, never inside the updater (StrictMode runs updaters twice).
    const now = Date.now();
    set((state) => {
      const isOpen = state.openWindows.includes(id);
      const windows = isOpen
        ? state.openWindows
        : [...state.openWindows, id];
      
      const newState = {
        openWindows: windows,
        windowOpenedAt: isOpen ? state.windowOpenedAt : { ...state.windowOpenedAt, [id]: now },
        activeWindow: id,
        isControlCenterOpen: false,
        isAppLauncherOpen: false,
      };

      if (fileId) {
        if (id === 'notepad') newState.activeNotepadFile = fileId;
        if (id === 'documentation') newState.activeDocFile = fileId;
        if (id === 'media') newState.activeMediaFile = fileId;
        if (id === 'photos') newState.activePhotoFile = fileId;
        if (id === 'mail') newState.activeMailId = fileId;
        if (id === 'music') newState.activeMusicFile = fileId;
      }

      return newState;
    });
    // After the set, not inside the updater. `trackRecentFile` is itself a `set`; nested inside
    // the updater it landed BEFORE the outer merge and, under StrictMode (which invokes updaters
    // twice — see tasks/lessons.md), pushed every opened file onto the recent list twice.
    if (fileId) get().trackRecentFile(fileId);
  },

  openNotepad: (fileId) => {
    const now = Date.now();
    set((state) => {
      const isOpen = state.openWindows.includes('notepad');
      const windows = isOpen
        ? state.openWindows
        : [...state.openWindows, 'notepad'];
      return {
        openWindows: windows,
        windowOpenedAt: isOpen ? state.windowOpenedAt : { ...state.windowOpenedAt, notepad: now },
        activeWindow: 'notepad',
        activeNotepadFile: fileId,
        isAppLauncherOpen: false,
        isControlCenterOpen: false,
      };
    });
  },

  // Opening Flow-Net AT a URL, which is what a project's "Live" button does.
  //
  // This is a dedicated action rather than a sixth arm of `openWindow`'s `if (id === ...)` chain
  // because that chain ends in `state.trackRecentFile(fileId)` — it assumes its second argument is
  // a virtual-file-system node id. A URL is not one, so routing through it would push a bare URL
  // string into the Recents list. `openNotepad` above sets the same precedent for the same reason.
  openBrowser: (url) => {
    const now = Date.now();
    set((state) => ({
      browserUrl: url,
      // A monotonic tick, because the URL alone is not enough to drive the navigation. Launch a
      // demo, type something else into the address bar, then hit the same demo's Live button
      // again: `browserUrl` is unchanged, so an effect watching only it never re-fires and the
      // click silently does nothing. The counter always changes.
      browserNav: (state.browserNav || 0) + 1,
      openWindows: state.openWindows.includes('browser')
        ? state.openWindows
        : [...state.openWindows, 'browser'],
      windowOpenedAt: state.openWindows.includes('browser')
        ? state.windowOpenedAt
        : { ...state.windowOpenedAt, browser: now },
      // Flow-Net may already be open and minimized behind the Projects window, so this has to
      // clear the minimized list as well as focus — otherwise clicking Live appears to do nothing.
      minimizedWindows: (state.minimizedWindows || []).filter((w) => w !== 'browser'),
      activeWindow: 'browser',
      isControlCenterOpen: false,
      isAppLauncherOpen: false,
    }));
  },

  closeWindow: (id) => {
    set((state) => {
      const snapped = { ...(state.snappedWindows || {}) };
      delete snapped[id];
      const openedAt = { ...(state.windowOpenedAt || {}) };
      delete openedAt[id];
      const poppedOut = { ...(state.poppedOut || {}) };
      delete poppedOut[id];
      return {
        openWindows: state.openWindows.filter((w) => w !== id),
        windowOpenedAt: openedAt,
        poppedOut,
        minimizedWindows: (state.minimizedWindows || []).filter((w) => w !== id),
        // maximizedWindows was the ONE list this never cleaned, and it is persisted. Maximizing any
        // window once and closing it left its id here permanently, across reloads — and the dock
        // hides itself whenever that list is non-empty, so the dock disappeared for good.
        maximizedWindows: (state.maximizedWindows || []).filter((w) => w !== id),
        snappedWindows: snapped,
        activeWindow: state.activeWindow === id ? null : state.activeWindow,
      };
    });
    // After the set, never inside the updater (StrictMode runs updaters twice).
    closePopout(id);
  },

  /**
   * Window `id` now lives in a second browser window. The caller has already opened it
   * (utils/popout.js openPopout, straight from the click); this records it, un-minimizes and focuses.
   */
  popOutWindow: (id, mode) =>
    set((state) => ({
      poppedOut: { ...(state.poppedOut || {}), [id]: { mode } },
      minimizedWindows: state.minimizedWindows.includes(id)
        ? state.minimizedWindows.filter((w) => w !== id)
        : state.minimizedWindows,
      activeWindow: id,
    })),

  /** Dock window `id` again, then close its browser window (after the set, never inside it). */
  popInWindow: (id) => {
    if (get().poppedOut?.[id]) {
      set((state) => {
        const poppedOut = { ...(state.poppedOut || {}) };
        delete poppedOut[id];
        return {
          poppedOut,
          activeWindow: state.openWindows.includes(id) ? id : state.activeWindow,
        };
      });
    }
    closePopout(id);
  },

  toggleMinimizeWindow: (id) =>
    set((state) => {
      const isMinimized = (state.minimizedWindows || []).includes(id);
      const newMinimized = isMinimized
        ? state.minimizedWindows.filter((w) => w !== id)
        : [...(state.minimizedWindows || []), id];

      return {
        minimizedWindows: newMinimized,
        activeWindow: isMinimized ? id : (state.activeWindow === id ? null : state.activeWindow),
      };
    }),

  toggleMaximizeWindow: (id) =>
    set((state) => {
      const isMaximized = (state.maximizedWindows || []).includes(id);
      const newMaximized = isMaximized
        ? state.maximizedWindows.filter((w) => w !== id)
        : [...(state.maximizedWindows || []), id];

      // Unsnap when maximizing
      const snapped = { ...(state.snappedWindows || {}) };
      delete snapped[id];

      return {
        maximizedWindows: newMaximized,
        snappedWindows: snapped,
        activeWindow: id,
      };
    }),

  snapWindow: (id, direction) =>
    set((state) => {
      const snapped = { ...(state.snappedWindows || {}) };
      if (direction) {
        snapped[id] = direction;
        // Unmaximize when snapping to left/right
        const newMaximized = (state.maximizedWindows || []).filter((w) => w !== id);
        return {
          snappedWindows: snapped,
          maximizedWindows: newMaximized,
          activeWindow: id,
        };
      } else {
        delete snapped[id];
        return {
          snappedWindows: snapped,
        };
      }
    }),

  focusWindow: (id) =>
    set((state) => ({
      activeWindow: id,
      // Keep the array's identity when nothing is removed. `.filter` always allocates, and a new
      // `minimizedWindows` on every click re-rendered App, Taskbar and MenuBar for no change.
      minimizedWindows: state.minimizedWindows.includes(id)
        ? state.minimizedWindows.filter((w) => w !== id)
        : state.minimizedWindows,
      isControlCenterOpen: false,
      isAppLauncherOpen: false
    })),

  toggleControlCenter: () =>
    set((state) => ({
      isControlCenterOpen: !state.isControlCenterOpen,
      isAppLauncherOpen: false,
    })),

  toggleAppLauncher: () =>
    set((state) => ({
      isAppLauncherOpen: !state.isAppLauncherOpen,
      isControlCenterOpen: false,
    })),
});
