export const createAuthSlice = (set) => ({
  isAuthenticated: false,
  userRole: 'admin', // 'admin' | 'guest'
  
  login: (role = 'admin') => set({ isAuthenticated: true, userRole: role }),
  
  logout: () => set({ 
    isAuthenticated: false, 
    openWindows: [], 
    activeWindow: null, 
    isControlCenterOpen: false, 
    isAppLauncherOpen: false, 
    isSpotlightOpen: false, 
    isDragging: false,
    achievementQueue: [],
    userRole: 'admin' 
  }),
});
