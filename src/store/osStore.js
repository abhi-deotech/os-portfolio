import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createAuthSlice } from './slices/authSlice';
import { createFileSystemSlice } from './slices/fileSystemSlice';
import { createMusicSlice } from './slices/musicSlice';
import { createSystemSlice } from './slices/systemSlice';
import { createWindowSlice } from './slices/windowSlice';
import { createSyncSlice } from './slices/syncSlice';
import { createContainerSlice } from './slices/containerSlice';
import { createAiSlice } from './slices/aiSlice';

/**
 * Zustand store for Lumina OS state management.
 * Provides centralized state for windows, file system, preferences, and more.
 * Uses modular slices to keep the codebase maintainable.
 */
const useOSStore = create(
  persist(
    (set, get) => ({
      ...createAuthSlice(set, get),
      ...createFileSystemSlice(set, get),
      ...createMusicSlice(set, get),
      ...createSystemSlice(set, get),
      ...createWindowSlice(set, get),
      ...createSyncSlice(set, get),
      ...createContainerSlice(set, get),
      ...createAiSlice(set, get),
    }),
    {
      name: 'os-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeAccent: state.activeAccent,
        wallpaper: state.wallpaper,
        transparencyEffects: state.transparencyEffects,
        brightness: state.brightness,
        accentIntensity: state.accentIntensity,
        terminalHistory: state.terminalHistory,
        openWindows: state.openWindows,
        minimizedWindows: state.minimizedWindows,
        maximizedWindows: state.maximizedWindows,
        activeWindow: state.activeWindow,
        iconPositions: state.iconPositions,
        fileSystem: state.fileSystem,
        widgets: state.widgets,
        notes: state.notes,
        music: state.music,
        isAuthenticated: state.isAuthenticated,
        userRole: state.userRole,
        activeNotepadFile: state.activeNotepadFile,
        activeDocFile: state.activeDocFile,
        activeMediaFile: state.activeMediaFile,
        activePhotoFile: state.activePhotoFile,
        activeMusicFile: state.activeMusicFile,
        recentFiles: state.recentFiles,
        terminalTheme: state.terminalTheme,
        installedApps: state.installedApps,
        achievements: state.achievements,
        systemMetrics: state.systemMetrics,
        lastSyncTime: state.lastSyncTime,
        syncError: state.syncError,
        achievementQueue: [] // Don't persist queue
      }),
    }
  )
);

export default useOSStore;
