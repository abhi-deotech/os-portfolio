export const createWindowSlice = (set) => ({
  openWindows: [],
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

  openWindow: (id, fileId = null) =>
    set((state) => {
      const windows = state.openWindows.includes(id)
        ? state.openWindows
        : [...state.openWindows, id];
      
      const newState = {
        openWindows: windows,
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
        state.trackRecentFile(fileId);
      }

      return newState;
    }),

  openNotepad: (fileId) =>
    set((state) => {
      const windows = state.openWindows.includes('notepad')
        ? state.openWindows
        : [...state.openWindows, 'notepad'];
      return {
        openWindows: windows,
        activeWindow: 'notepad',
        activeNotepadFile: fileId,
        isAppLauncherOpen: false,
        isControlCenterOpen: false,
      };
    }),

  closeWindow: (id) =>
    set((state) => {
      const snapped = { ...(state.snappedWindows || {}) };
      delete snapped[id];
      return {
        openWindows: state.openWindows.filter((w) => w !== id),
        minimizedWindows: (state.minimizedWindows || []).filter((w) => w !== id),
        snappedWindows: snapped,
        activeWindow: state.activeWindow === id ? null : state.activeWindow,
      };
    }),

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
      minimizedWindows: (state.minimizedWindows || []).filter((w) => w !== id),
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
