import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const DEFAULT_FILE_SYSTEM = [
  {
    id: 'root-projects',
    name: 'Projects',
    children: [
      { id: 'file-os-info', name: 'System.md' },
      { id: 'file-mern', name: 'MERN-Dashboard.md' },
      { id: 'file-iot', name: 'IoT-Controller.md' },
    ]
  },
  {
    id: 'root-docs',
    name: 'Documents',
    children: [
      { id: 'file-resume', name: 'Resume.pdf' },
      { id: 'file-cover', name: 'CoverLetter.docx' },
    ]
  },
  {
    id: 'root-media',
    name: 'Media',
    children: []
  },
];

const useOSStore = create(
  persist(
    (set) => ({
      openWindows: [],
      activeWindow: null,
      isControlCenterOpen: false,
      isAppLauncherOpen: false,
      activeAccent: 'purple',
      wallpaper: 'neon-nebula',
      isDragging: false,
      terminalHistory: [
        { type: 'input', text: 'neofetch' },
        { type: 'output', text: 'OS: Lumina Desktop v1.0.0\nKernel: 6.8.0-lumina-os\nUptime: 3 years, 2 months\nPackages: 1337 (npm)\nShell: zsh 5.9\nResolution: 2560x1440\nDE: Lumina\nWM: Framer-Motion\nTerminal: Lumina-Term\nCPU: M3 Max (8) @ 4.06GHz\nMemory: 64GB' }
      ],

      // Icon positions: { [iconId]: { x, y } }
      iconPositions: {},
      setIconPosition: (id, position) =>
        set((state) => ({
          iconPositions: { ...state.iconPositions, [id]: position },
        })),
      resetIconPositions: () => set({ iconPositions: {} }),

      // Virtual file system
      fileSystem: DEFAULT_FILE_SYSTEM,
      setFileSystem: (tree) => set({ fileSystem: tree }),
      createFolder: (name) =>
        set((state) => ({
          fileSystem: [
            ...state.fileSystem,
            { id: `folder-${Date.now()}`, name, children: [] },
          ],
        })),
      deleteNode: (id) =>
        set((state) => {
          const removeNode = (nodes) =>
            nodes
              .filter((n) => n.id !== id)
              .map((n) => ({
                ...n,
                children: n.children ? removeNode(n.children) : undefined,
              }));
          return { fileSystem: removeNode(state.fileSystem) };
        }),
      renameNode: (id, newName) =>
        set((state) => {
          const renameInTree = (nodes) =>
            nodes.map((n) => {
              if (n.id === id) return { ...n, name: newName };
              if (n.children) return { ...n, children: renameInTree(n.children) };
              return n;
            });
          return { fileSystem: renameInTree(state.fileSystem) };
        }),

      openWindow: (id) =>
        set((state) => {
          if (state.openWindows.includes(id)) {
            return { activeWindow: id, isControlCenterOpen: false, isAppLauncherOpen: false };
          }
          return {
            openWindows: [...state.openWindows, id],
            activeWindow: id,
            isControlCenterOpen: false,
            isAppLauncherOpen: false,
          };
        }),

      closeWindow: (id) =>
        set((state) => ({
          openWindows: state.openWindows.filter((w) => w !== id),
          activeWindow: state.activeWindow === id ? null : state.activeWindow,
        })),

      focusWindow: (id) =>
        set({ activeWindow: id, isControlCenterOpen: false, isAppLauncherOpen: false }),

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

      setActiveAccent: (accent) => set({ activeAccent: accent }),
      setWallpaper: (wp) => set({ wallpaper: wp }),

      addTerminalEntry: (entry) =>
        set((state) => ({
          terminalHistory: [...state.terminalHistory, entry],
        })),

      setIsDragging: (isDragging) => set({ isDragging }),
    }),
    {
      name: 'os-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeAccent: state.activeAccent,
        wallpaper: state.wallpaper,
        terminalHistory: state.terminalHistory,
        openWindows: state.openWindows,
        activeWindow: state.activeWindow,
        iconPositions: state.iconPositions,
        fileSystem: state.fileSystem,
      }),
    }
  )
);

export default useOSStore;
