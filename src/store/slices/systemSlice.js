export const createSystemSlice = (set) => ({
  activeAccent: 'purple',
  wallpaper: 'sunset-glow',
  transparencyEffects: true,
  brightness: 100,
  accentIntensity: 80,
  isDragging: false,
  isBSOD: false,
  achievements: [],
  achievementQueue: [],
  terminalTheme: 'default',
  terminalHistory: [
    { type: 'input', text: 'neofetch' },
    { type: 'output', text: 'OS: Lumina Desktop v1.0.0\nKernel: 6.8.0-lumina-os\nUptime: 3 years, 2 months\nPackages: 1337 (npm)\nShell: zsh 5.9\nResolution: 2560x1440\nDE: Lumina\nWM: Framer-Motion\nTerminal: Lumina-Term\nCPU: M3 Max (8) @ 4.06GHz\nMemory: 64GB' }
  ],
  terminalCommandCount: 0,

  // Desktop Icons
  iconPositions: {},
  setIconPosition: (id, pos) => set((state) => ({
    iconPositions: { ...state.iconPositions, [id]: pos }
  })),
  resetIconPositions: () => set({ iconPositions: {} }),

  // Desktop Widgets
  widgets: {
    weather: true,
    system: true,
    notes: true
  },
  toggleWidget: (name) => set((state) => ({
    widgets: { ...state.widgets, [name]: !state.widgets[name] }
  })),

  // System Metrics
  systemMetrics: {
    cpu: 12,
    ram: 4.2,
    temp: 42,
    power: 15,
    isOverridden: false
  },
  updateMetrics: (newMetrics) => set((state) => ({
    systemMetrics: { ...state.systemMetrics, ...newMetrics }
  })),

  // Sticky Notes
  notes: 'Welcome to Lumina OS!\n- Explore the apps\n- Check the terminal\n- Have fun!',
  setNotes: (content) => set({ notes: content }),

  setActiveAccent: (accent) => set({ activeAccent: accent }),
  setWallpaper: (wp) => set({ wallpaper: wp }),
  setTransparencyEffects: (enabled) => set({ transparencyEffects: enabled }),
  setBrightness: (value) => set({ brightness: value }),
  setAccentIntensity: (value) => set({ accentIntensity: value }),
  setLowPerformance: (enabled) => set({ lowPerformance: enabled }),

  resetSettingsToDefault: () => set({
    wallpaper: 'sunset-glow',
    activeAccent: 'purple',
    transparencyEffects: true,
    brightness: 100,
    accentIntensity: 80,
  }),

  triggerBSOD: () => set({ isBSOD: true }),

  addTerminalEntry: (entry) =>
    set((state) => {
      const newHistory = [...state.terminalHistory, entry];
      // Cap terminal history at 500 entries to prevent localStorage bloat
      return {
        terminalHistory: newHistory.slice(-500),
      };
    }),

  setTerminalTheme: (theme) => set({ terminalTheme: theme }),
  incrementCommandCount: () => set((state) => ({ terminalCommandCount: state.terminalCommandCount + 1 })),
  clearTerminalHistory: () => set({ terminalHistory: [] }),

  unlockAchievement: (achievementId) =>
    set((state) => {
      if (state.achievements.includes(achievementId)) return state;
      return { 
        achievements: [...state.achievements, achievementId],
        achievementQueue: [...state.achievementQueue, achievementId]
      };
    }),

  removeAchievementToast: (achievementId) =>
    set((state) => ({
      achievementQueue: state.achievementQueue.filter(id => id !== achievementId)
    })),

  setIsDragging: (isDragging) => set({ isDragging }),
});
